import { NextRequest, NextResponse } from "next/server";
import { exec, ChildProcess } from "child_process";
import { validateMasterEditorAccess } from "@/lib/editorAccess";
import {
  assertEditorGithubAccess,
  dispatchWorkflow,
  formatGithubApiAuthError,
  getEditorToken,
  getWorkflowRun,
} from "@/lib/githubEditor";

export const dynamic = "force-dynamic";

let currentProcess: ChildProcess | null = null;
let publishLog: string[] = [];
let publishStatus: "idle" | "running" | "success" | "error" = "idle";
let lastRunId: number | null = null;
let publishDispatchInFlight = false;

function mapGithubStatus(run: { status: string; conclusion: string | null }): "idle" | "running" | "success" | "error" {
  if (run.status === "queued" || run.status === "in_progress" || run.status === "pending" || run.status === "waiting") {
    return "running";
  }
  if (run.status === "completed" && run.conclusion === "success") return "success";
  if (run.status === "completed") return "error";
  return "running";
}

function useRemotePublish() {
  return Boolean(getEditorToken()) && process.env.NODE_ENV !== "development";
}

export async function GET(request: NextRequest) {
  if (!validateMasterEditorAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const runIdParam = request.nextUrl.searchParams.get("runId");
  const runId = runIdParam ? Number(runIdParam) : lastRunId;

  if (useRemotePublish() && runId) {
    try {
      const run = await getWorkflowRun(runId);
      const status = mapGithubStatus(run);
      const log = [
        `GitHub Actions ${run.status}${run.conclusion ? ` / ${run.conclusion}` : ""}\n`,
        run.html_url ? `${run.html_url}\n` : "",
      ];
      if (status === "running") log.unshift("Publicando en GitHub Actions...\n");
      if (status === "success") {
        log.push("Listo. Esperá el deploy de Vercel (1–3 min) y probá en otro navegador.\n");
      }
      if (status === "error") log.push("Falló la publicación.\n");
      return NextResponse.json({ status, log, runId });
    } catch (error: any) {
      return NextResponse.json({ status: "error", log: [error.message], runId });
    }
  }

  return NextResponse.json({ status: publishStatus, log: publishLog, runId: lastRunId });
}

async function remotePublishInProgress(): Promise<{ running: boolean; runId: number | null }> {
  if (!lastRunId) return { running: false, runId: null };
  try {
    const run = await getWorkflowRun(lastRunId);
    return { running: mapGithubStatus(run) === "running", runId: lastRunId };
  } catch {
    return { running: false, runId: lastRunId };
  }
}

export async function POST(request: NextRequest) {
  if (!validateMasterEditorAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // En Vercel no hay proceso local: el lock en memoria quedaba en "running" para siempre.
  if (useRemotePublish()) {
    if (publishDispatchInFlight) {
      return NextResponse.json(
        {
          error: "Ya se está disparando una publicación. Esperá unos segundos.",
          runId: lastRunId,
        },
        { status: 409 }
      );
    }
    const remote = await remotePublishInProgress();
    if (remote.running) {
      return NextResponse.json(
        {
          error: "Ya hay una publicación en GitHub Actions. Esperá a que termine o revisá Actions en ElseframeComics.",
          runId: remote.runId,
        },
        { status: 409 }
      );
    }
  } else if (publishStatus === "running") {
    return NextResponse.json({ error: "Publish already in progress" }, { status: 409 });
  }

  let message = "chore: publish from editor";
  try {
    const body = await request.json();
    if (body.message) message = body.message;
  } catch {
    // keep default
  }

  if (useRemotePublish()) {
    publishDispatchInFlight = true;
    publishStatus = "running";
    try {
      await assertEditorGithubAccess();
      const dispatched = await dispatchWorkflow({
        workflowId: "publish-editor.yml",
        ref: "main",
        inputs: { message },
      });
      lastRunId = dispatched.runId;
      publishLog = ["Disparando GitHub Actions...", dispatched.runId ? `run ${dispatched.runId}` : "esperando run id..."];
      return NextResponse.json({ success: true, runId: dispatched.runId });
    } catch (error: any) {
      publishStatus = "error";
      const errMessage = formatGithubApiAuthError(error?.message || "No se pudo publicar");
      return NextResponse.json({ error: errMessage }, { status: 500 });
    } finally {
      publishDispatchInFlight = false;
    }
  }

  publishStatus = "running";
  publishLog = ["Iniciando publicación local..."];

  const cmd = `npm run publish:all "${message.replace(/"/g, '\\"')}"`;
  currentProcess = exec(cmd, { cwd: process.cwd() });

  currentProcess.stdout?.on("data", (data) => {
    publishLog.push(data.toString());
  });

  currentProcess.stderr?.on("data", (data) => {
    publishLog.push(data.toString());
  });

  currentProcess.on("close", (code) => {
    publishStatus = code === 0 ? "success" : "error";
    publishLog.push(`Proceso finalizado con código: ${code}`);
    currentProcess = null;
  });

  return NextResponse.json({ success: true });
}
