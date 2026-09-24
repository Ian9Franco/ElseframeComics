import { NextRequest, NextResponse } from "next/server";
import { getDynamicSagas, getAssetsComicsDir } from "@/lib/serverData";
import { validateEditorApiAccess } from "@/lib/editorAccess";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const ASSETS_COMICS_DIR = getAssetsComicsDir();

export async function POST(request: NextRequest) {
  if (!validateEditorApiAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, sagaId, name, number, title, color } = body;

  const comicsDir = path.join(process.cwd(), "public", "comics");
  if (!fs.existsSync(comicsDir)) fs.mkdirSync(comicsDir, { recursive: true });

  if (type === "saga") {
    const dirName = `#${number} ${name}`;
    const targetPath = path.join(comicsDir, dirName);
    const adjacentPath = path.join(ASSETS_COMICS_DIR, dirName);

    if (fs.existsSync(targetPath)) return NextResponse.json({ error: "Already exists" }, { status: 409 });

    try {
      fs.mkdirSync(targetPath, { recursive: true });
      if (fs.existsSync(ASSETS_COMICS_DIR)) {
        if (!fs.existsSync(adjacentPath)) fs.mkdirSync(adjacentPath, { recursive: true });
      }

      const sagaJson = {
        title: title || name,
        tagline: "",
        description: "",
        color: color || "#0a0a0f",
        status: "draft",
        cinematic: true,
        order: Number(number)
      };
      fs.writeFileSync(path.join(targetPath, "saga.json"), JSON.stringify(sagaJson, null, 2));
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  } else if (type === "chapter") {
    const sagas = getDynamicSagas();
    const targetSaga = sagas.find(s => s.id === sagaId);
    if (!targetSaga) return NextResponse.json({ error: "Saga not found" }, { status: 404 });

    const sagaDirs = fs.readdirSync(comicsDir);
    const sagaDirName = sagaDirs.find(d => {
      const match = d.match(/^(?:#)?(\d+)[-_. ]+(.*)$/);
      return match && match[2] === targetSaga.id;
    });

    if (!sagaDirName) return NextResponse.json({ error: "Saga directory not found" }, { status: 404 });

    const chapterDirName = `#${number} ${name}`;
    const targetPath = path.join(comicsDir, sagaDirName, chapterDirName);
    const adjacentPath = path.join(ASSETS_COMICS_DIR, sagaDirName, chapterDirName);

    if (fs.existsSync(targetPath)) return NextResponse.json({ error: "Already exists" }, { status: 409 });

    try {
      fs.mkdirSync(targetPath, { recursive: true });
      if (fs.existsSync(path.join(ASSETS_COMICS_DIR, sagaDirName))) {
        if (!fs.existsSync(adjacentPath)) fs.mkdirSync(adjacentPath, { recursive: true });
      }

      const chapterJson = {
        title: title || name,
        number: Number(number),
        status: "draft"
      };
      fs.writeFileSync(path.join(targetPath, "chapter.json"), JSON.stringify(chapterJson, null, 2));
      fs.writeFileSync(path.join(targetPath, "dialogues.json"), JSON.stringify({pages: {}}, null, 2));
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function PATCH(request: NextRequest) {
  if (!validateEditorApiAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { type, sagaId, chapterId, newName, newNumber, newTitle } = body;

  const comicsDir = path.join(process.cwd(), "public", "comics");

  if (type === "saga") {
    const sagas = getDynamicSagas();
    const targetSaga = sagas.find(s => s.id === sagaId);
    if (!targetSaga) return NextResponse.json({ error: "Saga not found" }, { status: 404 });

    const sagaDirs = fs.readdirSync(comicsDir);
    const sagaDirName = sagaDirs.find(d => {
      const match = d.match(/^(?:#)?(\d+)[-_. ]+(.*)$/);
      return match && match[2] === targetSaga.id;
    });

    if (!sagaDirName) return NextResponse.json({ error: "Saga directory not found" }, { status: 404 });

    const oldPath = path.join(comicsDir, sagaDirName);
    const adjacentOldPath = path.join(ASSETS_COMICS_DIR, sagaDirName);

    const finalName = newName || targetSaga.id;
    const finalNumber = newNumber || targetSaga.order;
    const newDirName = `#${finalNumber} ${finalName}`;
    const newPath = path.join(comicsDir, newDirName);
    const adjacentNewPath = path.join(ASSETS_COMICS_DIR, newDirName);

    try {
      if (oldPath !== newPath) {
        if (fs.existsSync(newPath)) return NextResponse.json({ error: "New saga name already exists" }, { status: 409 });
        fs.renameSync(oldPath, newPath);
        if (fs.existsSync(adjacentOldPath)) {
          fs.renameSync(adjacentOldPath, adjacentNewPath);
        }
      }

      const jsonPath = path.join(newPath, "saga.json");
      if (fs.existsSync(jsonPath)) {
        const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        if (newTitle) json.title = newTitle;
        if (newNumber) json.order = Number(newNumber);
        fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
      }

      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }

  } else if (type === "chapter") {
    const sagas = getDynamicSagas();
    const targetSaga = sagas.find(s => s.id === sagaId);
    if (!targetSaga) return NextResponse.json({ error: "Saga not found" }, { status: 404 });

    const targetChapter = targetSaga.chapters.find(c => c.id === chapterId);
    if (!targetChapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

    const sagaDirs = fs.readdirSync(comicsDir);
    const sagaDirName = sagaDirs.find(d => {
      const match = d.match(/^(?:#)?(\d+)[-_. ]+(.*)$/);
      return match && match[2] === targetSaga.id;
    });

    if (!sagaDirName) return NextResponse.json({ error: "Saga directory not found" }, { status: 404 });

    const sagaPath = path.join(comicsDir, sagaDirName);
    const chapterDirs = fs.readdirSync(sagaPath);
    const chapterDirName = chapterDirs.find(d => {
      const match = d.match(/^(?:#)?(\d+)[-_. ]+(.*)$/);
      return match && match[2] === targetChapter.id;
    });

    if (!chapterDirName) return NextResponse.json({ error: "Chapter directory not found" }, { status: 404 });

    const oldPath = path.join(sagaPath, chapterDirName);
    const adjacentOldPath = path.join(ASSETS_COMICS_DIR, sagaDirName, chapterDirName);

    const finalName = newName || targetChapter.id;
    const finalNumber = newNumber || targetChapter.number;
    const newDirName = `#${finalNumber} ${finalName}`;
    const newPath = path.join(sagaPath, newDirName);
    const adjacentNewPath = path.join(ASSETS_COMICS_DIR, sagaDirName, newDirName);

    try {
      if (oldPath !== newPath) {
        if (fs.existsSync(newPath)) return NextResponse.json({ error: "New chapter name already exists" }, { status: 409 });
        fs.renameSync(oldPath, newPath);
        if (fs.existsSync(adjacentOldPath)) {
          fs.renameSync(adjacentOldPath, adjacentNewPath);
        }
      }

      const jsonPath = path.join(newPath, "chapter.json");
      if (fs.existsSync(jsonPath)) {
        const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
        if (newTitle) json.title = newTitle;
        if (newNumber) json.number = Number(newNumber);
        fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2));
      }

      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
