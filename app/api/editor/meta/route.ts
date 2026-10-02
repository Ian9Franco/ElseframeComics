import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { validateEditorApiAccess } from "@/lib/editorAccess";
import { findChildDirById, getPublicComicsDir } from "@/lib/serverData";

export const dynamic = "force-dynamic";

const sagaFieldsSchema = z.object({
  title: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  color_secondary: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  nuevo: z.boolean().optional(),
  proximamente: z.boolean().optional(),
  date: z.string().optional(),
  estimatedTime: z.string().optional(),
  order: z.number().optional(),
});

const chapterFieldsSchema = z.object({
  title: z.string().optional(),
  status: z.enum(["draft", "published"]).optional(),
  nuevo: z.boolean().optional(),
  proximamente: z.boolean().optional(),
  date: z.string().optional(),
  releaseDate: z.string().optional(),
  estimatedTime: z.string().optional(),
});

function readJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return {};
  }
}

function writeJson(filePath: string, data: Record<string, unknown>) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

function resolvePaths(sagaId: string, chapterId?: string) {
  const comicsDir = getPublicComicsDir();
  const sagaDirName = findChildDirById(comicsDir, sagaId);
  if (!sagaDirName) return null;
  const sagaPath = path.join(comicsDir, sagaDirName);
  if (!chapterId) {
    return { sagaPath, chapterPath: null as string | null };
  }
  const chapterDirName = findChildDirById(sagaPath, chapterId);
  if (!chapterDirName) return { sagaPath, chapterPath: null as string | null };
  return { sagaPath, chapterPath: path.join(sagaPath, chapterDirName) };
}

export async function GET(request: NextRequest) {
  if (!validateEditorApiAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sagaId = request.nextUrl.searchParams.get("sagaId");
  const chapterId = request.nextUrl.searchParams.get("chapterId");
  if (!sagaId) return NextResponse.json({ error: "sagaId required" }, { status: 400 });

  const paths = resolvePaths(sagaId, chapterId || undefined);
  if (!paths) return NextResponse.json({ error: "Saga not found" }, { status: 404 });

  const saga = readJson(path.join(paths.sagaPath, "saga.json"));
  const chapter = paths.chapterPath ? readJson(path.join(paths.chapterPath, "chapter.json")) : null;
  if (chapterId && !paths.chapterPath) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  return NextResponse.json({ saga, chapter });
}

export async function PATCH(request: NextRequest) {
  if (!validateEditorApiAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const type = body.type as string | undefined;
  const sagaId = body.sagaId as string | undefined;
  const chapterId = body.chapterId as string | undefined;
  if (!sagaId || (type !== "saga" && type !== "chapter")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const paths = resolvePaths(sagaId, type === "chapter" ? chapterId : undefined);
  if (!paths) return NextResponse.json({ error: "Saga not found" }, { status: 404 });

  try {
    if (type === "saga") {
      const parsed = sagaFieldsSchema.parse(body.fields ?? {});
      const jsonPath = path.join(paths.sagaPath, "saga.json");
      const json = readJson(jsonPath);
      Object.assign(json, parsed);
      json.cinematic = true;
      writeJson(jsonPath, json);
      return NextResponse.json({ success: true, saga: json });
    }

    if (!chapterId || !paths.chapterPath) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }
    const parsed = chapterFieldsSchema.parse(body.fields ?? {});
    const jsonPath = path.join(paths.chapterPath, "chapter.json");
    const json = readJson(jsonPath);
    Object.assign(json, parsed);
    json.cinematic = true;
    writeJson(jsonPath, json);
    return NextResponse.json({ success: true, chapter: json });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Invalid fields", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
