import { NextRequest, NextResponse } from "next/server";
import { exec, ChildProcess } from "child_process";
import { validateMasterEditorAccess } from "@/lib/editorAccess";
import {
  assertEditorGithubAccess,
  dispatchWorkflow,
  findActiveWorkflowRun,
  findWorkflowRunSince,
  formatGithubApiAuthError,
  getEditorToken,
  getWorkflowRunProgress,
} from "@/lib/githubEditor";

export const dynamic = "force-dynamic";

const WORKFLOW_ID = "publish-editor.yml";

type PublishStatus = "idle" | "running" | "success" | "error";

let currentProcess: ChildProcess | null = null;
let publishLog: string[] = [];
let localStatus: PublishStatus = "idle";

function mapGithubStatus(status: string, conclusion: string | null): PublishStatus {
  if (status !== "completed") return "running";
  return conclusion === "success" ? "success" : "error";
}

function useRemotePublish() {
  return Boolean(getEditorToken()) && process.env.NODE_ENV !== "development";
}

export async function GET(request: NextRequest) {
  if (!validateMasterEditorAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!useRemotePublish()) {
    const failure = publishLog.filter((l) => /❌|::error::/.test(l)).map((l) => l.replace(/::error::/g, "").trim());
    return NextResponse.json({
      status: localStatus,
      runId: null,
      currentStep: localStatus === "running" ? "publish:all local" : null,
      errors: localStatus === "error" ? failure.slice(-3) : [],
      warnings: [],
    });
  }

  const runIdParam = Number(request.nextUrl.searchParams.get("runId"));
  const sinceParam = Number(request.nextUrl.searchParams.get("since"));

  try {
    let runId = Number.isFinite(runIdParam) && runIdParam > 0 ? runIdParam : null;
    if (!runId && Number.isFinite(sinceParam) && sinceParam > 0) {
      runId = await findWorkflowRunSince(WORKFLOW_ID, sinceParam);
    }
    if (!runId) {
      return NextResponse.json({ status: "running", runId: null, currentStep: "Esperando que GitHub inicie el run", errors: [], warnings: [] });
    }

    const progress = await getWorkflowRunProgress(runId);
    return NextResponse.json({
      status: mapGithubStatus(progress.status, progress.conclusion),
      runId,
      currentStep: progress.currentStep,
      failedStep: progress.failedStep,
      errors: progress.errors,
      warnings: progress.warnings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "running", runId: null, currentStep: null, errors: [], warnings: [], transientError: error?.message },
      { status: 200 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!validateMasterEditorAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let message = "chore: publish from editor";
  try {
    const body = await request.json();
    if (typeof body.message === "string" && body.message.trim()) message = body.message.trim().slice(0, 200);
  } catch {
    // keep default
  }

  if (useRemotePublish()) {
    try {
      const activeRunId = await findActiveWorkflowRun(WORKFLOW_ID);
      if (activeRunId) {
        return NextResponse.json(
          { error: "Ya hay una publicación en curso; seguimos esa.", runId: activeRunId, alreadyRunning: true },
          { status: 409 }
        );
      }
      await assertEditorGithubAccess();
      const dispatched = await dispatchWorkflow({ workflowId: WORKFLOW_ID, ref: "main", inputs: { message } });
      return NextResponse.json({ success: true, runId: dispatched.runId, dispatchedAt: dispatched.dispatchedAt });
    } catch (error: any) {
      return NextResponse.json(
        { error: formatGithubApiAuthError(error?.message || "No se pudo publicar") },
        { status: 500 }
      );
    }
  }

  if (localStatus === "running") {
    return NextResponse.json({ error: "Ya hay una publicación local en curso.", alreadyRunning: true }, { status: 409 });
  }

  localStatus = "running";
  publishLog = [];
  const cmd = `npm run publish:all "${message.replace(/["$`\\]/g, "")}"`;
  currentProcess = exec(cmd, { cwd: process.cwd() });
  currentProcess.stdout?.on("data", (data) => publishLog.push(data.toString()));
  currentProcess.stderr?.on("data", (data) => publishLog.push(data.toString()));
  currentProcess.on("close", (code) => {
    localStatus = code === 0 ? "success" : "error";
    currentProcess = null;
  });

  return NextResponse.json({ success: true, runId: null, dispatchedAt: Date.now() });
}
