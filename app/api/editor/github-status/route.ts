import { NextRequest, NextResponse } from "next/server";
import { validateMasterEditorAccess } from "@/lib/editorAccess";
import {
  GITHUB_MAIN_REPO,
  GITHUB_OWNER,
  assertEditorGithubAuth,
  describeEditorToken,
  formatGithubApiAuthError,
  getEditorToken,
} from "@/lib/githubEditor";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico del PAT en el servidor (Vercel). No expone el token.
 * GET con header x-editor-password (misma clave que el editor).
 */
export async function GET(request: NextRequest) {
  if (!validateMasterEditorAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meta = describeEditorToken();
  if (!meta.configured) {
    return NextResponse.json({
      ok: false,
      meta,
      owner: GITHUB_OWNER,
      mainRepo: GITHUB_MAIN_REPO,
      error: "GITHUB_EDITOR_TOKEN no está definido en este deployment.",
    });
  }

  try {
    await assertEditorGithubAuth();
    const token = getEditorToken()!;
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });
    const user = (await userRes.json()) as { login?: string };

    const repoRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_MAIN_REPO}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      }
    );
    const repo = (await repoRes.json()) as { full_name?: string; permissions?: { push?: boolean } };

    const workflowsRes = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_MAIN_REPO}/actions/workflows`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
      }
    );

    return NextResponse.json({
      ok: true,
      meta,
      githubLogin: user.login ?? null,
      repo: repoRes.ok ? repo.full_name : null,
      repoAccessible: repoRes.ok,
      repoPush: repo.permissions?.push ?? null,
      workflowsListOk: workflowsRes.ok,
      workflowsStatus: workflowsRes.status,
      hint:
        meta.shape === "unexpected"
          ? "El valor no parece un PAT de GitHub (debería empezar con github_pat_ o ghp_). Revisá que no pegaste el nombre del secret ni texto extra."
          : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({
      ok: false,
      meta,
      owner: GITHUB_OWNER,
      mainRepo: GITHUB_MAIN_REPO,
      error: formatGithubApiAuthError(message),
      steps: [
        "GitHub → Settings → Developer settings → Fine-grained personal access tokens → Generate.",
        "Repository access: Only select repositories → ElseframeComics.",
        "Permissions: Contents Read and write, Actions Read and write.",
        "Si el repo está en una org con SSO: autorizá el token en SSO (botón Authorize).",
        "Vercel: borrá GITHUB_EDITOR_TOKEN, volvé a crearla pegando solo el token (sin comillas). Redeploy.",
      ],
    });
  }
}
