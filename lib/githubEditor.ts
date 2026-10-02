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

function normalizeSecret(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let t = value.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t || undefined;
}

/** PAT fine-grained solo para escritura del editor y Actions (no usar GITHUB_TOKEN de lectura). */
export function getEditorToken(): string | undefined {
  return normalizeSecret(process.env.GITHUB_EDITOR_TOKEN);
}

/** Solo para diagnóstico (nunca devolver el token completo). */
export function describeEditorToken(): {
  configured: boolean;
  length: number;
  shape: "fine-grained" | "classic" | "empty" | "unexpected";
} {
  const token = getEditorToken();
  if (!token) return { configured: false, length: 0, shape: "empty" };
  if (token.startsWith("github_pat_")) {
    return { configured: true, length: token.length, shape: "fine-grained" };
  }
  if (token.startsWith("ghp_") || token.startsWith("gho_")) {
    return { configured: true, length: token.length, shape: "classic" };
  }
  return { configured: true, length: token.length, shape: "unexpected" };
}

export function editorTokenMissingMessage(): string {
  return "GITHUB_EDITOR_TOKEN no está configurado en el servidor (Vercel → Environment Variables).";
}

export function formatGithubApiAuthError(message: string): string {
  if (message === "Bad credentials" || /bad credentials/i.test(message)) {
    return "GITHUB_EDITOR_TOKEN inválido o expirado. Usá un PAT fine-grained con Contents (read/write) y Actions (read/write) en el repo ElseframeComics.";
  }
  if (/resource not accessible by personal access token/i.test(message)) {
    return (
      "El PAT inicia sesión pero no puede usar ElseframeComics ni Actions. " +
      "Fine-grained: Repository access → seleccioná ElseframeComics (no solo theboyz-comic-v1). " +
      "Permissions del repo → Contents Read and write + Actions Read and write. " +
      "Classic PAT alternativo: scopes repo y workflow."
    );
  }
  return message;
}

function githubAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function readGithubErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string };
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

/** Comprueba que el PAT sea válido (login). */
export async function assertEditorGithubAuth(): Promise<void> {
  const token = getEditorToken();
  if (!token) throw new Error(editorTokenMissingMessage());

  const res = await fetch("https://api.github.com/user", {
    headers: githubAuthHeaders(token),
    cache: "no-store",
  });

  if (!res.ok) {
    const message = await readGithubErrorMessage(res, `GitHub auth failed (${res.status})`);
    throw new Error(formatGithubApiAuthError(message));
  }
}

/** Login + acceso al repo principal + workflow de publicación (lo que usa Publicar). */
export async function assertEditorGithubAccess(): Promise<void> {
  const token = getEditorToken();
  if (!token) throw new Error(editorTokenMissingMessage());

  await assertEditorGithubAuth();

  const repoUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_MAIN_REPO}`;
  const repoRes = await fetch(repoUrl, { headers: githubAuthHeaders(token), cache: "no-store" });
  if (!repoRes.ok) {
    const message = await readGithubErrorMessage(
      repoRes,
      `No se pudo acceder a ${GITHUB_OWNER}/${GITHUB_MAIN_REPO} (${repoRes.status})`
    );
    throw new Error(formatGithubApiAuthError(message));
  }

  const workflowRes = await fetch(`${repoUrl}/actions/workflows/publish-editor.yml`, {
    headers: githubAuthHeaders(token),
    cache: "no-store",
  });
  if (!workflowRes.ok) {
    const message = await readGithubErrorMessage(
      workflowRes,
      `No se pudo leer el workflow publish-editor.yml (${workflowRes.status})`
    );
    throw new Error(formatGithubApiAuthError(message));
  }
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

type WorkflowRunSummary = { id: number; created_at: string; status: string; conclusion: string | null };

/** Margen para diferencias de reloj entre Vercel y GitHub al buscar el run recién disparado. */
const RUN_CLOCK_SKEW_MS = 15_000;

async function listWorkflowRuns(workflowId: string, repo: string, query = ""): Promise<WorkflowRunSummary[]> {
  const runs = await githubJson<{ workflow_runs?: WorkflowRunSummary[] }>(
    `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/actions/workflows/${encodeURIComponent(workflowId)}/runs?event=workflow_dispatch&per_page=10${query}`
  );
  return runs.data.workflow_runs || [];
}

/** Run disparado a partir de `sinceMs` (nunca uno anterior: eso mostraba el fallo del run viejo). */
export async function findWorkflowRunSince(
  workflowId: string,
  sinceMs: number,
  repo = GITHUB_MAIN_REPO
): Promise<number | null> {
  const runs = await listWorkflowRuns(workflowId, repo);
  const candidates = runs
    .filter((r) => Date.parse(r.created_at) >= sinceMs - RUN_CLOCK_SKEW_MS)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  return candidates[0]?.id ?? null;
}

export async function findActiveWorkflowRun(workflowId: string, repo = GITHUB_MAIN_REPO): Promise<number | null> {
  const runs = await listWorkflowRuns(workflowId, repo);
  const active = runs.find((r) => ["queued", "in_progress", "pending", "waiting", "requested"].includes(r.status));
  return active?.id ?? null;
}

export async function dispatchWorkflow(options: {
  repo?: string;
  workflowId: string;
  ref?: string;
  inputs?: Record<string, string>;
}): Promise<{ runId: number | null; dispatchedAt: number }> {
  const repo = options.repo || GITHUB_MAIN_REPO;
  const ref = options.ref || "main";
  const dispatchedAt = Date.now();
  const dispatchUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/actions/workflows/${encodeURIComponent(options.workflowId)}/dispatches`;
  const dispatched = await githubJson<{ message?: string }>(dispatchUrl, {
    method: "POST",
    body: JSON.stringify({ ref, inputs: options.inputs || {} }),
  });
  if (!dispatched.ok) {
    throw new Error(dispatched.data.message || `workflow_dispatch failed (${dispatched.status})`);
  }

  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const runId = await findWorkflowRunSince(options.workflowId, dispatchedAt, repo);
    if (runId) return { runId, dispatchedAt };
  }
  return { runId: null, dispatchedAt };
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

export type WorkflowRunProgress = {
  status: string;
  conclusion: string | null;
  currentStep: string | null;
  failedStep: string | null;
  errors: string[];
  warnings: string[];
};

/** Estado del run + paso actual + anotaciones ::error:: / ::warning:: del job. */
export async function getWorkflowRunProgress(runId: number, repo = GITHUB_MAIN_REPO): Promise<WorkflowRunProgress> {
  const run = await getWorkflowRun(runId, repo);
  const jobsRes = await githubJson<{
    jobs?: Array<{
      id: number;
      steps?: Array<{ name: string; status: string; conclusion: string | null }>;
    }>;
  }>(`https://api.github.com/repos/${GITHUB_OWNER}/${repo}/actions/runs/${runId}/jobs`);
  const job = jobsRes.data.jobs?.[0];
  const steps = job?.steps || [];
  const currentStep = steps.find((s) => s.status === "in_progress")?.name ?? null;
  const failedStep = steps.find((s) => s.conclusion === "failure")?.name ?? null;

  const errors: string[] = [];
  const warnings: string[] = [];
  if (job && run.status === "completed") {
    const ann = await githubJson<Array<{ annotation_level: string; message: string }>>(
      `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/check-runs/${job.id}/annotations`
    );
    if (Array.isArray(ann.data)) {
      for (const a of ann.data) {
        if (/^Process completed with exit code/i.test(a.message)) continue;
        if (a.annotation_level === "failure") errors.push(a.message);
        else if (a.annotation_level === "warning" && !/Node\.js \d+ is deprecated/i.test(a.message)) {
          warnings.push(a.message);
        }
      }
    }
  }

  return { status: run.status, conclusion: run.conclusion, currentStep, failedStep, errors, warnings };
}

export type TreeChange =
  | { path: string; sha: string | null }
  | { path: string; content: string };

export async function createBlob(repo: string, base64Content: string): Promise<string> {
  const { ok, data } = await githubJson<{ sha?: string; message?: string }>(
    `https://api.github.com/repos/${GITHUB_OWNER}/${repo}/git/blobs`,
    { method: "POST", body: JSON.stringify({ content: base64Content, encoding: "base64" }) }
  );
  if (!ok || !data.sha) throw new Error(data.message || "No se pudo subir el archivo a GitHub");
  return data.sha;
}

/**
 * Un solo commit con varios cambios (agregar, mover reutilizando el blob, borrar con sha null).
 * Reintenta si la rama avanzó entre la lectura y la actualización del ref.
 */
export async function commitTreeChanges(options: {
  repo: string;
  changes: TreeChange[];
  message: string;
  branch?: string;
}): Promise<{ commitSha: string }> {
  const branch = options.branch || GITHUB_EDITOR_BRANCH;
  const base = `https://api.github.com/repos/${GITHUB_OWNER}/${options.repo}/git`;
  const tree = options.changes.map((c) =>
    "content" in c
      ? { path: c.path, mode: "100644", type: "blob", content: c.content }
      : { path: c.path, mode: "100644", type: "blob", sha: c.sha }
  );

  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await githubJson<{ object?: { sha?: string }; message?: string }>(
      `${base}/ref/heads/${encodeURIComponent(branch)}`
    );
    const parentSha = ref.data.object?.sha;
    if (!ref.ok || !parentSha) throw new Error(ref.data.message || `No se pudo leer ${branch}`);

    const parent = await githubJson<{ tree?: { sha?: string }; message?: string }>(`${base}/commits/${parentSha}`);
    const baseTree = parent.data.tree?.sha;
    if (!parent.ok || !baseTree) throw new Error(parent.data.message || "No se pudo leer el commit base");

    const newTree = await githubJson<{ sha?: string; message?: string }>(`${base}/trees`, {
      method: "POST",
      body: JSON.stringify({ base_tree: baseTree, tree }),
    });
    if (!newTree.ok || !newTree.data.sha) throw new Error(newTree.data.message || "No se pudo armar el commit");

    const commit = await githubJson<{ sha?: string; message?: string }>(`${base}/commits`, {
      method: "POST",
      body: JSON.stringify({ message: options.message, tree: newTree.data.sha, parents: [parentSha] }),
    });
    if (!commit.ok || !commit.data.sha) throw new Error(commit.data.message || "No se pudo crear el commit");

    const updated = await githubJson<{ message?: string }>(`${base}/refs/heads/${encodeURIComponent(branch)}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.data.sha, force: false }),
    });
    if (updated.ok) return { commitSha: commit.data.sha };
    if (updated.status !== 422) throw new Error(updated.data.message || "No se pudo actualizar la rama");
  }
  throw new Error(`${branch} cambió mientras se guardaba. Probá de nuevo.`);
}
