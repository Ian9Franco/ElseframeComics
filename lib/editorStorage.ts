import fs from "fs";
import path from "path";
import { findLocalChapter } from "@/lib/chapterFiles";
import { getDynamicSagas } from "@/lib/serverData";
import { fetchChapterFolders, fetchSagaFolders, resolveFolderName } from "@/lib/githubComics";
import {
  GITHUB_ASSETS_REPO,
  GITHUB_EDITOR_BRANCH,
  GITHUB_MAIN_REPO,
  GithubConflictError,
  ensureEditorBranch,
  getEditorToken,
  getFile,
  putFile,
} from "@/lib/githubEditor";

export function useGithubEditorStorage(): boolean {
  if (!getEditorToken()) return false;
  if (process.env.EDITOR_STORAGE === "local") return false;
  if (process.env.EDITOR_STORAGE === "github") return true;
  return process.env.NODE_ENV !== "development";
}

export function dialoguesRepoPath(sagaFolder: string, chapterFolder: string) {
  return `public/comics/${sagaFolder}/${chapterFolder}/dialogues.json`;
}

export function contextRepoPath(sagaFolder: string, chapterFolder: string) {
  return `public/comics/${sagaFolder}/${chapterFolder}/ai-context.json`;
}

/** Lectura de dialogues.json en la rama `main` (lector público; también dev sin PAT). */
export async function loadMainBranchTextFile(chapterId: string): Promise<string | null> {
  const location = await resolveChapterFolders(chapterId);
  if (!location) return null;
  const repoPath = dialoguesRepoPath(location.sagaFolder, location.chapterFolder);

  try {
    const main = await getFile(GITHUB_MAIN_REPO, repoPath, "main");
    return main?.content ?? null;
  } catch (error) {
    console.error("[editorStorage] loadMainBranchTextFile failed:", error);
    return null;
  }
}

export async function loadEditorTextFile(
  relativePath: string,
  _chapterId?: string
): Promise<{
  content: string;
  sha: string | null;
  source: "workspace" | "main" | "filesystem";
}> {
  if (!useGithubEditorStorage()) {
    const full = path.join(process.cwd(), relativePath);
    if (fs.existsSync(full)) {
      return { content: fs.readFileSync(full, "utf-8"), sha: null, source: "filesystem" };
    }
    return { content: "", sha: null, source: "filesystem" };
  }

  await ensureEditorBranch(GITHUB_MAIN_REPO);
  const workspace = await getFile(GITHUB_MAIN_REPO, relativePath, GITHUB_EDITOR_BRANCH);
  if (workspace) return { content: workspace.content, sha: workspace.sha, source: "workspace" };

  const main = await getFile(GITHUB_MAIN_REPO, relativePath, "main");
  if (main) return { content: main.content, sha: null, source: "main" };

  return { content: "", sha: null, source: "workspace" };
}

const DIALOGUES_BACKUP_KEEP = 300;

function dialoguesBackupDir(absoluteDialoguesPath: string) {
  return path.join(path.dirname(absoluteDialoguesPath), ".dialogues-backups");
}

function pruneDialoguesBackups(dir: string) {
  const copies = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("dialogues-") && name.endsWith(".json"))
    .sort();
  while (copies.length > DIALOGUES_BACKUP_KEEP) {
    const oldest = copies.shift();
    if (oldest) fs.unlinkSync(path.join(dir, oldest));
  }
}

/** Copia el dialogues.json actual antes de pisarlo. */
export function backupDialoguesFile(absolutePath: string) {
  const normalized = absolutePath.replace(/\\/g, "/");
  if (!normalized.endsWith("/dialogues.json")) return;
  if (!fs.existsSync(absolutePath)) return;
  snapshotDialoguesContent(absolutePath, fs.readFileSync(absolutePath, "utf-8"));
}

/** Guarda el contenido actual en .dialogues-backups. No toca dialogues.json. */
export function snapshotDialoguesContent(absoluteDialoguesPath: string, content: string) {
  const dir = dialoguesBackupDir(absoluteDialoguesPath);
  fs.mkdirSync(dir, { recursive: true });
  const copies = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("dialogues-") && name.endsWith(".json"))
    .sort();
  const latest = copies[copies.length - 1];
  if (latest && fs.readFileSync(path.join(dir, latest), "utf-8") === content) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(dir, `dialogues-${stamp}.json`), content, "utf-8");
  pruneDialoguesBackups(dir);
}

export async function saveEditorTextFile(options: {
  relativePath: string;
  content: string;
  sha?: string | null;
  message: string;
}): Promise<{ sha: string | null }> {
  if (!useGithubEditorStorage()) {
    const full = path.join(process.cwd(), options.relativePath);
    backupDialoguesFile(full);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, options.content, "utf-8");
    return { sha: null };
  }

  backupDialoguesFile(path.join(process.cwd(), options.relativePath));

  await ensureEditorBranch(GITHUB_MAIN_REPO);
  try {
    const result = await putFile({
      repo: GITHUB_MAIN_REPO,
      filePath: options.relativePath,
      content: options.content,
      message: options.message,
      sha: options.sha,
    });
    return { sha: result.sha };
  } catch (error) {
    if (error instanceof GithubConflictError) throw error;
    throw error;
  }
}

export async function resolveChapterFolders(chapterId: string): Promise<{
  sagaFolder: string;
  chapterFolder: string;
  chapterPath: string;
} | null> {
  const local = findLocalChapter(chapterId);
  if (local) {
    return {
      sagaFolder: local.sagaFolder,
      chapterFolder: local.chapterFolder,
      chapterPath: local.chapterPath,
    };
  }

  const sagas = getDynamicSagas();
  let foundSaga: { id: string } | null = null;
  let foundChapter: { id: string } | null = null;
  for (const saga of sagas) {
    const ch = saga.chapters.find((c) => c.id === chapterId);
    if (ch) {
      foundSaga = saga;
      foundChapter = ch;
      break;
    }
  }
  if (!foundSaga || !foundChapter) return null;

  try {
    const sagaFolders = await fetchSagaFolders();
    const sagaFolder = resolveFolderName(sagaFolders, foundSaga.id) ?? foundSaga.id;
    const chapterFolders = await fetchChapterFolders(sagaFolder);
    const chapterFolder = resolveFolderName(chapterFolders, foundChapter.id) ?? foundChapter.id;
    return {
      sagaFolder,
      chapterFolder,
      chapterPath: path.join(process.cwd(), "public", "comics", sagaFolder, chapterFolder),
    };
  } catch (error) {
    console.error("[editorStorage] resolveChapterFolders GitHub fallback failed:", error);
    return null;
  }
}

export { GithubConflictError, GITHUB_ASSETS_REPO };
