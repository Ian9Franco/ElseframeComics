import { NextRequest, NextResponse } from "next/server";
import { exec, ChildProcess } from "child_process";
import path from "path";
import { validateMasterEditorAccess as validateAccess } from "@/lib/masterPassword";

export const dynamic = "force-dynamic";

let currentProcess: ChildProcess | null = null;
let publishLog: string[] = [];
let publishStatus: "idle" | "running" | "success" | "error" = "idle";

export async function GET(request: NextRequest) {
  if (!validateAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ status: publishStatus, log: publishLog });
}

export async function POST(request: NextRequest) {
  if (!validateAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (publishStatus === "running") {
    return NextResponse.json({ error: "Publish already in progress" }, { status: 409 });
  }

  let message = "chore: publish from editor";
  try {
    const body = await request.json();
    if (body.message) message = body.message;
  } catch(e) {}

  publishStatus = "running";
  publishLog = ["Iniciando publicación..."];

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
