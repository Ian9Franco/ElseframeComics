/**
 * app/api/editor/pages/route.ts
 *
 * API para renombrar archivos de imagen dentro de la carpeta de un capítulo.
 * PATCH → { chapterId, oldName, newName }  → renombra el archivo manteniendo extensión.
 */

import { NextRequest, NextResponse } from "next/server";
import { parsePrefix, getAssetsComicsDir } from "@/lib/serverData";
import { validateMasterEditorAccess as validateAccess } from "@/lib/masterPassword";
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
  if (!validateAccess(request)) {
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
