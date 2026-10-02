import fs from "fs";
import path from "path";
import { findLocalChapter } from "@/lib/chapterFiles";
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

export async function loadEditorTextFile(relativePath: string): Promise<{
  content: string;
  sha: string | null;
  source: "workspace" | "main" | "filesystem";
}> {
  if (!useGithubEditorStorage()) {
    const full = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(full)) return { content: "", sha: null, source: "filesystem" };
    return { content: fs.readFileSync(full, "utf-8"), sha: null, source: "filesystem" };
  }

  await ensureEditorBranch(GITHUB_MAIN_REPO);
  const workspace = await getFile(GITHUB_MAIN_REPO, relativePath, GITHUB_EDITOR_BRANCH);
  if (workspace) return { content: workspace.content, sha: workspace.sha, source: "workspace" };

  const main = await getFile(GITHUB_MAIN_REPO, relativePath, "main");
  if (main) return { content: main.content, sha: null, source: "main" };

  return { content: "", sha: null, source: "workspace" };
}

export async function saveEditorTextFile(options: {
  relativePath: string;
  content: string;
  sha?: string | null;
  message: string;
}): Promise<{ sha: string | null }> {
  if (!useGithubEditorStorage()) {
    const full = path.join(process.cwd(), options.relativePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, options.content, "utf-8");
    return { sha: null };
  }

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
  return null;
}

export { GithubConflictError, GITHUB_ASSETS_REPO };
