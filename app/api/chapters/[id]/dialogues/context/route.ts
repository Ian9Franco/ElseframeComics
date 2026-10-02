import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findLocalChapter } from "@/lib/chapterFiles";
import { DIALOGUE_DOCUMENT_ROLES, createEmptyDialogueContext } from "@/lib/dialogueContext";
import { validateEditorAccess } from "@/lib/editorAccess";
import {
  contextRepoPath,
  loadEditorTextFile,
  saveEditorTextFile,
  useGithubEditorStorage,
} from "@/lib/editorStorage";
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
  if (!validateEditorAccess(request, id)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chapterLocation = findLocalChapter(id);
  if (!chapterLocation) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  if (useGithubEditorStorage()) {
    const loaded = await loadEditorTextFile(
      contextRepoPath(chapterLocation.sagaFolder, chapterLocation.chapterFolder)
    );
    if (!loaded.content.trim()) {
      return NextResponse.json({ context: createEmptyDialogueContext(), sha: loaded.sha });
    }
    try {
      const parsed = JSON.parse(loaded.content);
      return NextResponse.json({
        context: {
          version: 1,
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
          pages: parsed.pages && typeof parsed.pages === "object" ? parsed.pages : {},
        },
        sha: loaded.sha,
      });
    } catch {
      return NextResponse.json({ context: createEmptyDialogueContext(), sha: loaded.sha });
    }
  }

  return NextResponse.json({ context: loadDialogueContext(chapterLocation.chapterPath) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!validateEditorAccess(request, id)) {
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

  if (useGithubEditorStorage()) {
    await saveEditorTextFile({
      relativePath: contextRepoPath(chapterLocation.sagaFolder, chapterLocation.chapterFolder),
      content: `${JSON.stringify(parsed.data, null, 2)}\n`,
      message: `editor: save ai-context for ${id}`,
    });
    return NextResponse.json({ success: true, context: parsed.data });
  }

  saveDialogueContext(chapterLocation.chapterPath, parsed.data);
  return NextResponse.json({ success: true, context: parsed.data });
}
