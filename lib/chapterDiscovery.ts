import type { Chapter } from "@/lib/serverData";

export type ChapterGuideStatus = "start" | "continue" | "read" | "locked" | null;

export function normalizeReadIds(readChapters: string[]): string[] {
  return readChapters.map((r) => decodeURIComponent(r).toLowerCase().trim());
}

export function getPublishedChapters(chapters: Chapter[]): Chapter[] {
  const hasPublished = chapters.some((c) => c.status === "published");
  return chapters
    .filter((c) => c.status === "published" || !hasPublished)
    .sort((a, b) => a.number - b.number);
}

export function isChapterLocked(
  chapter: Chapter,
  publishedChapters: Chapter[],
  readChapters: string[],
  isClient: boolean,
  unlockAll: boolean
): boolean {
  if (!isClient || unlockAll) return false;
  const readIdx = publishedChapters.findIndex((c) => c.id === chapter.id);
  if (readIdx <= 0) return false;
  const prevChapter = publishedChapters[readIdx - 1];
  const normalizedRead = normalizeReadIds(readChapters);
  return !normalizedRead.includes(decodeURIComponent(prevChapter.id).toLowerCase().trim());
}

export function getChapterGuideStatus(
  chapter: Chapter,
  publishedChapters: Chapter[],
  readChapters: string[],
  isClient: boolean,
  unlockAll: boolean
): ChapterGuideStatus {
  const normalizedRead = normalizeReadIds(readChapters);
  const chapterIdNorm = decodeURIComponent(chapter.id).toLowerCase().trim();
  const isRead = normalizedRead.includes(chapterIdNorm);
  const locked = isChapterLocked(chapter, publishedChapters, readChapters, isClient, unlockAll);

  if (locked) return "locked";

  const hasProgress = publishedChapters.some((c) =>
    normalizedRead.includes(decodeURIComponent(c.id).toLowerCase().trim())
  );

  if (!hasProgress) {
    if (publishedChapters[0]?.id === chapter.id) return "start";
    if (isRead) return "read";
    return null;
  }

  const continueChapter = publishedChapters.find((c) => {
    const cLocked = isChapterLocked(c, publishedChapters, readChapters, isClient, unlockAll);
    const cRead = normalizedRead.includes(decodeURIComponent(c.id).toLowerCase().trim());
    return !cLocked && !cRead;
  });

  if (continueChapter?.id === chapter.id) return "continue";
  if (isRead) return "read";
  return null;
}

export function getSagaReadingProgress(publishedChapters: Chapter[], readChapters: string[]) {
  const normalizedRead = normalizeReadIds(readChapters);
  const readCount = publishedChapters.filter((c) =>
    normalizedRead.includes(decodeURIComponent(c.id).toLowerCase().trim())
  ).length;
  return { readCount, totalPublished: publishedChapters.length };
}

export function getSagaCtaLabel(
  publishedChapters: Chapter[],
  readChapters: string[],
  isClient: boolean,
  unlockAll: boolean,
  showChapters: boolean
): string {
  if (showChapters) return "Ocultar Episodios";

  const { readCount, totalPublished } = getSagaReadingProgress(publishedChapters, readChapters);
  if (readCount === 0) return "Empezá a leer";
  if (readCount < totalPublished) return "Seguí leyendo";

  const hasLockedAhead = publishedChapters.some((c) =>
    isChapterLocked(c, publishedChapters, readChapters, isClient, unlockAll)
  );
  if (hasLockedAhead) return "Ver episodios";

  return readCount === totalPublished && totalPublished > 0 ? "Repasar episodios" : "Ver episodios";
}
