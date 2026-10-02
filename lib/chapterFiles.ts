import fs from "fs";
import path from "path";
import { getDynamicSagas, parsePrefix } from "@/lib/serverData";

export function findLocalChapter(chapterId: string) {
  const saga = getDynamicSagas().find((candidate) =>
    candidate.chapters.some((chapter) => chapter.id === chapterId)
  );
  const chapter = saga?.chapters.find((candidate) => candidate.id === chapterId);
  if (!saga || !chapter) return null;

  const comicsDir = path.join(process.cwd(), "public", "comics");
  if (!fs.existsSync(comicsDir)) return null;

  const sagaFolder = fs
    .readdirSync(comicsDir)
    .find((folder) => parsePrefix(folder).cleanName === saga.id);
  if (!sagaFolder) return null;

  const sagaPath = path.join(comicsDir, sagaFolder);
  const chapterFolder = fs
    .readdirSync(sagaPath)
    .find((folder) => parsePrefix(folder).cleanName === chapter.id);
  if (!chapterFolder) return null;

  return {
    saga,
    chapter,
    sagaFolder,
    chapterFolder,
    chapterPath: path.join(sagaPath, chapterFolder),
  };
}

