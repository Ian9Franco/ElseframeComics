import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { validateEditorAccess } from "@/lib/editorAccess";
import { formatDialoguesJson } from "@/lib/formatDialoguesJson";
import { resolveChapterFolders, snapshotDialoguesContent } from "@/lib/editorStorage";

export const dynamic = "force-dynamic";

/** Copia de seguridad en disco ante cada cambio. No modifica dialogues.json. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!validateEditorAccess(request, id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body?.dialogues) {
      return NextResponse.json({ error: "Missing dialogues data" }, { status: 400 });
    }

    const found = await resolveChapterFolders(id);
    if (!found) {
      return NextResponse.json({ error: "Chapter directory not found" }, { status: 404 });
    }

    const dialoguesPath = path.join(found.chapterPath, "dialogues.json");
    snapshotDialoguesContent(dialoguesPath, `${formatDialoguesJson(body.dialogues)}\n`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error writing dialogues backup:", error);
    return NextResponse.json({ error: "No se pudo guardar el backup" }, { status: 500 });
  }
}
