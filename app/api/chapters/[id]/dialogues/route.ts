import { NextRequest, NextResponse } from "next/server";
import { validateEditorAccess } from "@/lib/editorAccess";
import { formatDialoguesJson } from "@/lib/formatDialoguesJson";
import {
  GithubConflictError,
  dialoguesRepoPath,
  resolveChapterFolders,
  saveEditorTextFile,
} from "@/lib/editorStorage";
import { formatGithubApiAuthError } from "@/lib/githubEditor";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate access
    if (!validateEditorAccess(request, id)) {
      return NextResponse.json({ error: "Unauthorized: Invalid editor password" }, { status: 401 });
    }

    const body = await request.json();
    const { dialogues, sha } = body;

    if (!dialogues) {
      return NextResponse.json({ error: "Missing dialogues data" }, { status: 400 });
    }

    const found = await resolveChapterFolders(id);
    if (!found) {
      return NextResponse.json({ error: "Chapter directory not found" }, { status: 404 });
    }
    const { sagaFolder, chapterFolder } = found;

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

    try {
      const saved = await saveEditorTextFile({
        relativePath: dialoguesRepoPath(sagaFolder, chapterFolder),
        content: compactJson.endsWith("\n") ? compactJson : `${compactJson}\n`,
        sha: typeof sha === "string" ? sha : null,
        message: `editor: save dialogues for ${id}`,
      });
      return NextResponse.json({ success: true, sha: saved.sha });
    } catch (error) {
      if (error instanceof GithubConflictError) {
        return NextResponse.json(
          {
            error: "Hay una versión más nueva en GitHub. Recargá antes de sobrescribir.",
            conflict: true,
            sha: error.currentSha ?? null,
          },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error saving dialogues:", error);
    return NextResponse.json(
      { error: formatGithubApiAuthError(error?.message || "Error al guardar") },
      { status: 500 }
    );
  }
}
