/**
 * app/api/editor/pages/route.ts
 *
 * Páginas de un capítulo. En producción (GitHub) delega en lib/editorPages; en dev usa el disco.
 * POST { action: "upload", chapterId, fileName, data(base64) } → agrega la página al final.
 * POST { action: "apply", chapterId, orderedKeys, deletedKeys } → renumera 1..N y remapea diálogos.
 * PATCH { chapterId, oldName, newName } → renombra un archivo (solo dev).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDynamicSagas, parsePrefix, getAssetsComicsDir } from "@/lib/serverData";
import { validateEditorApiAccess } from "@/lib/editorAccess";
import { useGithubEditorStorage } from "@/lib/editorStorage";
import { applyChapterPageLayout, uploadChapterPage } from "@/lib/editorPages";
import { formatGithubApiAuthError } from "@/lib/githubEditor";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ASSETS_COMICS_DIR = getAssetsComicsDir();

function findChapterDir(chapterId: string): { sagaDir: string; chapterDir: string } | null {
  const comicsDir = path.join(process.cwd(), "public", "comics");
  if (!fs.existsSync(comicsDir)) return null;

  const sagaDirs = fs.readdirSync(comicsDir).filter((f) =>
    fs.statSync(path.join(comicsDir, f)).isDirectory()
  );

  for (const sagaDir of sagaDirs) {
    const sagaPath = path.join(comicsDir, sagaDir);
    const chDirs = fs.readdirSync(sagaPath).filter((f) =>
      fs.statSync(path.join(sagaPath, f)).isDirectory()
    );
    for (const chDir of chDirs) {
      const { cleanName } = parsePrefix(chDir);
      if (cleanName === chapterId) {
        return { sagaDir, chapterDir: chDir };
      }
    }
  }
  return null;
}

export async function PATCH(request: NextRequest) {
  if (!validateEditorApiAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { chapterId, oldName, newName } = body as {
    chapterId: string;
    oldName: string;
    newName: string;
  };

  if (!chapterId || !oldName || !newName) {
    return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
  }
  if (useGithubEditorStorage()) {
    return NextResponse.json(
      { error: "En producción usá el gestor de Páginas (Editor 2.0) para renombrar y ordenar." },
      { status: 400 }
    );
  }

  const found = findChapterDir(chapterId);
  if (!found) {
    return NextResponse.json({ error: "Capítulo no encontrado" }, { status: 404 });
  }

  const comicsDir = path.join(process.cwd(), "public", "comics");
  const chapterPath = path.join(comicsDir, found.sagaDir, found.chapterDir);
  const adjacentChapterPath = path.join(ASSETS_COMICS_DIR, found.sagaDir, found.chapterDir);

  const files = fs.readdirSync(chapterPath);
  const oldFile = files.find((f) => f.slice(0, f.lastIndexOf(".")) === oldName);

  if (!oldFile) {
    return NextResponse.json({ error: `Archivo "${oldName}" no encontrado` }, { status: 404 });
  }

  const ext = oldFile.slice(oldFile.lastIndexOf("."));
  const newFileName = newName + ext;

  if (files.includes(newFileName)) {
    return NextResponse.json({ error: `Ya existe un archivo con el nombre "${newFileName}"` }, { status: 409 });
  }

  try {
    fs.renameSync(
      path.join(chapterPath, oldFile),
      path.join(chapterPath, newFileName)
    );

    if (fs.existsSync(adjacentChapterPath)) {
      const adjacentOldFile = path.join(adjacentChapterPath, oldFile);
      if (fs.existsSync(adjacentOldFile)) {
        fs.renameSync(
          adjacentOldFile,
          path.join(adjacentChapterPath, newFileName)
        );
      }
    }

    return NextResponse.json({ success: true, newFileName });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const IMAGE_EXT = [".webp", ".jpg", ".jpeg", ".png", ".gif"];

function listPageFiles(chapterPath: string) {
  if (!fs.existsSync(chapterPath)) return [];
  return fs
    .readdirSync(chapterPath)
    .filter((f) => {
      const ext = path.extname(f).toLowerCase();
      const base = path.basename(f, ext).toLowerCase();
      return IMAGE_EXT.includes(ext) && base !== "portada" && !base.startsWith("__tmp_");
    })
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
}

function renameInDirs(dirs: string[], fromName: string, toName: string) {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const from = path.join(dir, fromName);
    if (!fs.existsSync(from)) continue;
    fs.renameSync(from, path.join(dir, toName));
  }
}

function deleteInDirs(dirs: string[], fileName: string) {
  for (const dir of dirs) {
    const target = path.join(dir, fileName);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
}

export async function POST(request: NextRequest) {
  if (!validateEditorApiAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const chapterId = String(body.chapterId || "");
  if (!chapterId) return NextResponse.json({ error: "Falta chapterId" }, { status: 400 });

  if (body.action === "upload") {
    const fileName = String(body.fileName || "");
    const data = String(body.data || "");
    if (!fileName || !data) return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });

    if (useGithubEditorStorage()) {
      try {
        const uploaded = await uploadChapterPage({ chapterId, fileName, base64: data });
        return NextResponse.json({ success: true, ...uploaded });
      } catch (err: any) {
        return NextResponse.json({ error: formatGithubApiAuthError(err.message) }, { status: 500 });
      }
    }

    const found = findChapterDir(chapterId);
    if (!found) return NextResponse.json({ error: "Capítulo no encontrado" }, { status: 404 });
    const ext = path.extname(fileName).toLowerCase();
    if (!IMAGE_EXT.includes(ext)) return NextResponse.json({ error: "Formato no soportado" }, { status: 400 });
    const chapterPath = path.join(process.cwd(), "public", "comics", found.sagaDir, found.chapterDir);
    const adjacentChapterPath = path.join(ASSETS_COMICS_DIR, found.sagaDir, found.chapterDir);
    const maxNumber = listPageFiles(chapterPath).reduce((max, f) => {
      const n = Number.parseInt(path.basename(f, path.extname(f)), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const destName = `${maxNumber + 1}${ext}`;
    const buf = Buffer.from(data, "base64");
    fs.writeFileSync(path.join(chapterPath, destName), buf);
    if (fs.existsSync(adjacentChapterPath)) fs.writeFileSync(path.join(adjacentChapterPath, destName), buf);
    return NextResponse.json({ success: true, key: String(maxNumber + 1), fileName: destName });
  }

  if (body.action !== "apply") {
    return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
  }

  const orderedKeys: string[] = Array.isArray(body.orderedKeys) ? body.orderedKeys.map(String) : [];
  const deletedKeys: string[] = Array.isArray(body.deletedKeys) ? body.deletedKeys.map(String) : [];
  if (orderedKeys.length === 0 && deletedKeys.length === 0) {
    return NextResponse.json({ error: "Faltan orderedKeys" }, { status: 400 });
  }

  if (useGithubEditorStorage()) {
    try {
      const result = await applyChapterPageLayout({ chapterId, orderedKeys, deletedKeys });
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      return NextResponse.json({ error: formatGithubApiAuthError(err.message) }, { status: 500 });
    }
  }

  const found = findChapterDir(chapterId);
  if (!found) return NextResponse.json({ error: "Capítulo no encontrado" }, { status: 404 });

  const comicsDir = path.join(process.cwd(), "public", "comics");
  const chapterPath = path.join(comicsDir, found.sagaDir, found.chapterDir);
  const adjacentChapterPath = path.join(ASSETS_COMICS_DIR, found.sagaDir, found.chapterDir);
  const dirs = [chapterPath, adjacentChapterPath];
  const files = listPageFiles(chapterPath);
  const fileByKey = new Map(files.map((f) => [path.basename(f, path.extname(f)), f]));

  const { remapDialogues, remapDialogueContext } = await import("@/lib/pageRemap");
  const pageMap: Record<string, string | null> = {};
  for (const key of deletedKeys) pageMap[key] = null;
  orderedKeys.forEach((key, i) => {
    pageMap[key] = String(i + 1);
  });

  try {
    for (const key of deletedKeys) {
      const fileName = fileByKey.get(key);
      if (fileName) deleteInDirs(dirs, fileName);
    }

    const token = Date.now();
    const staged: Array<{ tmp: string; final: string }> = [];
    orderedKeys.forEach((key, i) => {
      const fileName = fileByKey.get(key);
      if (!fileName) return;
      const ext = path.extname(fileName);
      const tmp = `__tmp_${token}_${i}${ext}`;
      const finalName = `${i + 1}${ext}`;
      renameInDirs(dirs, fileName, tmp);
      staged.push({ tmp, final: finalName });
    });
    for (const step of staged) {
      renameInDirs(dirs, step.tmp, step.final);
    }

    const dialoguesPath = path.join(chapterPath, "dialogues.json");
    if (fs.existsSync(dialoguesPath)) {
      const dialogues = JSON.parse(fs.readFileSync(dialoguesPath, "utf-8"));
      const remapped = remapDialogues(dialogues, pageMap);
      const { formatDialoguesJson } = await import("@/lib/formatDialoguesJson");
      fs.writeFileSync(dialoguesPath, `${formatDialoguesJson(remapped)}\n`, "utf-8");
    }
    const contextPath = path.join(chapterPath, "ai-context.json");
    if (fs.existsSync(contextPath)) {
      const ctx = JSON.parse(fs.readFileSync(contextPath, "utf-8"));
      fs.writeFileSync(contextPath, `${JSON.stringify(remapDialogueContext(ctx, pageMap), null, 2)}\n`, "utf-8");
    }

    return NextResponse.json({ success: true, pageMap });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
