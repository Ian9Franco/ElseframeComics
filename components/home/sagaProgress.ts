export type ChapterHighlight = "start" | "next" | "read" | null;

export type ProgressChapter = {
  id: string;
  title: string;
  number: number;
  status?: string;
};

export type ProgressSaga = {
  id: string;
  title: string;
  order: number;
  proximamente?: boolean;
  chapters: ProgressChapter[];
};

export function normalizeChapterId(id: string): string {
  try {
    return decodeURIComponent(id).toLowerCase().trim();
  } catch {
    return id.toLowerCase().trim();
  }
}

export function readReadChapters(): string[] {
  try {
    const raw = localStorage.getItem("read-chapters");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Same visibility rule the saga lists already use: published chapters only,
// unless the saga has none published (then everything is shown).
export function getPublishedChapters<C extends ProgressChapter>(saga: { chapters: C[] }): C[] {
  const hasPublished = saga.chapters.some((c) => c.status === "published");
  return saga.chapters
    .filter((c) => c.status === "published" || !hasPublished)
    .sort((a, b) => a.number - b.number);
}

export type SagaProgress = {
  publishedChapters: ProgressChapter[];
  readCount: number;
  total: number;
  hasProgress: boolean;
  isComplete: boolean;
  /** First chapter of the saga, only when the reader has no progress here. */
  startChapter: ProgressChapter | null;
  /** Next unread, unlocked chapter, only when the reader already has progress. */
  nextChapter: ProgressChapter | null;
  isRead: (chapter: ProgressChapter) => boolean;
  isLocked: (chapter: ProgressChapter) => boolean;
  getHighlight: (chapter: ProgressChapter) => ChapterHighlight;
  getPrevChapter: (chapter: ProgressChapter) => ProgressChapter | null;
};

export function getSagaProgress(
  saga: { chapters: ProgressChapter[] },
  readChapters: string[],
  { isClient, unlockAll }: { isClient: boolean; unlockAll: boolean }
): SagaProgress {
  const publishedChapters = getPublishedChapters(saga);
  const readSet = new Set(readChapters.map(normalizeChapterId));

  const isRead = (chapter: ProgressChapter) => readSet.has(normalizeChapterId(chapter.id));

  const getPrevChapter = (chapter: ProgressChapter) => {
    const idx = publishedChapters.findIndex((c) => c.id === chapter.id);
    return idx > 0 ? publishedChapters[idx - 1] : null;
  };

  const isLocked = (chapter: ProgressChapter) => {
    if (!isClient || unlockAll) return false;
    const prev = getPrevChapter(chapter);
    if (!prev) return false;
    return !isRead(prev);
  };

  const readCount = publishedChapters.filter(isRead).length;
  const total = publishedChapters.length;
  const hasProgress = readCount > 0;
  const isComplete = total > 0 && readCount === total;

  const firstChapter = publishedChapters[0] ?? null;
  const firstUnread = publishedChapters.find((c) => !isRead(c) && !isLocked(c)) ?? null;

  const startChapter = hasProgress ? null : firstChapter;
  const nextChapter = hasProgress ? firstUnread : null;

  const getHighlight = (chapter: ProgressChapter): ChapterHighlight => {
    if (isRead(chapter)) return "read";
    if (startChapter && startChapter.id === chapter.id) return "start";
    if (nextChapter && nextChapter.id === chapter.id) return "next";
    return null;
  };

  return {
    publishedChapters,
    readCount,
    total,
    hasProgress,
    isComplete,
    startChapter,
    nextChapter,
    isRead,
    isLocked,
    getHighlight,
    getPrevChapter,
  };
}

export type RecommendedRead = {
  href: string;
  label: string;
  caption: string | null;
  mode: "start" | "continue" | "browse";
};

/**
 * Picks where the hero CTA should send the reader:
 * - with progress: the next chapter of the most advanced saga still in progress,
 * - otherwise: chapter 1 of the earliest official saga with something published,
 * - fallback: scroll to the saga list.
 */
export function getRecommendedRead(
  sagas: ProgressSaga[],
  readChapters: string[],
  { isClient, unlockAll }: { isClient: boolean; unlockAll: boolean }
): RecommendedRead {
  const browse: RecommendedRead = { href: "/#sagas", label: "Empezá a leer", caption: null, mode: "browse" };
  if (!sagas || sagas.length === 0) return browse;

  const official = sagas
    .filter((s) => s.order >= 3 && !s.proximamente && s.chapters?.some((c) => c.status === "published"))
    .sort((a, b) => a.order - b.order);

  if (official.length === 0) return browse;

  const withProgress = official
    .map((saga) => ({ saga, progress: getSagaProgress(saga, readChapters, { isClient, unlockAll }) }))
    .filter(({ progress }) => progress.hasProgress && !progress.isComplete && progress.nextChapter);

  if (withProgress.length > 0) {
    const { saga, progress } = withProgress[withProgress.length - 1];
    const ch = progress.nextChapter as ProgressChapter;
    return {
      href: `/chapters/${ch.id}`,
      label: "Seguí leyendo",
      caption: `${saga.title} · Cap. ${ch.number}: ${ch.title}`,
      mode: "continue",
    };
  }

  const firstSaga = official[0];
  const firstChapter = getPublishedChapters(firstSaga)[0];
  if (!firstChapter) return browse;

  return {
    href: `/chapters/${firstChapter.id}`,
    label: "Empezá a leer",
    caption: `${firstSaga.title} · Cap. ${firstChapter.number}: ${firstChapter.title}`,
    mode: "start",
  };
}
