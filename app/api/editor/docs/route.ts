import { NextRequest, NextResponse } from "next/server";
import { validateEditorApiAccess } from "@/lib/editorAccess";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

function buildTree(dirPath: string, relativePath: string): any {
  if (!fs.existsSync(dirPath)) return null;
  
  const stats = fs.statSync(dirPath);
  const name = path.basename(dirPath);

  if (!stats.isDirectory()) {
    if (name.toLowerCase().endsWith(".md")) {
      const cleanName = name
        .replace(/\.md$/i, "")
        .replace(/^\d+[-_]/, "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      
      return {
        name,
        displayName: cleanName,
        path: relativePath.replace(/\\/g, "/"),
        type: "file",
      };
    }
    return null;
  }

  const children: any[] = [];
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const childPath = path.join(dirPath, file);
      const childRelPath = path.join(relativePath, file);
      const childNode = buildTree(childPath, childRelPath);
      if (childNode) {
        children.push(childNode);
      }
    }
  } catch (err) {
    console.error("Error reading dir:", dirPath, err);
  }

  children.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  });

  const displayName = name
    .replace(/^\d+[-_]/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    name,
    displayName,
    path: relativePath.replace(/\\/g, "/"),
    type: "directory",
    children,
  };
}

export async function GET(request: NextRequest) {
  if (!validateEditorApiAccess(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docsDir = path.join(process.cwd(), "docs");

  const fileParam = request.nextUrl.searchParams.get("file");
  if (fileParam) {
    const targetPath = path.resolve(docsDir, fileParam);
    if (!targetPath.startsWith(docsDir)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    try {
      const content = fs.readFileSync(targetPath, "utf-8");
      return NextResponse.json({ content });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  const conceptosPath = path.join(docsDir, "conceptos");
  const guionesPath = path.join(docsDir, "guiones");

  // Create dirs if not exist
  if (!fs.existsSync(conceptosPath)) fs.mkdirSync(conceptosPath, { recursive: true });
  if (!fs.existsSync(guionesPath)) fs.mkdirSync(guionesPath, { recursive: true });

  const conceptosTree = buildTree(conceptosPath, "conceptos");
  const guionesTree = buildTree(guionesPath, "guiones");
  const tree = buildTree(docsDir, "");

  return NextResponse.json({
    tree,
    conceptos: conceptosTree || { name: "conceptos", displayName: "Conceptos", path: "conceptos", type: "directory", children: [] },
    guiones: guionesTree || { name: "guiones", displayName: "Guiones", path: "guiones", type: "directory", children: [] },
  });
}

export async function PUT(request: NextRequest) {
  if (!validateEditorApiAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { file, content } = await request.json();
  if (!file) return NextResponse.json({ error: "File param missing" }, { status: 400 });

  const docsDir = path.join(process.cwd(), "docs");
  const targetPath = path.resolve(docsDir, file);

  if (!targetPath.startsWith(docsDir)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  try {
    fs.writeFileSync(targetPath, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!validateEditorApiAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const { parent, name, type } = await request.json();
  if (!parent || !name || !type) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const docsDir = path.join(process.cwd(), "docs");
  const parentPath = path.resolve(docsDir, parent);

  if (!parentPath.startsWith(docsDir)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  let targetName = name;
  if (type === "file" && !targetName.toLowerCase().endsWith(".md")) {
    targetName += ".md";
  }

  const targetPath = path.join(parentPath, targetName);

  if (fs.existsSync(targetPath)) return NextResponse.json({ error: "Already exists" }, { status: 409 });

  try {
    if (type === "folder") {
      fs.mkdirSync(targetPath, { recursive: true });
    } else {
      fs.writeFileSync(targetPath, "# " + name + "\n", "utf-8");
    }
    return NextResponse.json({ success: true, path: path.join(parent, targetName).replace(/\\/g, "/") });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!validateEditorApiAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { filePath, newName } = await request.json();
  if (!filePath || !newName) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const docsDir = path.join(process.cwd(), "docs");
  const targetPath = path.resolve(docsDir, filePath);

  if (!targetPath.startsWith(docsDir)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  if (!fs.existsSync(targetPath)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isDir = fs.statSync(targetPath).isDirectory();
  let finalNewName = newName;
  if (!isDir && !finalNewName.toLowerCase().endsWith(".md")) {
    finalNewName += ".md";
  }

  const parentDir = path.dirname(targetPath);
  const newPath = path.join(parentDir, finalNewName);

  if (fs.existsSync(newPath)) return NextResponse.json({ error: "Already exists" }, { status: 409 });

  try {
    fs.renameSync(targetPath, newPath);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!validateEditorApiAccess(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filePath = request.nextUrl.searchParams.get("file");
  if (!filePath) return NextResponse.json({ error: "Missing file param" }, { status: 400 });

  const docsDir = path.join(process.cwd(), "docs");
  const targetPath = path.resolve(docsDir, filePath);

  if (!targetPath.startsWith(docsDir)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  if (!fs.existsSync(targetPath)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const isDir = fs.statSync(targetPath).isDirectory();
    if (isDir) {
      const contents = fs.readdirSync(targetPath);
      if (contents.length > 0) return NextResponse.json({ error: "Folder not empty" }, { status: 400 });
      fs.rmdirSync(targetPath);
    } else {
      fs.unlinkSync(targetPath);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
