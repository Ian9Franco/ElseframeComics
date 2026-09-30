"use client";

import { useCallback, useRef, useState } from "react";
import type { DialogueLine } from "@/components/reader/DialogueBubble";
import type { Dialogues, PageData, PanelStop } from "@/components/reader/audioPlayer";
import { createDialogueLine } from "@/components/reader/dialogueDefaults";
import { snapMaskRect } from "@/components/reader/readerUtils";
import type { BubbleStylePreset, Selection } from "./types";

const MAX_HISTORY = 50;

function cloneDialogues(d: Dialogues): Dialogues {
  return JSON.parse(JSON.stringify(d)) as Dialogues;
}

export function useEditorV2Store(
  localDialogues: Dialogues,
  setLocalDialogues: React.Dispatch<React.SetStateAction<Dialogues>>,
  pageKey: string
) {
  const [past, setPast] = useState<Dialogues[]>([]);
  const [future, setFuture] = useState<Dialogues[]>([]);
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [activeTool, setActiveTool] = useState<import("./types").EditorV2Tool>("select");
  const [pendingBubbleStyle, setPendingBubbleStyle] = useState<BubbleStylePreset>("normal");
  const clipboardRef = useRef<{ panelIdx: number; line: DialogueLine }[]>([]);

  const patchLive = useCallback(
    (recipe: (d: Dialogues) => Dialogues) => {
      setLocalDialogues(recipe);
    },
    [setLocalDialogues]
  );

  const beginGesture = useCallback(() => {
    setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), cloneDialogues(localDialogues)]);
    setFuture([]);
  }, [localDialogues]);

  const endGesture = useCallback(() => {
    /* gesture ended; localStorage backup handled by useDialogueEditor */
  }, []);

  const commit = useCallback(
    (next: Dialogues) => {
      setPast((p) => [...p.slice(-(MAX_HISTORY - 1)), cloneDialogues(localDialogues)]);
      setFuture([]);
      setLocalDialogues(next);
    },
    [localDialogues, setLocalDialogues]
  );

  const getPage = useCallback((): PageData => {
    return localDialogues.pages?.[pageKey] || { panels: [] };
  }, [localDialogues, pageKey]);

  const updatePages = useCallback(
    (updater: (page: PageData) => PageData) => {
      const current = getPage();
      const updated = updater({ ...current, panels: [...(current.panels || [])] });
      commit({
        ...localDialogues,
        pages: { ...localDialogues.pages, [pageKey]: updated },
      });
    },
    [commit, getPage, localDialogues, pageKey]
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    setPast((p) => p.slice(0, -1));
    setFuture((f) => [cloneDialogues(localDialogues), ...f].slice(0, MAX_HISTORY));
    setLocalDialogues(prev);
    setSelection({ kind: "none" });
  }, [past, localDialogues, setLocalDialogues]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((f) => f.slice(1));
    setPast((p) => [...p, cloneDialogues(localDialogues)]);
    setLocalDialogues(next);
  }, [future, localDialogues, setLocalDialogues]);

  const addPanelWithMask = useCallback(
    (rect: { x: number; y: number; w: number; h: number }) => {
      updatePages((page) => {
        const panels = [...(page.panels || [])];
        const count = panels.length;
        let defaultFocusY = 0.5;
        if (count === 0) defaultFocusY = 0.2;
        else if (count === 1) defaultFocusY = 0.5;
        else if (count === 2) defaultFocusY = 0.8;
        else defaultFocusY = Math.min(0.95, 0.8 + (count - 2) * 0.08);

        const snapped = snapMaskRect(rect, panels.flatMap((p) => p.zoomRects || (p.zoomRect ? [p.zoomRect] : [])));
        panels.push({
          focusY: defaultFocusY,
          dialogue: [],
          zoomRects: [snapped],
        });
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const addBubble = useCallback(
    (
      panelIdx: number,
      pos: { posX: number; posY: number },
      style: BubbleStylePreset = "normal"
    ) => {
      updatePages((page) => {
        const panels = [...(page.panels || [])];
        if (panels.length === 0) {
          panels.push({ focusY: pos.posY / 100, dialogue: [], zoomRects: [{ x: 5, y: 5, w: 90, h: 90 }] });
        }
        const pIdx = Math.min(panelIdx, panels.length - 1);
        const panel = { ...panels[pIdx], dialogue: [...(panels[pIdx].dialogue || [])] };
        const line = createDialogueLine(
          {
            text: style === "cinematic" ? "HONORARTE" : style === "caption" ? "Texto..." : "",
            style,
            posX: pos.posX,
            posY: pos.posY,
            tail: style === "cinematic" || style === "caption" ? "none" : undefined,
          },
          "standard"
        );
        panel.dialogue.push(line);
        panels[pIdx] = panel;
        const bIdx = panel.dialogue.length - 1;
        setSelection({ kind: "bubble", panelIdx: pIdx, bubbleIdx: bIdx });
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const updateBubble = useCallback(
    (panelIdx: number, bubbleIdx: number, fields: Partial<DialogueLine>) => {
      updatePages((page) => {
        const panels = [...(page.panels || [])];
        const panel = { ...panels[panelIdx] };
        const dialogue = [...(panel.dialogue || [])];
        dialogue[bubbleIdx] = { ...dialogue[bubbleIdx], ...fields };
        panel.dialogue = dialogue;
        panels[panelIdx] = panel;
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const removeBubble = useCallback(
    (panelIdx: number, bubbleIdx: number) => {
      updatePages((page) => {
        const panels = [...(page.panels || [])];
        const panel = { ...panels[panelIdx] };
        const dialogue = (panel.dialogue || []).filter((_, i) => i !== bubbleIdx);
        panel.dialogue = dialogue.map((bub) => {
          if (bub.linkedTo === undefined) return bub;
          if (bub.linkedTo === bubbleIdx) return { ...bub, linkedTo: undefined };
          if (bub.linkedTo > bubbleIdx) return { ...bub, linkedTo: bub.linkedTo - 1 };
          return bub;
        });
        panels[panelIdx] = panel;
        setSelection({ kind: "none" });
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const duplicateBubble = useCallback(
    (panelIdx: number, bubbleIdx: number) => {
      updatePages((page) => {
        const panels = [...(page.panels || [])];
        const panel = { ...panels[panelIdx] };
        const dialogue = [...(panel.dialogue || [])];
        const source = dialogue[bubbleIdx];
        if (!source) return page;
        const dup: DialogueLine = {
          ...JSON.parse(JSON.stringify(source)),
          posX: Math.min(100, (source.posX ?? 50) + 3),
          posY: Math.min(100, (source.posY ?? 50) + 3),
        };
        dialogue.splice(bubbleIdx + 1, 0, dup);
        panel.dialogue = dialogue;
        panels[panelIdx] = panel;
        setSelection({ kind: "bubble", panelIdx, bubbleIdx: bubbleIdx + 1 });
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const reorderPanels = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      updatePages((page) => {
        const panels = [...(page.panels || [])];
        const [removed] = panels.splice(from, 1);
        panels.splice(to, 0, removed);
        setSelection({ kind: "stop", panelIdx: to });
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const updatePanel = useCallback(
    (panelIdx: number, updates: Partial<PanelStop>) => {
      updatePages((page) => {
        const panels = [...(page.panels || [])];
        panels[panelIdx] = { ...panels[panelIdx], ...updates };
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const updateMaskRect = useCallback(
    (panelIdx: number, rectIdx: number, rect: { x: number; y: number; w: number; h: number }) => {
      updatePages((page) => {
        const panels = [...(page.panels || [])];
        const panel = { ...panels[panelIdx] };
        const rects = panel.zoomRects ? [...panel.zoomRects] : panel.zoomRect ? [{ ...panel.zoomRect }] : [];
        const others = rects.filter((_, i) => i !== rectIdx);
        rects[rectIdx] = snapMaskRect(rect, others);
        panel.zoomRects = rects;
        panel.zoomRect = undefined;
        panels[panelIdx] = panel;
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const assignBubbleToPanelByPosition = useCallback(
    (bubblePanelIdx: number, bubbleIdx: number, targetPanelIdx: number) => {
      if (bubblePanelIdx === targetPanelIdx) return;
      updatePages((page) => {
        const panels = (page.panels || []).map((p) => ({ ...p, dialogue: [...(p.dialogue || [])] }));
        const from = panels[bubblePanelIdx];
        const to = panels[targetPanelIdx];
        if (!from?.dialogue?.[bubbleIdx] || !to) return page;
        const [line] = from.dialogue.splice(bubbleIdx, 1);
        to.dialogue.push(line);
        setSelection({ kind: "bubble", panelIdx: targetPanelIdx, bubbleIdx: to.dialogue.length - 1 });
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const findPanelForPoint = useCallback(
    (posX: number, posY: number): number => {
      const panels = getPage().panels || [];
      for (let i = 0; i < panels.length; i++) {
        const rects = panels[i].zoomRects || (panels[i].zoomRect ? [panels[i].zoomRect!] : []);
        for (const r of rects) {
          if (posX >= r.x && posX <= r.x + r.w && posY >= r.y && posY <= r.y + r.h) return i;
        }
      }
      return panels.length > 0 ? 0 : -1;
    },
    [getPage]
  );

  const copySelection = useCallback(() => {
    if (selection.kind === "bubble") {
      const line = getPage().panels?.[selection.panelIdx]?.dialogue?.[selection.bubbleIdx];
      if (line) clipboardRef.current = [{ panelIdx: selection.panelIdx, line: JSON.parse(JSON.stringify(line)) as DialogueLine }];
    } else if (selection.kind === "bubbles") {
      clipboardRef.current = selection.items
        .map(({ panelIdx, bubbleIdx }) => {
          const line = getPage().panels?.[panelIdx]?.dialogue?.[bubbleIdx];
          return line ? { panelIdx, line: JSON.parse(JSON.stringify(line)) as DialogueLine } : null;
        })
        .filter(Boolean) as { panelIdx: number; line: DialogueLine }[];
    }
  }, [getPage, selection]);

  const pasteClipboard = useCallback(
    (panelIdx: number, pos: { posX: number; posY: number }) => {
      const items = clipboardRef.current;
      if (items.length === 0) return;
      updatePages((page) => {
        const panels = [...(page.panels || [])];
        if (panels.length === 0) {
          panels.push({ focusY: 0.5, dialogue: [], zoomRects: [{ x: 5, y: 5, w: 90, h: 90 }] });
        }
        const pIdx = Math.min(panelIdx >= 0 ? panelIdx : 0, panels.length - 1);
        const panel = { ...panels[pIdx], dialogue: [...(panels[pIdx].dialogue || [])] };
        let lastIdx = panel.dialogue.length;
        items.forEach((item, i) => {
          const line = JSON.parse(JSON.stringify(item.line)) as DialogueLine;
          line.posX = pos.posX + i * 3;
          line.posY = pos.posY + i * 3;
          panel.dialogue.push(line);
          lastIdx = panel.dialogue.length - 1;
        });
        panels[pIdx] = panel;
        setSelection({ kind: "bubble", panelIdx: pIdx, bubbleIdx: lastIdx });
        return { ...page, panels };
      });
    },
    [updatePages]
  );

  const updateSettings = useCallback(
    (updates: Partial<NonNullable<Dialogues["settings"]>>) => {
      commit({
        ...localDialogues,
        settings: { ...(localDialogues.settings || {}), ...updates },
      });
    },
    [commit, localDialogues]
  );

  const updateAudioTracks = useCallback(
    (tracks: NonNullable<Dialogues["audioTracks"]>) => {
      commit({ ...localDialogues, audioTracks: tracks });
    },
    [commit, localDialogues]
  );

  const updateBubbleLive = useCallback(
    (panelIdx: number, bubbleIdx: number, fields: Partial<DialogueLine>) => {
      patchLive((prev) => {
        const page = prev.pages?.[pageKey] || { panels: [] };
        const panels = [...(page.panels || [])];
        const panel = { ...panels[panelIdx] };
        const dialogue = [...(panel.dialogue || [])];
        dialogue[bubbleIdx] = { ...dialogue[bubbleIdx], ...fields };
        panel.dialogue = dialogue;
        panels[panelIdx] = panel;
        return { ...prev, pages: { ...prev.pages, [pageKey]: { ...page, panels } } };
      });
    },
    [pageKey, patchLive]
  );

  return {
    selection,
    setSelection,
    activeTool,
    setActiveTool,
    pendingBubbleStyle,
    setPendingBubbleStyle,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    getPage,
    addPanelWithMask,
    addBubble,
    updateBubble,
    updateBubbleLive,
    removeBubble,
    duplicateBubble,
    reorderPanels,
    updatePanel,
    updateMaskRect,
    assignBubbleToPanelByPosition,
    findPanelForPoint,
    copySelection,
    pasteClipboard,
    updateSettings,
    updateAudioTracks,
    commitDialogues: commit,
    patchLive,
    beginGesture,
  };
}
