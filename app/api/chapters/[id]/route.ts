/**
 * app/api/chapters/[id]/route.ts
 *
 * API route que devuelve metadata y páginas de un capítulo.
 * En producción, las páginas se obtienen via GitHub API (githubComics.ts)
 * para no depender del filesystem de Vercel.
 *
 * Los dialogues.json SÍ se leen desde el filesystem local porque
 * viven en el repo principal (the-boys), no en el de imágenes.
 */

import { NextRequest, NextResponse } from "next/server";
import { getDynamicSagas, parsePrefix, validatePreviewAccess } from "@/lib/serverData";
import {
  fetchSagaFolders,
  fetchChapterFolders,
  fetchComicPages,
  resolveFolderName,
} from "@/lib/githubComics";
import { validateEditorAccess } from "@/lib/editorAccess";
import { dialoguesRepoPath, loadEditorTextFile, resolveChapterFolders } from "@/lib/editorStorage";
import { GITHUB_EDITOR_BRANCH } from "@/lib/githubEditor";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const editorSource = request.nextUrl.searchParams.get("source") === "editor";
  if (editorSource && !validateEditorAccess(request, id)) {
    return NextResponse.json({ error: "Unauthorized: Invalid editor password" }, { status: 401 });
  }

  // ── 1. Buscar el capítulo en la estructura de sagas ──────────────────────
  const sagas = getDynamicSagas();

  let foundSaga: any = null;
  let foundChapter: any = null;
  let chapterIndex = -1;

  for (const saga of sagas) {
    const idx = saga.chapters.findIndex((c) => c.id === id);
    if (idx !== -1) {
      foundSaga = saga;
      foundChapter = saga.chapters[idx];
      chapterIndex = idx;
      break;
    }
  }

  if (!foundSaga || !foundChapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  // ── 2. Verificar acceso a borradores ────────────────────────────────────
  const isDraft = foundSaga.draft || foundChapter.draft;
  if (isDraft) {
    const hasAccess = validatePreviewAccess(request, foundSaga.id);
    if (!hasAccess) {
      return NextResponse.json({
        locked: true,
        reason: "draft",
        title: foundChapter.title,
      });
    }
  }

  // ── 3. Obtener páginas ──────────────────────────────────────────────────
  let pages: string[] = [];
  let cover: string | null = null;

  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    try {
      const comicsDir = path.join(process.cwd(), "public", "comics");
      const sagaFolders = fs.readdirSync(comicsDir);
      const actualSagaFolder = sagaFolders.find((f) => {
        const { cleanName } = parsePrefix(f);
        return cleanName === foundSaga.id;
      }) ?? foundSaga.id;

      const sagaPath = path.join(comicsDir, actualSagaFolder);
      const chFolders = fs.existsSync(sagaPath) ? fs.readdirSync(sagaPath) : [];
      const actualChFolder = chFolders.find((f) => {
        const { cleanName } = parsePrefix(f);
        return cleanName === foundChapter.id;
      }) ?? foundChapter.id;

      const chapterPath = path.join(comicsDir, actualSagaFolder, actualChFolder);
      if (fs.existsSync(chapterPath)) {
        const files = fs.readdirSync(chapterPath);
        const imageFiles = files.filter(f => {
          const ext = path.extname(f).toLowerCase();
          return [".webp", ".jpg", ".jpeg", ".png", ".gif"].includes(ext) && path.basename(f, ext).toLowerCase() !== "portada";
        });

        // Ordenar numéricamente por nombre de archivo
        imageFiles.sort((a, b) => {
          const nameA = a.slice(0, a.lastIndexOf("."));
          const nameB = b.slice(0, b.lastIndexOf("."));
          return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: "base" });
        });

        // Construir URLs de asset relativas o absolutas
        const baseUrl = (process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "").replace(/\/$/, "");
        pages = imageFiles.map(f => {
          const relPath = `/comics/${actualSagaFolder}/${actualChFolder}/${f}`;
          return baseUrl ? `${baseUrl}${relPath.split("/").map(encodeURIComponent).join("/")}` : relPath;
        });

        const coverFile = files.find(f => {
          const ext = path.extname(f).toLowerCase();
          return [".webp", ".jpg", ".jpeg", ".png", ".gif"].includes(ext) && path.basename(f, ext).toLowerCase() === "portada";
        });

        if (coverFile) {
          const relPath = `/comics/${actualSagaFolder}/${actualChFolder}/${coverFile}`;
          cover = baseUrl ? `${baseUrl}${relPath.split("/").map(encodeURIComponent).join("/")}` : relPath;
        } else if (pages.length > 0) {
          cover = pages[0];
        }
      }
    } catch (err) {
      console.error("Error cargando páginas locales en desarrollo:", err);
    }
  }

  // Fallback a la GitHub API (producción o si falla la lectura local)
  if (pages.length === 0) {
    try {
      const sagaFolders    = await fetchSagaFolders();
      const sagaFolderName = resolveFolderName(sagaFolders, foundSaga.id) ?? foundSaga.id;

      const chapterFolders    = await fetchChapterFolders(sagaFolderName);
      const chapterFolderName = resolveFolderName(chapterFolders, foundChapter.id) ?? foundChapter.id;

      const githubRes = await fetchComicPages(
        sagaFolderName,
        chapterFolderName,
        editorSource ? GITHUB_EDITOR_BRANCH : "main"
      );
      pages = githubRes.pages;
      cover = githubRes.cover;
    } catch (err) {
      console.error("Error al obtener páginas desde GitHub:", err);
    }
  }

  // ── 4. Leer dialogues.json ────────────────────────────────────────────────
  let dialoguesSha: string | null = null;
  const dialogues = await (async () => {
    try {
      const location = await resolveChapterFolders(foundChapter.id);
      if (editorSource && location) {
        const loaded = await loadEditorTextFile(
          dialoguesRepoPath(location.sagaFolder, location.chapterFolder)
        );
        dialoguesSha = loaded.sha;
        if (!loaded.content.trim()) return { pages: {} };
        return JSON.parse(loaded.content);
      }

      const comicsDir  = path.join(process.cwd(), "public", "comics");
      const sagaFolders = fs.readdirSync(comicsDir);
      const actualSagaFolder = sagaFolders.find((f) => {
        const { cleanName } = parsePrefix(f);
        return cleanName === foundSaga.id;
      }) ?? foundSaga.id;

      const sagaPath     = path.join(comicsDir, actualSagaFolder);
      const chFolders    = fs.existsSync(sagaPath) ? fs.readdirSync(sagaPath) : [];
      const actualChFolder = chFolders.find((f) => {
        const { cleanName } = parsePrefix(f);
        return cleanName === foundChapter.id;
      }) ?? foundChapter.id;

      const dialoguesPath = path.join(comicsDir, actualSagaFolder, actualChFolder, "dialogues.json");
      if (fs.existsSync(dialoguesPath)) {
        return JSON.parse(fs.readFileSync(dialoguesPath, "utf-8"));
      } else {
        const defaultDialogues = { pages: {} };
        fs.writeFileSync(dialoguesPath, JSON.stringify(defaultDialogues, null, 2), "utf-8");
        return defaultDialogues;
      }
    } catch (e) {
      console.error("Error reading dialogues.json:", e);
    }
    return null;
  })();

  // ── 5. Navegación entre capítulos ────────────────────────────────────────
  const sagaIndex = sagas.findIndex((s) => s.id === foundSaga.id);

  let prevChapter = null;
  let nextChapter = null;

  if (chapterIndex > 0) {
    prevChapter = foundSaga.chapters[chapterIndex - 1];
  } else if (sagaIndex > 0) {
    const prevSaga = sagas[sagaIndex - 1];
    prevChapter = prevSaga.chapters[prevSaga.chapters.length - 1];
  }

  if (chapterIndex < foundSaga.chapters.length - 1) {
    nextChapter = foundSaga.chapters[chapterIndex + 1];
  } else if (sagaIndex < sagas.length - 1) {
    const nextSaga = sagas[sagaIndex + 1];
    nextChapter = nextSaga.chapters[0];
  }

  return NextResponse.json({
    chapter: foundChapter,
    saga: {
      id: foundSaga.id,
      title: foundSaga.title,
      tagline: foundSaga.tagline,
      description: foundSaga.description,
      color: foundSaga.color,
      colorSecondary: foundSaga.colorSecondary,
      cover: foundSaga.cover,
      status: foundSaga.status,
      nuevo: foundSaga.nuevo,
      proximamente: foundSaga.proximamente,
      date: foundSaga.date,
      estimatedTime: foundSaga.estimatedTime,
      order: foundSaga.order,
    },
    chapterIndex,
    pages,
    cover,
    prevChapter,
    nextChapter,
    cinematic: true,
    dialogues,
    dialoguesSha,
  }, {
    headers: {
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    }
  });
}
