/**
 * Server-only GitHub helper for the production editor workspace.
 * Never import this from client components.
 */

export const GITHUB_OWNER = process.env.GITHUB_OWNER || "Ian9Franco";
export const GITHUB_MAIN_REPO = process.env.GITHUB_MAIN_REPO || "ElseframeComics";
export const GITHUB_ASSETS_REPO = process.env.GITHUB_ASSETS_REPO || "theboyz-comic-v1";
export const GITHUB_EDITOR_BRANCH = process.env.GITHUB_EDITOR_BRANCH || "editor-workspace";

export class GithubConflictError extends Error {
  currentSha?: string;
  constructor(message = "Conflict", currentSha?: string) {
    super(message);
    this.name = "GithubConflictError";
    this.currentSha = currentSha;
  }
}

export function getEditorToken(): string | undefined {
  return process.env.GITHUB_EDITOR_TOKEN || process.env.GITHUB_TOKEN || undefined;
}

function buildHeaders(json = true): HeadersInit {
  const token = getEditorToken();
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (json) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function encodeRepoPath(repoPath: string): string {
  return repoPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

async function githubJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(url, {
    ...init,
    headers: { ...buildHeaders(), ...(init?.headers || {}) },
    cache: "no-store",
  });
  let data: T = {} as T;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = { message: text } as T;
    }
  }
  return { ok: res.ok, status: res.status, data };
}

export type GithubFile = {
  content: string;
  sha: string;
  path: string;
};

export async function getFile(
  repo: string,
  filePath: string,
  ref: string = GITHUB_EDITOR_BRANCH
): Promise<GithubFile | null> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/contents/${encodeRepoPath(filePath)}?ref=${encodeURIComponent(ref)}`;
  const { ok, status, data } = await githubJson<{
    content?: string;
    encoding?: string;
    sha?: string;
    path?: string;
    message?: string;
  }>(url);

  if (status === 404) return null;
  if (!ok || !data.content || !data.sha) {
    throw new Error(data.message || `GitHub getFile failed (${status})`);
  }

  const decoded = Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
  return { content: decoded, sha: data.sha, path: data.path || filePath };
}

export async function putFile(options: {
  repo: string;
  filePath: string;
  content: string;
  message: string;
  branch?: string;
  sha?: string | null;
}): Promise<{ sha: string; commitSha?: string }> {
  const branch = options.branch || GITHUB_EDITOR_BRANCH;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${options.repo}/contents/${encodeRepoPath(options.filePath)}`;
  const body: Record<string, unknown> = {
    message: options.message,
    content: Buffer.from(options.content, "utf-8").toString("base64"),
    branch,
  };
  if (options.sha) body.sha = options.sha;

  const { ok, status, data } = await githubJson<{
    content?: { sha?: string };
    commit?: { sha?: string };
    message?: string;
    sha?: string;
  }>(url, { method: "PUT", body: JSON.stringify(body) });

  if (status === 409 || status === 422) {
    const current = await getFile(options.repo, options.filePath, branch);
    throw new GithubConflictError(
      data.message || "El archivo cambió en GitHub. Recargá antes de sobrescribir.",
      current?.sha
    );
  }
  if (!ok) {
    throw new Error(data.message || `GitHub putFile failed (${status})`);
  }

  return {
    sha: data.content?.sha || "",
    commitSha: data.commit?.sha,
  };
}

export async function deleteFile(options: {
  repo: string;
  filePath: string;
  message: string;
  branch?: string;
  sha: string;
}): Promise<void> {
  const branch = options.branch || GITHUB_EDITOR_BRANCH;
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${options.repo}/contents/${encodeRepoPath(options.filePath)}`;
  const { ok, status, data } = await githubJson<{ message?: string }>(url, {
    method: "DELETE",
    body: JSON.stringify({ message: options.message, branch, sha: options.sha }),
  });
  if (!ok) throw new Error(data.message || `GitHub deleteFile failed (${status})`);
}

export type GithubDirItem = {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
  download_url: string | null;
};

export async function listDirectory(
  repo: string,
  dirPath: string,
  ref: string = GITHUB_EDITOR_BRANCH
): Promise<GithubDirItem[] | null> {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/contents/${encodeRepoPath(dirPath)}?ref=${encodeURIComponent(ref)}`;
  const { ok, status, data } = await githubJson<GithubDirItem[] | { message?: string }>(url);
  if (status === 404) return null;
  if (!ok || !Array.isArray(data)) {
    throw new Error((data as { message?: string }).message || `GitHub listDirectory failed (${status})`);
  }
  return data;
}

export async function ensureEditorBranch(repo: string, fromRef = "main"): Promise<void> {
  const branch = GITHUB_EDITOR_BRANCH;
  const refUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`;
  const existing = await githubJson<{ object?: { sha?: string } }>(refUrl);
  if (existing.ok) return;

  const source = await githubJson<{ object?: { sha?: string }; message?: string }>(
    `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/git/ref/heads/${encodeURIComponent(fromRef)}`
  );
  const sha = source.data.object?.sha;
  if (!source.ok || !sha) {
    throw new Error(source.data.message || `No se pudo leer ${fromRef} en ${repo}`);
  }

  const created = await githubJson<{ message?: string }>(
    `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/git/refs`,
    {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    }
  );
  if (!created.ok) {
    throw new Error(created.data.message || `No se pudo crear ${branch} en ${repo}`);
  }
}

export async function dispatchWorkflow(options: {
  repo?: string;
  workflowId: string;
  ref?: string;
  inputs?: Record<string, string>;
}): Promise<{ runId: number | null }> {
  const repo = options.repo || GITHUB_MAIN_REPO;
  const ref = options.ref || "main";
  const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/actions/workflows/${encodeURIComponent(options.workflowId)}/dispatches`;
  const dispatched = await githubJson<{ message?: string }>(dispatchUrl, {
    method: "POST",
    body: JSON.stringify({ ref, inputs: options.inputs || {} }),
  });
  if (!dispatched.ok) {
    throw new Error(dispatched.data.message || `workflow_dispatch failed (${dispatched.status})`);
  }

  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 700));
    const runs = await githubJson<{ workflow_runs?: Array<{ id: number; created_at: string; status: string }> }>(
      `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/actions/workflows/${encodeURIComponent(options.workflowId)}/runs?event=workflow_dispatch&per_page=5`
    );
    const run = runs.data.workflow_runs?.[0];
    if (run?.id) return { runId: run.id };
  }
  return { runId: null };
}

export async function getWorkflowRun(runId: number, repo = GITHUB_MAIN_REPO) {
  const { ok, data } = await githubJson<{
    id: number;
    status: string;
    conclusion: string | null;
    html_url: string;
    message?: string;
  }>(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/actions/runs/${runId}`);
  if (!ok) throw new Error(data.message || "No se pudo leer el workflow run");
  return data;
}
