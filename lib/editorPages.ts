/**
 * Gestión de páginas de un capítulo vía GitHub (producción).
 *
 * Imágenes reales: repo de assets → comics/<saga>/<capítulo>/<n>.<ext>
 * Marcadores 0 bytes + dialogues.json + ai-context.json: repo de la app → public/comics/...
 * Todo va a `editor-workspace` de cada repo; Publicar lo lleva a main.
 */

import { formatDialoguesJson } from "@/lib/formatDialoguesJson";
import { remapDialogueContext, remapDialogues, type PageMap } from "@/lib/pageRemap";
import {
  contextRepoPath,
  dialoguesRepoPath,
  loadEditorTextFile,
  resolveChapterFolders,
} from "@/lib/editorStorage";
import {
  GITHUB_ASSETS_REPO,
  GITHUB_MAIN_REPO,
  commitTreeChanges,
  createBlob,
  ensureEditorBranch,
  listDirectory,
  type TreeChange,
} from "@/lib/githubEditor";

export const PAGE_IMAGE_EXT = [".webp", ".jpg", ".jpeg", ".png", ".gif"];
const MAX_UPLOAD_BYTES = 3_200_000;

type RepoPage = { key: string; name: string; ext: string; sha: string };

function splitName(name: string) {
  const dot = name.lastIndexOf(".");
  return dot > 0 ? { base: name.slice(0, dot), ext: name.slice(dot).toLowerCase() } : { base: name, ext: "" };
}

function isPageImage(name: string) {
  const { base, ext } = splitName(name);
  return PAGE_IMAGE_EXT.includes(ext) && base.toLowerCase() !== "portada" && !base.startsWith("__tmp_");
}

function byPageNumber(a: RepoPage, b: RepoPage) {
  return a.key.localeCompare(b.key, undefined, { numeric: true, sensitivity: "base" });
}

async function listPages(repo: string, dirPath: string): Promise<RepoPage[]> {
  const items = (await listDirectory(repo, dirPath)) || [];
  return items
    .filter((i) => i.type === "file" && isPageImage(i.name))
    .map((i) => {
      const { base, ext } = splitName(i.name);
      return { key: base, name: i.name, ext, sha: i.sha };
    })
    .sort(byPageNumber);
}

async function resolveDirs(chapterId: string) {
  const loc = await resolveChapterFolders(chapterId);
  if (!loc) throw new Error("Capítulo no encontrado");
  await Promise.all([ensureEditorBranch(GITHUB_ASSETS_REPO), ensureEditorBranch(GITHUB_MAIN_REPO)]);
  return {
    ...loc,
    assetsDir: `comics/${loc.sagaFolder}/${loc.chapterFolder}`,
    appDir: `public/comics/${loc.sagaFolder}/${loc.chapterFolder}`,
  };
}

export async function uploadChapterPage(options: {
  chapterId: string;
  fileName: string;
  base64: string;
}): Promise<{ key: string; fileName: string }> {
  const { ext } = splitName(options.fileName);
  if (!PAGE_IMAGE_EXT.includes(ext)) throw new Error("Formato no soportado (webp, jpg, png o gif)");
  const bytes = Math.floor((options.base64.length * 3) / 4);
  if (bytes > MAX_UPLOAD_BYTES) throw new Error("La imagen supera 3 MB; comprimila antes de subirla");

  const dirs = await resolveDirs(options.chapterId);
  const pages = await listPages(GITHUB_ASSETS_REPO, dirs.assetsDir);
  const maxNumber = pages.reduce((max, p) => {
    const n = Number.parseInt(p.key, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  const key = String(maxNumber + 1);
  const fileName = `${key}${ext}`;

  const blobSha = await createBlob(GITHUB_ASSETS_REPO, options.base64);
  await commitTreeChanges({
    repo: GITHUB_ASSETS_REPO,
    changes: [{ path: `${dirs.assetsDir}/${fileName}`, sha: blobSha }],
    message: `editor: add page ${key} to ${options.chapterId}`,
  });
  await commitTreeChanges({
    repo: GITHUB_MAIN_REPO,
    changes: [{ path: `${dirs.appDir}/${fileName}`, content: "" }],
    message: `editor: add page placeholder ${key} to ${options.chapterId}`,
  });
  return { key, fileName };
}

/**
 * Renumera las páginas según `orderedKeys` (1..N) y borra `deletedKeys`.
 * Remapea diálogos, stops, máscaras, audio y ai-context para que sigan a su imagen.
 */
export async function applyChapterPageLayout(options: {
  chapterId: string;
  orderedKeys: string[];
  deletedKeys: string[];
}): Promise<{ pageMap: PageMap; changed: boolean }> {
  const dirs = await resolveDirs(options.chapterId);
  const pages = await listPages(GITHUB_ASSETS_REPO, dirs.assetsDir);
  const byKey = new Map(pages.map((p) => [p.key, p]));

  const requested = [...options.orderedKeys, ...options.deletedKeys];
  const unknown = requested.filter((k) => !byKey.has(k));
  const missing = pages.filter((p) => !requested.includes(p.key));
  if (unknown.length || missing.length || new Set(requested).size !== requested.length) {
    throw new Error("La lista de páginas cambió en GitHub. Cerrá el gestor, recargá y volvé a intentar.");
  }

  const pageMap: PageMap = {};
  options.deletedKeys.forEach((k) => (pageMap[k] = null));
  const finalNames = new Map<string, RepoPage>();
  options.orderedKeys.forEach((k, i) => {
    const page = byKey.get(k)!;
    pageMap[k] = String(i + 1);
    finalNames.set(`${i + 1}${page.ext}`, page);
  });

  const currentByName = new Map(pages.map((p) => [p.name, p]));
  const assetChanges: TreeChange[] = [];
  for (const [name, page] of finalNames) {
    if (currentByName.get(name)?.sha !== page.sha) assetChanges.push({ path: `${dirs.assetsDir}/${name}`, sha: page.sha });
  }
  for (const page of pages) {
    if (!finalNames.has(page.name)) assetChanges.push({ path: `${dirs.assetsDir}/${page.name}`, sha: null });
  }
  if (assetChanges.length === 0) return { pageMap, changed: false };

  const appPlaceholders = await listPages(GITHUB_MAIN_REPO, dirs.appDir);
  const appChanges: TreeChange[] = [];
  const placeholderNames = new Set(appPlaceholders.map((p) => p.name));
  for (const name of finalNames.keys()) {
    if (!placeholderNames.has(name)) appChanges.push({ path: `${dirs.appDir}/${name}`, content: "" });
  }
  for (const p of appPlaceholders) {
    if (!finalNames.has(p.name)) appChanges.push({ path: `${dirs.appDir}/${p.name}`, sha: null });
  }

  const dialoguesPath = dialoguesRepoPath(dirs.sagaFolder, dirs.chapterFolder);
  const dialogues = await loadEditorTextFile(dialoguesPath);
  if (dialogues.content.trim()) {
    const remapped = remapDialogues(JSON.parse(dialogues.content), pageMap);
    appChanges.push({ path: dialoguesPath, content: `${formatDialoguesJson(remapped)}\n` });
  }
  const contextPath = contextRepoPath(dirs.sagaFolder, dirs.chapterFolder);
  const context = await loadEditorTextFile(contextPath);
  if (context.content.trim()) {
    const remapped = remapDialogueContext(JSON.parse(context.content), pageMap);
    appChanges.push({ path: contextPath, content: `${JSON.stringify(remapped, null, 2)}\n` });
  }

  const summary = `${options.orderedKeys.length} páginas, ${options.deletedKeys.length} eliminadas`;
  await commitTreeChanges({
    repo: GITHUB_ASSETS_REPO,
    changes: assetChanges,
    message: `editor: reorder pages of ${options.chapterId} (${summary})`,
  });
  await commitTreeChanges({
    repo: GITHUB_MAIN_REPO,
    changes: appChanges,
    message: `editor: remap pages of ${options.chapterId} (${summary})`,
  });
  return { pageMap, changed: true };
}
