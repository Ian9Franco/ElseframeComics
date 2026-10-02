import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { validateEditorApiAccess } from "@/lib/editorAccess";
import { findChildDirById, getPublicComicsDir } from "@/lib/serverData";
import {
  GithubConflictError,
  loadEditorTextFile,
  saveEditorTextFile,
  useGithubEditorStorage,
} from "@/lib/editorStorage";
import { formatGithubApiAuthError } from "@/lib/githubEditor";

export const dynamic = "force-dynamic";

const sagaFieldsSchema = z.object({
  title: z.string().max(200).optional(),
  tagline: z.string().max(300).optional(),
  description: z.string().max(4000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  color_secondary: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  status: z.enum(["draft", "published"]).optional(),
  nuevo: z.boolean().optional(),
  proximamente: z.boolean().optional(),
  date: z.string().max(100).optional(),
  estimatedTime: z.string().max(100).optional(),
  order: z.number().optional(),
});

const chapterFieldsSchema = z.object({
  title: z.string().max(200).optional(),
  status: z.enum(["draft", "published"]).optional(),
  nuevo: z.boolean().optional(),
  proximamente: z.boolean().optional(),
  date: z.string().max(100).optional(),
  releaseDate: z.string().max(100).optional(),
  estimatedTime: z.string().max(100).optional(),
});

type MetaLocation = { sagaDir: string; chapterDir: string | null };

function resolveDirs(sagaId: string, chapterId?: string): MetaLocation | null {
  const comicsDir = getPublicComicsDir();
  const sagaDir = findChildDirById(comicsDir, sagaId);
  if (!sagaDir) return null;
  if (!chapterId) return { sagaDir, chapterDir: null };
  return { sagaDir, chapterDir: findChildDirById(path.join(comicsDir, sagaDir), chapterId) };
}

function metaRepoPath(loc: MetaLocation, type: "saga" | "chapter") {
  return type === "saga"
    ? `public/comics/${loc.sagaDir}/saga.json`
    : `public/comics/${loc.sagaDir}/${loc.chapterDir}/chapter.json`;
}

function parseJson(content: string): Record<string, unknown> {
  if (!content.trim()) return {};
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function readMeta(loc: MetaLocation, type: "saga" | "chapter") {
  const repoPath = metaRepoPath(loc, type);
  if (useGithubEditorStorage()) {
    const loaded = await loadEditorTextFile(repoPath);
    return { json: parseJson(loaded.content), sha: loaded.sha };
  }
  const full = path.join(process.cwd(), repoPath);
  return { json: fs.existsSync(full) ? parseJson(fs.readFileSync(full, "utf-8")) : {}, sha: null };
}

export async function GET(request: NextRequest) {
  if (!validateEditorApiAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sagaId = request.nextUrl.searchParams.get("sagaId");
  const chapterId = request.nextUrl.searchParams.get("chapterId");
  if (!sagaId) return NextResponse.json({ error: "sagaId required" }, { status: 400 });

  const loc = resolveDirs(sagaId, chapterId || undefined);
  if (!loc) return NextResponse.json({ error: "Saga not found" }, { status: 404 });
  if (chapterId && !loc.chapterDir) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  try {
    const saga = await readMeta(loc, "saga");
    const chapter = loc.chapterDir ? await readMeta(loc, "chapter") : null;
    return NextResponse.json({
      saga: saga.json,
      sagaSha: saga.sha,
      chapter: chapter?.json ?? null,
      chapterSha: chapter?.sha ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: formatGithubApiAuthError(err.message) }, { status: 500 });
  }
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

  const loc = resolveDirs(sagaId, type === "chapter" ? chapterId : undefined);
  if (!loc) return NextResponse.json({ error: "Saga not found" }, { status: 404 });
  if (type === "chapter" && !loc.chapterDir) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  try {
    const parsed =
      type === "saga" ? sagaFieldsSchema.parse(body.fields ?? {}) : chapterFieldsSchema.parse(body.fields ?? {});
    const current = await readMeta(loc, type);
    const json = { ...current.json, ...parsed, cinematic: true };
    const saved = await saveEditorTextFile({
      relativePath: metaRepoPath(loc, type),
      content: `${JSON.stringify(json, null, 2)}\n`,
      sha: typeof body.sha === "string" ? body.sha : current.sha,
      message: `editor: update ${type} ${type === "saga" ? sagaId : chapterId}`,
    });
    return NextResponse.json({ success: true, [type]: json, sha: saved.sha });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return NextResponse.json({ error: "Campos inválidos", details: err.issues }, { status: 400 });
    }
    if (err instanceof GithubConflictError) {
      return NextResponse.json(
        { error: "Alguien guardó esta configuración antes. Recargá el panel y volvé a guardar.", conflict: true },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: formatGithubApiAuthError(err.message) }, { status: 500 });
  }
}
