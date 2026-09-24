import { NextRequest, NextResponse } from "next/server";
import { getDynamicSagas } from "@/lib/serverData";
import { validateEditorAccess } from "@/lib/editorAccess";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate access
    if (!validateEditorAccess(request)) {
      return NextResponse.json({ error: "Unauthorized: Invalid editor password" }, { status: 401 });
    }

    const body = await request.json();
    const { dialogues } = body;

    if (!dialogues) {
      return NextResponse.json({ error: "Missing dialogues data" }, { status: 400 });
    }

    // Find the chapter folder
    const sagas = getDynamicSagas();
    let chapterFolder = "";
    let sagaFolder = "";

    // We search the public/comics directory for folders
    const comicsDir = path.join(process.cwd(), "public", "comics");
    const sagaDirs = fs.readdirSync(comicsDir).filter(f => fs.statSync(path.join(comicsDir, f)).isDirectory());

    for (const sDir of sagaDirs) {
      const sPath = path.join(comicsDir, sDir);
      const chDirs = fs.readdirSync(sPath).filter(f => fs.statSync(path.join(sPath, f)).isDirectory());
      
      // Clean prefix to match ID
      const sClean = sDir.replace(/^\#\d+\s+/, "");
      
      const foundChDir = chDirs.find(cDir => {
        const cClean = cDir.replace(/^\#\d+\s+/, "");
        return cClean === id;
      });

      if (foundChDir) {
        sagaFolder = sDir;
        chapterFolder = foundChDir;
        break;
      }
    }

    if (!chapterFolder || !sagaFolder) {
      return NextResponse.json({ error: "Chapter directory not found" }, { status: 404 });
    }

    const chapterPath = path.join(comicsDir, sagaFolder, chapterFolder);
    const dialoguesFilePath = path.join(chapterPath, "dialogues.json");

    // Clean up dialogues: remove pages that have no dialogues and only default panels
    const cleanedDialogues = JSON.parse(JSON.stringify(dialogues));
    if (cleanedDialogues.pages) {
      for (const [pgKey, pgData] of Object.entries(cleanedDialogues.pages) as any) {
        const panels = pgData.panels || [];
        const hasDialogues = panels.some((p: any) => p.dialogue && p.dialogue.length > 0);
        const hasCustomZoom = panels.some((p: any) => p.zoomRect || (p.zoomRects && p.zoomRects.length > 0));
        const hasCustomSound = panels.some((p: any) => p.sound || p.soundConfig || (p.sounds && p.sounds.length > 0));
        const hasCustomDuration = panels.some((p: any) => p.duration !== undefined);
        
        // A page is considered default/unedited if it has exactly 3 panels, no dialogues, no custom zoom rects, no sounds, no durations, and focusY close to defaults
        const isDefault = panels.length === 3 &&
          !hasCustomZoom &&
          !hasCustomSound &&
          !hasCustomDuration &&
          Math.abs((panels[0].focusY || 0) - 0.15) <= 0.05 &&
          Math.abs((panels[1].focusY || 0) - 0.5) <= 0.1 &&
          Math.abs((panels[2].focusY || 0) - 0.82) <= 0.05;

        if (!hasDialogues && !hasCustomZoom && !hasCustomSound && !hasCustomDuration && (isDefault || panels.length === 0)) {
          delete cleanedDialogues.pages[pgKey];
        } else {
          // Prune redundant dialogue properties to save space and line count
          for (const panel of panels) {
            if (panel.dialogue) {
              panel.dialogue = panel.dialogue.map((line: any) => {
                const pruned = { ...line };
                
                // 1. Remove empty/null speaker
                if (!pruned.speaker) {
                  delete pruned.speaker;
                }
                
                // 2. Remove normal style (default)
                if (pruned.style === "normal") {
                  delete pruned.style;
                }
                
                const style = pruned.style || "normal";
                
                // 3. Remove tail if it's default "bottom-left" or if we have elastic tail and tail is not "none"
                const hasElasticTail = pruned.tailX !== undefined && pruned.tailY !== undefined;
                if (pruned.tail === "bottom-left") {
                  delete pruned.tail;
                } else if (hasElasticTail && pruned.tail !== "none") {
                  delete pruned.tail;
                }
                
                // 4. Remove fontFamily if default for the style
                let defaultFont = "marker";
                if (style === "scream") defaultFont = "bangers";
                else if (style === "electronic") defaultFont = "mono";
                else if (style === "whisper") defaultFont = "marker";
                else if (style === "sfx") defaultFont = "bangers";
                
                if (pruned.fontFamily === defaultFont) {
                  delete pruned.fontFamily;
                }
                
                // 5. Remove customBg if default for the style
                let defaultBg = "#ffffff";
                if (style === "scream") defaultBg = "#f5e642";
                else if (style === "electronic") defaultBg = "rgba(10, 10, 15, 0.9)";
                else if (style === "sfx") defaultBg = "transparent";
                
                if (pruned.customBg === defaultBg) {
                  delete pruned.customBg;
                }
                
                // 6. Remove customColor if default for the style
                let defaultBorder = "#0a0a0f";
                if (style === "whisper") defaultBorder = "#a1a1aa";
                else if (style === "electronic") defaultBorder = "#00f0ff";
                else if (style === "sfx") defaultBorder = "#000000";
                
                if (pruned.customColor === defaultBorder) {
                  delete pruned.customColor;
                }
                
                // 7. Remove textColor if default/close to default
                if (style === "sfx" && pruned.textColor === "#f5e642") {
                  delete pruned.textColor;
                } else if (style === "electronic" && pruned.textColor === "#00f0ff") {
                  delete pruned.textColor;
                } else if (["normal", "thought", "caption", "scream"].includes(style) && 
                           ["#0a0a0f", "#1c1c1c", "#000000"].includes(pruned.textColor)) {
                  delete pruned.textColor;
                }
                
                // 8. Remove size if medium
                if (pruned.size === "medium") {
                  delete pruned.size;
                }
                
                return pruned;
              });
            }
          }
        }
      }
    }

    const compactJson = formatDialoguesJson(cleanedDialogues);

    // Save dialogues JSON to disk
    fs.writeFileSync(dialoguesFilePath, compactJson, "utf-8");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving dialogues:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── JSON Compact Formatting Helpers ─────────────────────────────────────────

function stringifyDialogueCompact(obj: any): string {
  const parts = Object.entries(obj).map(([k, v]) => {
    return `${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  });
  return `{ ${parts.join(", ")} }`;
}

function stringifyZoomRectCompact(obj: any): string {
  return `{ "x": ${obj.x}, "y": ${obj.y}, "w": ${obj.w}, "h": ${obj.h} }`;
}

function formatDialoguesJson(val: any, indent = ""): string {
  if (val === null) return "null";
  if (typeof val === "undefined") return "undefined";
  if (typeof val === "string") return JSON.stringify(val);
  if (typeof val === "number" || typeof val === "boolean") return String(val);

  const nextIndent = indent + "  ";

  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    
    const isDialogueArray = val.every(item => item && typeof item === "object" && "text" in item);
    const isZoomRectArray = val.every(item => item && typeof item === "object" && "x" in item && "w" in item);

    if (isDialogueArray) {
      const items = val.map(item => nextIndent + stringifyDialogueCompact(item));
      return "[\n" + items.join(",\n") + "\n" + indent + "]";
    }
    
    if (isZoomRectArray) {
      const items = val.map(item => nextIndent + stringifyZoomRectCompact(item));
      return "[\n" + items.join(",\n") + "\n" + indent + "]";
    }

    const items = val.map(item => formatDialoguesJson(item, nextIndent));
    return "[\n" + items.map(item => nextIndent + item).join(",\n") + "\n" + indent + "]";
  }

  if (typeof val === "object") {
    const keys = Object.keys(val);
    if (keys.length === 0) return "{}";

    const parts = keys.map(k => {
      const valueStr = formatDialoguesJson(val[k], nextIndent);
      return nextIndent + JSON.stringify(k) + ": " + valueStr;
    });
    return "{\n" + parts.join(",\n") + "\n" + indent + "}";
  }

  return JSON.stringify(val);
}
