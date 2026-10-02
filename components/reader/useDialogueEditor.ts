"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { DialogueLine } from "./DialogueBubble";
import type { Dialogues, PageData, PanelStop as PanelConfig, ChapterSettings, AudioTrack } from "./audioPlayer";
import type { AiDialogueProposal } from "./dialogueAi";
import { createDialogueLine } from "./dialogueDefaults";
import { snapMaskRect } from "./readerUtils";

interface UseDialogueEditorProps {
  dialogues: Dialogues | null;
  dialoguesSha?: string | null;
  chapterId: string;
  pageKey: string;
  imgRef: React.RefObject<HTMLImageElement | null>;
}

/**
 * useDialogueEditor Hook
 * Manages local copy of dialogues, editor state variables (active panel, active bubble),
 * undo/redo stack, saving changes to the API, dragging and aligning bubbles on the grid,
 * and chapter-wide settings updates.
 */
export function useDialogueEditor({
  dialogues,
  dialoguesSha = null,
  chapterId,
  pageKey,
  imgRef,
}: UseDialogueEditorProps) {
  // Dialogues Local Copy for Editing
  const [localDialogues, setLocalDialogues] = useState<Dialogues>({ pages: {} });

  // Editor States
  const [activeLayer, setActiveLayer] = useState<"paradas" | "mascaras" | "dialogos">("dialogos");
  const [activePanelIdx, setActivePanelIdx] = useState(0);
  const [activeBubbleIdx, setActiveBubbleIdx] = useState<number | null>(null);
  const [undoStack, setUndoStack] = useState<Dialogues[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error" | "conflict">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Grid and Snapping States
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(5); // step size in percentage (e.g. 5%)

  // Preset Mode (standard vs custom)
  const [presetMode, setPresetMode] = useState<"standard" | "custom">("standard");

  // Local Storage Backup & Unsaved Changes States
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasLocalBackup, setHasLocalBackup] = useState(false);
  const [backupTimestamp, setBackupTimestamp] = useState<number | null>(null);
  const [workspaceSha, setWorkspaceSha] = useState<string | null>(dialoguesSha ?? null);

  const isInitialLoadRef = React.useRef(true);

  useEffect(() => {
    setWorkspaceSha(dialoguesSha ?? null);
  }, [dialoguesSha, chapterId]);

  // Initialize dialogues copy & check for existing localStorage backup
  useEffect(() => {
    if (dialogues) {
      setLocalDialogues(dialogues);
    } else {
      setLocalDialogues({ pages: {} });
    }
    isInitialLoadRef.current = true;
    setHasUnsavedChanges(false);

    // Check if a backup exists for this chapter
    if (typeof window !== "undefined" && chapterId) {
      const backupKey = `dialogues_backup_${chapterId}`;
      try {
        const savedBackupStr = localStorage.getItem(backupKey);
        if (savedBackupStr) {
          const parsed = JSON.parse(savedBackupStr);
          if (parsed && parsed.data && parsed.timestamp) {
            setHasLocalBackup(true);
            setBackupTimestamp(parsed.timestamp);
          }
        } else {
          setHasLocalBackup(false);
          setBackupTimestamp(null);
        }
      } catch (e) {
        console.error("Error reading dialogues backup from localStorage", e);
      }
    }
  }, [dialogues, chapterId]);

  // Auto-save to localStorage whenever localDialogues changes
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (typeof window === "undefined" || !chapterId) return;

    setHasUnsavedChanges(true);
    setSaveStatus("idle");
    setSaveMessage(null);

    const backupKey = `dialogues_backup_${chapterId}`;
    const timer = setTimeout(() => {
      try {
        const now = Date.now();
        localStorage.setItem(
          backupKey,
          JSON.stringify({
            data: localDialogues,
            timestamp: now,
          })
        );
        setHasLocalBackup(true);
        setBackupTimestamp(now);
      } catch (e) {
        console.error("Error saving dialogues backup to localStorage:", e);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [localDialogues, chapterId]);

  // Prevent accidental page refresh / navigation when unsaved changes exist
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Tienes cambios sin guardar en los diálogos. ¿Seguro que deseas salir o refrescar?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Restore backup from localStorage
  const restoreLocalBackup = useCallback(() => {
    if (typeof window === "undefined" || !chapterId) return;
    const backupKey = `dialogues_backup_${chapterId}`;
    try {
      const savedBackupStr = localStorage.getItem(backupKey);
      if (savedBackupStr) {
        const parsed = JSON.parse(savedBackupStr);
        if (parsed && parsed.data) {
          setLocalDialogues(parsed.data);
          setHasUnsavedChanges(true);
          setSaveStatus("idle");
        }
      }
    } catch (e) {
      console.error("Error restoring local backup:", e);
    }
  }, [chapterId]);

  // Discard backup from localStorage
  const discardLocalBackup = useCallback(() => {
    if (typeof window === "undefined" || !chapterId) return;
    const backupKey = `dialogues_backup_${chapterId}`;
    try {
      localStorage.removeItem(backupKey);
      setHasLocalBackup(false);
      setBackupTimestamp(null);
      setHasUnsavedChanges(false);
      if (dialogues) {
        setLocalDialogues(dialogues);
      }
    } catch (e) {
      console.error("Error discarding local backup:", e);
    }
  }, [chapterId, dialogues]);

  // History stack handlers
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setLocalDialogues(previousState);
    setActiveBubbleIdx(null);
  }, [undoStack, localDialogues]);

  const pgKey = pageKey;
  const currentPageData = localDialogues.pages?.[pgKey] || { panels: [] };

  const updateDialoguesState = (newPages: Record<string, PageData>) => {
    // Save snapshot before mutating
    setUndoStack((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(localDialogues))]);
    setLocalDialogues((prev) => ({
      ...prev,
      pages: newPages,
    }));
  };

  const updateDialoguesStateNoUndo = (newPages: Record<string, PageData>) => {
    setLocalDialogues((prev) => ({
      ...prev,
      pages: newPages,
    }));
  };

  const handleAddPanel = () => {
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    const count = (pg.panels || []).length;

    let defaultFocusY = 0.5;
    if (count === 0) defaultFocusY = 0.2;
    else if (count === 1) defaultFocusY = 0.5;
    else if (count === 2) defaultFocusY = 0.8;
    else defaultFocusY = Math.min(0.95, 0.8 + (count - 2) * 0.08);

    pg.panels = [...(pg.panels || []), { focusY: defaultFocusY, dialogue: [] }];
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);
    setActivePanelIdx(pg.panels.length - 1);
    setActiveBubbleIdx(null);
  };

  const handleRemovePanel = (pIdx: number) => {
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    pg.panels = (pg.panels || []).filter((_, idx) => idx !== pIdx);
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);
    setActivePanelIdx(Math.max(0, pIdx - 1));
    setActiveBubbleIdx(null);
  };

  const handleUpdatePanelParams = (pIdx: number, updates: Partial<PanelConfig>) => {
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    pg.panels = (pg.panels || []).map((p, idx) => (idx === pIdx ? { ...p, ...updates } : p));
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);
  };

  const handleAddBubble = (pIdx: number, defaultPosition?: { posX: number; posY: number }, defaultStyle: "normal" | "caption" | "cinematic" = "normal") => {
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    const panelsCopy = [...(pg.panels || [])];
    const targetPanel = { ...panelsCopy[pIdx] };
    const dialoguesCopy = targetPanel.dialogue ? [...targetPanel.dialogue] : [];

    const posX = defaultPosition ? defaultPosition.posX : 50;
    const posY = defaultPosition ? defaultPosition.posY : Math.round(targetPanel.focusY * 100);

    const isCaption = defaultStyle === "caption";
    const isCinematic = defaultStyle === "cinematic";

    dialoguesCopy.push(createDialogueLine({
      text: isCinematic ? "HONORARTE" : isCaption ? "Texto de la narración..." : "Nuevo diálogo",
      style: defaultStyle,
      posX,
      posY,
      tail: isCinematic || isCaption ? "none" : undefined,
    }, presetMode));

    targetPanel.dialogue = dialoguesCopy;
    panelsCopy[pIdx] = targetPanel;
    pg.panels = panelsCopy;
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);

    setActivePanelIdx(pIdx);
    setActiveBubbleIdx(dialoguesCopy.length - 1);
  };

  const handleApplyGeneratedDialogues = (proposals: AiDialogueProposal[]) => {
    if (proposals.length === 0) return;

    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    const panelsCopy = (pg.panels || []).map((panel) => ({
      ...panel,
      dialogue: panel.dialogue ? [...panel.dialogue] : [],
    }));

    let lastApplied: { panelIndex: number; bubbleIndex: number } | null = null;
    for (const proposal of proposals) {
      const targetPanel = panelsCopy[proposal.panelIndex];
      if (!targetPanel) continue;

      const toPercentage = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 100);
      const line = createDialogueLine({
        text: proposal.text,
        speaker: proposal.speaker,
        showSpeakerName: proposal.showSpeakerName,
        offscreen: proposal.offscreen,
        style: proposal.style,
        tail: proposal.tail,
        posX: toPercentage(proposal.posX),
        posY: toPercentage(proposal.posY),
        size: proposal.size,
        tailX: proposal.tailX === null ? undefined : toPercentage(proposal.tailX),
        tailY: proposal.tailY === null ? undefined : toPercentage(proposal.tailY),
      }, presetMode);

      const dialogue = targetPanel.dialogue || [];
      targetPanel.dialogue = [...dialogue, line];
      lastApplied = {
        panelIndex: proposal.panelIndex,
        bubbleIndex: targetPanel.dialogue.length - 1,
      };
    }

    if (!lastApplied) return;
    pg.panels = panelsCopy;
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);
    setActivePanelIdx(lastApplied.panelIndex);
    setActiveBubbleIdx(lastApplied.bubbleIndex);
  };

  const handleUpdateBubble = (pIdx: number, bIdx: number, fields: Partial<DialogueLine>) => {
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    const panelsCopy = [...(pg.panels || [])];
    const targetPanel = { ...panelsCopy[pIdx] };
    const dialoguesCopy = targetPanel.dialogue ? [...targetPanel.dialogue] : [];

    dialoguesCopy[bIdx] = {
      ...dialoguesCopy[bIdx],
      ...fields,
    };

    targetPanel.dialogue = dialoguesCopy;
    panelsCopy[pIdx] = targetPanel;
    pg.panels = panelsCopy;
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);
  };

  const handleRemoveBubble = (pIdx: number, bIdx: number) => {
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    const panelsCopy = [...(pg.panels || [])];
    const targetPanel = { ...panelsCopy[pIdx] };
    const dialoguesCopy = targetPanel.dialogue ? [...targetPanel.dialogue] : [];

    const filteredDialogues = dialoguesCopy.filter((_, idx) => idx !== bIdx);

    // Adjust linkedTo references
    const adjustedDialogues = filteredDialogues.map((bub) => {
      if (bub.linkedTo === undefined) return bub;
      if (bub.linkedTo === bIdx) {
        return { ...bub, linkedTo: undefined };
      }
      if (bub.linkedTo > bIdx) {
        return { ...bub, linkedTo: bub.linkedTo - 1 };
      }
      return bub;
    });

    targetPanel.dialogue = adjustedDialogues;
    panelsCopy[pIdx] = targetPanel;
    pg.panels = panelsCopy;
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);

    setActiveBubbleIdx(null);
  };

  const handleDuplicateBubble = (pIdx: number, bIdx: number) => {
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    const panelsCopy = [...(pg.panels || [])];
    const targetPanel = { ...panelsCopy[pIdx] };
    const dialoguesCopy = targetPanel.dialogue ? [...targetPanel.dialogue] : [];

    const sourceBubble = dialoguesCopy[bIdx];
    if (!sourceBubble) return;

    // Create duplicate with identical properties, tails, and layout but empty inner text
    const duplicatedBubble: DialogueLine = {
      ...JSON.parse(JSON.stringify(sourceBubble)),
      text: "",
      posX: sourceBubble.posX !== undefined ? Math.min(100, Math.max(0, sourceBubble.posX + 3)) : 53,
      posY: sourceBubble.posY !== undefined ? Math.min(100, Math.max(0, sourceBubble.posY + 3)) : 53,
    };

    if (sourceBubble.tailX !== undefined) {
      duplicatedBubble.tailX = Math.min(100, Math.max(0, sourceBubble.tailX + 3));
    }
    if (sourceBubble.tailY !== undefined) {
      duplicatedBubble.tailY = Math.min(100, Math.max(0, sourceBubble.tailY + 3));
    }

    dialoguesCopy.splice(bIdx + 1, 0, duplicatedBubble);

    targetPanel.dialogue = dialoguesCopy;
    panelsCopy[pIdx] = targetPanel;
    pg.panels = panelsCopy;
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);

    setActivePanelIdx(pIdx);
    setActiveBubbleIdx(bIdx + 1);
  };

  const handleUpdateSettings = (updates: Partial<ChapterSettings>) => {
    setUndoStack((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(localDialogues))]);
    setLocalDialogues((prev) => ({
      ...prev,
      settings: {
        ...(prev.settings || {}),
        ...updates,
      },
    }));
  };

  /**
   * Replaces the entire audioTracks array in localDialogues.
   * Supports undo like all other state mutations.
   */
  const handleUpdateAudioTracks = (tracks: AudioTrack[]) => {
    setUndoStack((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(localDialogues))]);
    setLocalDialogues((prev) => ({
      ...prev,
      audioTracks: tracks,
    }));
  };

  const handleDragEnd = (info: any, pIdx: number, bIdx: number) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const pg = localDialogues.pages?.[pageKey] || { panels: [] };
    const panel = pg.panels?.[pIdx];
    const line = panel?.dialogue?.[bIdx];
    if (!panel || !line) return;

    const startX = line.posX ?? 50;
    const startY = line.posY ?? Math.round((panel.focusY ?? 0.5) * 100);

    // Use the dragged distance instead of the pointer position. Large cinematic text
    // can be grabbed from an edge, so treating the pointer as the center makes it jump.
    let relativeX = startX + (info.offset.x / rect.width) * 100;
    let relativeY = startY + (info.offset.y / rect.height) * 100;

    // Apply grid snapping if enabled
    if (snapToGrid) {
      relativeX = Math.round(relativeX / gridSize) * gridSize;
      relativeY = Math.round(relativeY / gridSize) * gridSize;
    }

    handleUpdateBubble(pIdx, bIdx, {
      posX: Math.max(-20, Math.min(120, Math.round(relativeX))),
      posY: Math.max(-20, Math.min(120, Math.round(relativeY))),
    });
  };

  const handleTailTargetDragEnd = (info: any, pIdx: number, bIdx: number) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const pg = localDialogues.pages?.[pageKey] || { panels: [] };
    const panel = pg.panels?.[pIdx];
    const line = panel?.dialogue?.[bIdx];
    if (!panel || !line) return;

    const startX = line.tailX ?? 50;
    const startY = line.tailY ?? (Math.round((panel.focusY ?? 0.5) * 100) + 15);

    // Calculate relative percentage change based on drag offset instead of absolute screen coordinates
    let relativeX = startX + (info.offset.x / rect.width) * 100;
    let relativeY = startY + (info.offset.y / rect.height) * 100;

    // Apply grid snapping if enabled
    if (snapToGrid) {
      relativeX = Math.round(relativeX / gridSize) * gridSize;
      relativeY = Math.round(relativeY / gridSize) * gridSize;
    }

    handleUpdateBubble(pIdx, bIdx, {
      tailX: Math.max(-20, Math.min(120, Math.round(relativeX))),
      tailY: Math.max(-20, Math.min(120, Math.round(relativeY))),
    });
  };

  const handlePanelRectDragEnd = (info: any, pIdx: number, rIdx: number) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const deltaXPercent = (info.offset.x / rect.width) * 100;
    const deltaYPercent = (info.offset.y / rect.height) * 100;

    const pg = localDialogues.pages?.[pageKey] || { panels: [] };
    const panelsCopy = [...(pg.panels || [])];
    const targetPanel = { ...panelsCopy[pIdx] };
    const rects = targetPanel.zoomRects ? [...targetPanel.zoomRects] : targetPanel.zoomRect ? [{...targetPanel.zoomRect}] : [];
    
    if (rects[rIdx]) {
      let newX = rects[rIdx].x + deltaXPercent;
      let newY = rects[rIdx].y + deltaYPercent;

      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      } else {
        newX = Math.round(newX);
        newY = Math.round(newY);
      }

      const otherRects = rects.filter((_, idx) => idx !== rIdx);
      const snapped = snapMaskRect({ ...rects[rIdx], x: newX, y: newY }, otherRects);
      rects[rIdx] = snapped;
      handleUpdatePanelParams(pIdx, { zoomRects: rects, zoomRect: undefined });
    }
  };

  const handleFocusYDragEnd = (info: any, pIdx: number) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;

    const deltaYPercent = (info.offset.y / rect.height) * 100;

    const pg = localDialogues.pages?.[pageKey] || { panels: [] };
    const panelsCopy = [...(pg.panels || [])];
    const targetPanel = { ...panelsCopy[pIdx] };
    
    let newFocusY = ((targetPanel.focusY ?? 0.5) * 100) + deltaYPercent;

    if (snapToGrid) {
      newFocusY = Math.round(newFocusY / gridSize) * gridSize;
    } else {
      newFocusY = Math.round(newFocusY);
    }

    newFocusY = Math.max(0, Math.min(100, newFocusY)) / 100;

    handleUpdatePanelParams(pIdx, { focusY: newFocusY });
  };

  // Save changes to disk using our API endpoint
  const localDialoguesRef = useRef(localDialogues);
  localDialoguesRef.current = localDialogues;
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  hasUnsavedChangesRef.current = hasUnsavedChanges;
  const isSavingRef = useRef(isSaving);
  isSavingRef.current = isSaving;
  const workspaceShaRef = useRef(workspaceSha);
  workspaceShaRef.current = workspaceSha;

  const handleSaveChanges = useCallback(async () => {
    if (isSavingRef.current) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const savedPass = typeof window !== "undefined" ? sessionStorage.getItem("editor_password") || "" : "";
      const res = await fetch(`/api/chapters/${chapterId}/dialogues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-editor-password": savedPass,
        },
        body: JSON.stringify({ dialogues: localDialoguesRef.current, sha: workspaceShaRef.current }),
      });
      const payload = await res.json().catch(() => ({} as { error?: string; sha?: string }));

      if (res.status === 409) {
        setSaveStatus("conflict");
        setSaveMessage(
          typeof payload.error === "string"
            ? payload.error
            : "Hay una versión más nueva en GitHub. Recargá el capítulo."
        );
        return;
      }
      if (res.ok) {
        if (payload.sha) setWorkspaceSha(payload.sha);
        setSaveStatus("success");
        setHasUnsavedChanges(false);
        setHasLocalBackup(false);
        setBackupTimestamp(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(`dialogues_backup_${chapterId}`);
        }
        window.setTimeout(() => {
          setSaveStatus((current) => (current === "success" ? "idle" : current));
        }, 5000);
      } else {
        setSaveStatus("error");
        setSaveMessage(payload.error || `No se pudo guardar (${res.status})`);
      }
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
      setSaveMessage("Error de red al guardar");
    } finally {
      setIsSaving(false);
    }
  }, [chapterId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!hasUnsavedChangesRef.current || isSavingRef.current) return;
      void handleSaveChanges();
    }, 30000);
    return () => window.clearInterval(id);
  }, [handleSaveChanges]);

  const handlePanelRectResizeStart = (
    e: React.PointerEvent,
    handle: string,
    pIdx: number,
    rIdx: number
  ) => {
    e.stopPropagation();
    e.preventDefault();
    if (!imgRef.current) return;
    const imgBound = imgRef.current.getBoundingClientRect();
    if (imgBound.width <= 0 || imgBound.height <= 0) return;
    const startX = e.clientX;
    const startY = e.clientY;
    
    const pg = localDialogues.pages?.[pageKey] || { panels: [] };
    const panelsCopy = [...(pg.panels || [])];
    const targetPanel = { ...panelsCopy[pIdx] };
    const rects = targetPanel.zoomRects ? [...targetPanel.zoomRects] : targetPanel.zoomRect ? [{...targetPanel.zoomRect}] : [];
    const zoom = rects[rIdx];
    if (!zoom) return;

    const startRect = { ...zoom };

    // Push the current state to the undo stack exactly once when starting the drag
    setUndoStack((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(localDialogues))]);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      
      const deltaXPercent = (dx / imgBound.width) * 100;
      const deltaYPercent = (dy / imgBound.height) * 100;

      let newX = startRect.x;
      let newY = startRect.y;
      let newW = startRect.w;
      let newH = startRect.h;

      if (handle.includes("r")) {
        newW = startRect.w + deltaXPercent;
      }
      if (handle.includes("l")) {
        newX = startRect.x + deltaXPercent;
        newW = startRect.w - deltaXPercent;
      }
      if (handle.includes("b")) {
        newH = startRect.h + deltaYPercent;
      }
      if (handle.includes("t")) {
        newY = startRect.y + deltaYPercent;
        newH = startRect.h - deltaYPercent;
      }

      // Constrain coordinates and size
      const minSize = 2;
      
      if (snapToGrid) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
        newW = Math.round(newW / gridSize) * gridSize;
        newH = Math.round(newH / gridSize) * gridSize;
      }

      if (newW < minSize) {
        if (handle.includes("l")) {
          newX = startRect.x + startRect.w - minSize;
        }
        newW = minSize;
      }
      if (newH < minSize) {
        if (handle.includes("t")) {
          newY = startRect.y + startRect.h - minSize;
        }
        newH = minSize;
      }

      newX = Math.max(0, Math.min(100 - newW, newX));
      newY = Math.max(0, Math.min(100 - newH, newY));
      newW = Math.max(minSize, Math.min(100 - newX, newW));
      newH = Math.max(minSize, Math.min(100 - newY, newH));

      const otherRects = rects.filter((_, idx) => idx !== rIdx);
      const snapped = snapMaskRect({ x: newX, y: newY, w: newW, h: newH }, otherRects);
      rects[rIdx] = snapped;
      
      const updatedPages = { ...localDialogues.pages };
      const pgUpdate = { ...pg, panels: panelsCopy };
      panelsCopy[pIdx] = { ...targetPanel, zoomRects: rects, zoomRect: undefined };
      updatedPages[pageKey] = pgUpdate;

      updateDialoguesStateNoUndo(updatedPages);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleMoveBubbleToPanel = (fromPanelIdx: number, bubbleIdx: number, toPanelIdx: number) => {
    if (fromPanelIdx === toPanelIdx) return;
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    const panelsCopy = [...(pg.panels || [])];
    
    const fromPanel = { ...panelsCopy[fromPanelIdx] };
    const toPanel = { ...panelsCopy[toPanelIdx] };
    
    if (!fromPanel.dialogue || !fromPanel.dialogue[bubbleIdx]) return;
    
    const bubbleToMove = { ...fromPanel.dialogue[bubbleIdx] };
    
    // Remove from fromPanel
    const newFromDialogue = fromPanel.dialogue.filter((_, idx) => idx !== bubbleIdx);
    
    // Adjust linkedTo references in fromPanel
    const adjustedFromDialogue = newFromDialogue.map((bub) => {
      if (bub.linkedTo === undefined) return bub;
      if (bub.linkedTo === bubbleIdx) return { ...bub, linkedTo: undefined };
      if (bub.linkedTo > bubbleIdx) return { ...bub, linkedTo: bub.linkedTo - 1 };
      return bub;
    });
    
    fromPanel.dialogue = adjustedFromDialogue;
    
    // Add to toPanel
    const newToDialogue = toPanel.dialogue ? [...toPanel.dialogue] : [];
    newToDialogue.push(bubbleToMove);
    toPanel.dialogue = newToDialogue;
    
    panelsCopy[fromPanelIdx] = fromPanel;
    panelsCopy[toPanelIdx] = toPanel;
    pg.panels = panelsCopy;
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);
    
    setActivePanelIdx(toPanelIdx);
    setActiveBubbleIdx(newToDialogue.length - 1);
  };

  const handleReorderPanels = (startIndex: number, endIndex: number) => {
    if (startIndex === endIndex) return;
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    const panelsCopy = [...(pg.panels || [])];
    
    if (startIndex < 0 || startIndex >= panelsCopy.length || endIndex < 0 || endIndex >= panelsCopy.length) return;
    
    const [removed] = panelsCopy.splice(startIndex, 1);
    panelsCopy.splice(endIndex, 0, removed);
    
    pg.panels = panelsCopy;
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);
    
    setActivePanelIdx(endIndex);
    setActiveBubbleIdx(null);
  };

  const handleReorderBubbles = (pIdx: number, startIndex: number, endIndex: number) => {
    if (startIndex === endIndex) return;
    const updatedPages = { ...localDialogues.pages };
    const pg = { ...currentPageData };
    const panelsCopy = [...(pg.panels || [])];
    const targetPanel = { ...panelsCopy[pIdx] };
    const dialoguesCopy = targetPanel.dialogue ? [...targetPanel.dialogue] : [];
    
    if (startIndex < 0 || startIndex >= dialoguesCopy.length || endIndex < 0 || endIndex >= dialoguesCopy.length) return;
    
    const [removed] = dialoguesCopy.splice(startIndex, 1);
    dialoguesCopy.splice(endIndex, 0, removed);
    
    const mapIndex = (oldIdx: number) => {
      if (oldIdx === startIndex) return endIndex;
      if (startIndex < endIndex) {
        if (oldIdx > startIndex && oldIdx <= endIndex) return oldIdx - 1;
      } else {
        if (oldIdx >= endIndex && oldIdx < startIndex) return oldIdx + 1;
      }
      return oldIdx;
    };
    
    const adjustedDialogues = dialoguesCopy.map((bub) => {
      if (bub.linkedTo === undefined) return bub;
      return { ...bub, linkedTo: mapIndex(bub.linkedTo) };
    });
    
    targetPanel.dialogue = adjustedDialogues;
    panelsCopy[pIdx] = targetPanel;
    pg.panels = panelsCopy;
    updatedPages[pgKey] = pg;
    updateDialoguesState(updatedPages);
    
    setActiveBubbleIdx(endIndex);
  };

  return {
    localDialogues,
    setLocalDialogues,
    activeLayer,
    setActiveLayer,
    activePanelIdx,
    setActivePanelIdx,
    activeBubbleIdx,
    setActiveBubbleIdx,
    undoStack,
    isSaving,
    saveStatus,
    saveMessage,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    setGridSize,
    handleUndo,
    handleAddPanel,
    handleRemovePanel,
    handleUpdatePanelParams,
    handleAddBubble,
    handleApplyGeneratedDialogues,
    handleDuplicateBubble,
    handleUpdateBubble,
    handleRemoveBubble,
    handleUpdateSettings,
    handleUpdateAudioTracks,
    handleDragEnd,
    handleTailTargetDragEnd,
    handlePanelRectDragEnd,
    handleFocusYDragEnd,
    handlePanelRectResizeStart,
    handleSaveChanges,
    presetMode,
    setPresetMode,
    handleMoveBubbleToPanel,
    handleReorderPanels,
    handleReorderBubbles,
    hasUnsavedChanges,
    hasLocalBackup,
    backupTimestamp,
    restoreLocalBackup,
    discardLocalBackup,
  };
}
