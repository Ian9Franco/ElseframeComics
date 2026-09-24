import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findLocalChapter } from "@/lib/chapterFiles";
import { DIALOGUE_DOCUMENT_ROLES } from "@/lib/dialogueContext";
import { validateEditorAccess } from "@/lib/editorAccess";
import {
  loadDialogueContext,
  resolveDocumentPath,
  saveDialogueContext,
} from "@/lib/serverDialogueContext";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const contextSchema = z.object({
  version: z.literal(1),
  documents: z.array(
    z.object({
      path: z.string().trim().min(1).max(500),
      role: z.enum(DIALOGUE_DOCUMENT_ROLES),
    })
  ).max(100),
  pages: z.record(
    z.string().max(120),
    z.object({
      prompt: z.string().max(8000),
      characters: z.array(z.string().trim().min(1).max(100)).max(30),
      continuityPages: z.number().int().min(0).max(10),
    })
  ),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!validateEditorAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chapterLocation = findLocalChapter(id);
  if (!chapterLocation) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  return NextResponse.json({ context: loadDialogueContext(chapterLocation.chapterPath) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!validateEditorAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chapterLocation = findLocalChapter(id);
  if (!chapterLocation) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = contextSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid context configuration" }, { status: 400 });
  }

  const documentsAreValid = parsed.data.documents.every((document) => {
    const targetPath = resolveDocumentPath(document.path);
    return Boolean(targetPath && fs.existsSync(targetPath) && fs.statSync(targetPath).isFile());
  });
  if (!documentsAreValid) {
    return NextResponse.json({ error: "One or more documents are invalid" }, { status: 400 });
  }

  saveDialogueContext(chapterLocation.chapterPath, parsed.data);
  return NextResponse.json({ success: true, context: parsed.data });
}
