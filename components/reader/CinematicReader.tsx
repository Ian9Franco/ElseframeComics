"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { DialogueEditorPanel } from "./DialogueEditorPanel";
import { ReaderTopBar } from "./ReaderTopBar";
import { ReaderAuthModal } from "./ReaderAuthModal";
import { ReaderInstructionsModal } from "./ReaderInstructionsModal";
import { useReaderZoom } from "./useReaderZoom";
import { useDialogueEditor } from "./useDialogueEditor";
import { ReaderCanvas } from "./ReaderCanvas";
import { EditorLeftSidebar } from "./EditorLeftSidebar";
import { ReaderPagesSidebar } from "./ReaderPagesSidebar";
import { DialogueLayers } from "./DialogueLayers";
import { useReaderLayout } from "./useReaderLayout";
import { useReaderAudio } from "./useReaderAudio";
import { MiniMusicPlayer } from "./MiniMusicPlayer";
import { getComicPageUrl, getPageKeyFromUrl } from "./readerUtils";
import { Dialogues, PanelStop } from "./audioPlayer";
import { UnlockNotificationModal } from "@/components/UnlockNotificationModal";
import { markChapterCompletionUnlock } from "@/lib/characterData/completionUnlocks";

export function CinematicReader({
  pages: rawPages,
  dialogues,
  chapter,
  saga,
  nextChapter,
  prevChapter,
  cover,
}: {
  pages: string[];
  dialogues: Dialogues | null;
  chapter: any;
  saga: any;
  nextChapter: any;
  prevChapter: any;
  cover?: string | null;
}) {
  const [mode, setMode] = useState<"read" | "edit">("read");

  const pages = React.useMemo(() => {
    const hasExplicitCover = cover && cover !== rawPages[0];
    return (mode === "read" && hasExplicitCover) ? [cover, ...rawPages] : rawPages;
  }, [mode, cover, rawPages]);

  const [pageIdx, setPageIdx] = useState(0);
  const [panelIdx, setPanelIdx] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [zoomedOut, setZoomedOut] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [isPagesSidebarOpen, setIsPagesSidebarOpen] = useState(false);

  useEffect(() => {
    if (zoomedOut && pageIdx === pages.length - 1) {
      markChapterCompletionUnlock(chapter.id);
      const triggerChapters = [
        "un lugar",
        "un-lugar",
        "kenji",
        "mativerse-chapter-one",
        "pecados de brooklyn-la mentira",
        "la caceria",
        "primer vuelo",
        "primer-vuelo"
      ];
      const chapId = chapter.id;
      if (triggerChapters.includes(chapId.toLowerCase().trim())) {
        try {
          const notified = localStorage.getItem("notified-unlocks");
          const notifiedList = notified ? JSON.parse(notified) : [];
          if (!notifiedList.includes(chapId)) {
            setShowUnlockModal(true);
            notifiedList.push(chapId);
            localStorage.setItem("notified-unlocks", JSON.stringify(notifiedList));
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [zoomedOut, pageIdx, pages.length, chapter.id]);
  const [showAllDialogues, setShowAllDialogues] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [isPageChanging, setIsPageChanging] = useState(false);

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [activeReadingBubbleIdx, setActiveReadingBubbleIdx] = useState<number>(0);

  const {
    zoomScale,
    setZoomScale,
    panOffset,
    setPanOffset,
    isPanning,
    bubbleOffsets,
    setBubbleOffsets,
    draggedBubbleKey,
    totalDragDistRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    handleDoubleClick,
    handleBubblePointerDown,
    handleBubblePointerMove,
    handleBubblePointerUp,
  } = useReaderZoom({ containerSize, containerRef });
  const imgRef = useRef<HTMLImageElement>(null);

  const {
    localDialogues,
    activeLayer,
    setActiveLayer,
    activePanelIdx,
    setActivePanelIdx,
    activeBubbleIdx,
    setActiveBubbleIdx,
    undoStack,
    isSaving,
    saveStatus,
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
  } = useDialogueEditor({ dialogues, chapterId: chapter.id, pageKey: getPageKeyFromUrl(pages[pageIdx]), imgRef });

  const [textScale, setTextScale] = useState<number>(1.0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [autoplay, setAutoplay] = useState<boolean>(false);
  // Dialogue speed: 0.5 = slow, 1.0 = normal, 1.5 = fast
  const [speedMultiplier, setSpeedMultiplierState] = useState<number>(1.0);
  const [focusEnabled, setFocusEnabled] = useState<boolean>(true);
  const [bubbleOpacity, setBubbleOpacityState] = useState<number>(0.90);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("reader_text_scale");
      if (saved) {
        setTextScale(parseFloat(saved));
      } else {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          setTextScale(0.85); // A- Chico
        } else {
          setTextScale(1.4);  // A++ X-Grande
        }
      }
      const savedAutoplay = localStorage.getItem("reader_autoplay");
      if (savedAutoplay !== null) {
        setAutoplay(savedAutoplay === "true");
      } else {
        setAutoplay(false);
      }
      const savedSpeed = localStorage.getItem("reader_dialogue_speed");
      if (savedSpeed !== null) {
        setSpeedMultiplierState(parseFloat(savedSpeed));
      }
      const savedFocusDialogue = localStorage.getItem("reader_focus_dialogue");
      const savedFocusPanel = localStorage.getItem("reader_focus_panel");
      const savedFocus = savedFocusDialogue ?? savedFocusPanel;
      if (savedFocus !== null) {
        const nextFocus = savedFocus === "true";
        setFocusEnabled(nextFocus);
        localStorage.setItem("reader_focus_dialogue", String(nextFocus));
        localStorage.setItem("reader_focus_panel", String(nextFocus));
      } else {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          setFocusEnabled(false);
        }
      }
      const savedBubbleOpacity = localStorage.getItem("reader_bubble_opacity");
      if (savedBubbleOpacity !== null) {
        setBubbleOpacityState(parseFloat(savedBubbleOpacity));
      }
      const hasRead = localStorage.getItem("has_read_instructions") === "true";
      if (!hasRead) {
        setShowInstructions(true);
      }
    }
  }, []);

  const handleCloseInstructions = () => {
    setShowInstructions(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("has_read_instructions", "true");
    }
  };

  const handleSetTextScale = (scale: number) => {
    setTextScale(scale);
    if (typeof window !== "undefined") {
      localStorage.setItem("reader_text_scale", String(scale));
    }
  };

  const handleSetAutoplay = (value: boolean) => {
    setAutoplay(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("reader_autoplay", String(value));
    }
  };

  const handleSetSpeedMultiplier = (value: number) => {
    setSpeedMultiplierState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("reader_dialogue_speed", String(value));
    }
  };

  const handleSetFocusEnabled = (value: boolean) => {
    setFocusEnabled(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("reader_focus_dialogue", String(value));
      localStorage.setItem("reader_focus_panel", String(value));
    }
  };

  const handleSetBubbleOpacity = (value: number) => {
    setBubbleOpacityState(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("reader_bubble_opacity", String(value));
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("editor_authorized") === "true";
      setIsAuthorized(auth);
      if (auth && sessionStorage.getItem("editor_mode") === "edit") {
        setMode("edit");
      }
    }
  }, []);

  const prevModeRef = useRef(mode);
  useEffect(() => {
    if (prevModeRef.current !== mode) {
      if (cover) {
        if (mode === "edit") {
          setPageIdx((prev) => Math.max(0, prev - 1));
        } else if (mode === "read") {
          setPageIdx((prev) => prev + 1);
        }
      }
      prevModeRef.current = mode;
    }
  }, [mode, cover]);

  useEffect(() => {
    if (mode !== "edit") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, handleUndo]);

  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerSize({
          w: containerRef.current.clientWidth,
          h: containerRef.current.clientHeight,
        });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [mode]);

  useEffect(() => {
    if (!pages[pageIdx]) return;

    const url = getComicPageUrl(pages[pageIdx]);
    const img = new window.Image();

    // B6 fix: if already cached, resolve synchronously without showing overlay
    if (img.complete && img.naturalWidth > 0) {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setIsPageChanging(false);
      img.src = url;
      return;
    }

    setImgSize(null);
    setIsPageChanging(true);

    let timer: NodeJS.Timeout;
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      // Reduced from 1000ms to 150ms — overlay fades out fast after load
      timer = setTimeout(() => {
        setIsPageChanging(false);
      }, 150);
    };
    img.src = url;

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pageIdx, pages]);

  // 5A — Speculative preloading of adjacent pages
  useEffect(() => {
    if (typeof window === "undefined" || !pages.length) return;
    const toPreload = [pageIdx - 1, pageIdx + 1, pageIdx + 2].filter(
      (i) => i >= 0 && i < pages.length
    );
    toPreload.forEach((i) => {
      const preImg = new window.Image();
      preImg.src = getComicPageUrl(pages[i]);
    });
  }, [pageIdx, pages]);

  const resetPage = useCallback((idx: number) => {
    setPageIdx(idx);
    setPanelIdx(0);
    setZoomIdx(0);
    setZoomedOut(false);
    setShowAllDialogues(false);
    setActivePanelIdx(0);
    setActiveBubbleIdx(null);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setBubbleOffsets({});
  }, [setActivePanelIdx, setActiveBubbleIdx, setZoomScale, setPanOffset, setBubbleOffsets]);

  useEffect(() => {
    setZoomIdx(0);
  }, [panelIdx, mode]);

  useEffect(() => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
    setBubbleOffsets({});
  }, [panelIdx, zoomIdx, setZoomScale, setPanOffset, setBubbleOffsets]);

  const pgKey = getPageKeyFromUrl(pages[pageIdx]);
  const currentPageData = pgKey ? (localDialogues.pages?.[pgKey] || { panels: [] }) : { panels: [] };

  const currentPanels = useMemo(() => {
    return mode === "read"
      ? (currentPageData.panels || []).filter(
          (p: PanelStop) =>
            (p.dialogue && p.dialogue.length > 0) ||
            p.zoomRect ||
            (p.zoomRects && p.zoomRects.length > 0) ||
            p.sound ||
            (p.sounds && p.sounds.length > 0)
        )
      : currentPageData.panels || [];
  }, [mode, currentPageData.panels]);

  // Ref to track pending dialogue timers so manual input can cancel them cleanly.
  const dialogueTimersRef = useRef<NodeJS.Timeout[]>([]);

  // ── 6D: Read-mode keyboard shortcuts (placed after currentPanels declaration) ──
  useEffect(() => {
    if (mode !== "read") return;
    const handleReadKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        const activePanelStop = currentPanels[panelIdx];
        const rects = activePanelStop?.zoomRects || (activePanelStop?.zoomRect ? [activePanelStop.zoomRect] : []);
        const dialogueCount = activePanelStop?.dialogue?.length || 0;
        if (showAllDialogues) {
          setShowAllDialogues(false);
        } else if (zoomedOut) {
          if (pageIdx < pages.length - 1) resetPage(pageIdx + 1);
        } else if (currentPanels.length === 0) {
          if (pageIdx < pages.length - 1) resetPage(pageIdx + 1);
          else setZoomedOut(true);
        } else if (dialogueCount > 1 && activeReadingBubbleIdx < dialogueCount - 1) {
          dialogueTimersRef.current.forEach((t) => clearTimeout(t));
          dialogueTimersRef.current = [];
          setActiveReadingBubbleIdx((prev) => prev + 1);
        } else if (zoomIdx < rects.length - 1) {
          setZoomIdx((prev) => prev + 1);
        } else if (panelIdx < currentPanels.length - 1) {
          setPanelIdx((prev) => prev + 1);
        } else {
          setZoomedOut(true);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (panelIdx > 0) {
          setPanelIdx((prev) => prev - 1);
          setZoomIdx(0);
        } else if (pageIdx > 0) {
          resetPage(pageIdx - 1);
        }
      } else if (e.key === "a" || e.key === "A") {
        handleSetAutoplay(!autoplay);
      }
    };
    window.addEventListener("keydown", handleReadKey);
    return () => window.removeEventListener("keydown", handleReadKey);
  }, [mode, currentPanels, panelIdx, activeReadingBubbleIdx, zoomIdx, zoomedOut, pageIdx, pages, showAllDialogues, autoplay, resetPage]);

  const activePanel = currentPanels[panelIdx] || { focusY: 0.5, dialogue: [] };
  const activePanelRects = activePanel
    ? activePanel.zoomRects || (activePanel.zoomRect ? [activePanel.zoomRect] : [])
    : [];
  const activeZoomRect = activePanelRects[zoomIdx] || null;

  const advanceReaderStep = useCallback(() => {
    const activePanelStop = currentPanels[panelIdx];
    const rects = activePanelStop?.zoomRects || (activePanelStop?.zoomRect ? [activePanelStop.zoomRect] : []);
    const dialogueCount = activePanelStop?.dialogue?.length || 0;

    if (dialogueCount > 1 && activeReadingBubbleIdx < dialogueCount - 1) {
      setActiveReadingBubbleIdx((prev) => prev + 1);
    } else if (zoomIdx < rects.length - 1) {
      setZoomIdx((prev) => prev + 1);
    } else if (panelIdx < currentPanels.length - 1) {
      setPanelIdx((prev) => prev + 1);
    } else {
      setZoomedOut(true);
    }
  }, [activeReadingBubbleIdx, currentPanels, panelIdx, zoomIdx]);

  useEffect(() => {
    if (mode !== "read" || zoomedOut || !autoplay) return;
    const activePanelStop = currentPanels[panelIdx];
    if (!activePanelStop) return;

    const dialogueCount = activePanelStop.dialogue?.length || 0;
    const baseDelay = activePanelStop.duration && activePanelStop.duration > 0
      ? activePanelStop.duration * 1000
      : dialogueCount > 1
      ? 1800 / speedMultiplier
      : 2400 / speedMultiplier;
    const timer = setTimeout(advanceReaderStep, Math.max(850, baseDelay));
    return () => clearTimeout(timer);
  }, [panelIdx, activeReadingBubbleIdx, currentPanels, mode, zoomedOut, autoplay, speedMultiplier, advanceReaderStep]);

  useEffect(() => {
    if (mode !== "read") return;
    setActiveReadingBubbleIdx(0);

    // Clear any leftover timers from the previous panel.
    dialogueTimersRef.current.forEach((t) => clearTimeout(t));
    dialogueTimersRef.current = [];

    return () => {
      dialogueTimersRef.current.forEach((t) => clearTimeout(t));
      dialogueTimersRef.current = [];
    };
  }, [panelIdx, pageIdx, mode]);

  // Audio Context custom hook
  const { activeMusicTrack } = useReaderAudio({
    mode,
    panelIdx,
    pageIdx,
    pages,
    localDialogues,
    activePanel,
  });

  // Calculate layout dimensions via custom hook
  const { imgWidth, imgLeft, imgTop, imgHeight } = useReaderLayout({
    imgSize,
    containerSize,
    mode,
    activeZoomRect,
    zoomedOut,
    zoomScale,
    activePanel,
    activeReadingBubbleIdx,
    focusPanel: focusEnabled,
    focusDialogue: focusEnabled,
    pagesSidebarOpen: isPagesSidebarOpen,
    pagesSidebarWidth: 88,
  });

  const handleReaderTap = (e: React.MouseEvent) => {
    if (isPanning || totalDragDistRef.current > 6) return;

    if (e && e.target) {
      if (
        (e.target as HTMLElement).closest(".btn") ||
        (e.target as HTMLElement).closest(".tag") ||
        (e.target as HTMLElement).closest(".zoom-controls")
      ) {
        return;
      }
    }

    if (showAllDialogues) {
      setShowAllDialogues(false);
      return;
    }

    if (zoomedOut) {
      return;
    }

    if (currentPanels.length === 0) {
      setZoomedOut(true);
      return;
    }

    const activePanelStop = currentPanels[panelIdx];
    const rects = activePanelStop?.zoomRects || (activePanelStop?.zoomRect ? [activePanelStop.zoomRect] : []);

    // If there are still unseen dialogues in the current panel, step through them
    // on tap instead of jumping to the next panel/zoom rect.
    const dialogueCount = activePanel?.dialogue?.length || 0;
    if (dialogueCount > 1 && activeReadingBubbleIdx < dialogueCount - 1) {
      // Cancel any pending auto-advance timers so we don't double-step.
      dialogueTimersRef.current.forEach((t) => clearTimeout(t));
      dialogueTimersRef.current = [];
      setActiveReadingBubbleIdx((prev) => prev + 1);
      return;
    }

    if (zoomIdx < rects.length - 1) {
      setZoomIdx((prev) => prev + 1);
    } else if (panelIdx < currentPanels.length - 1) {
      setPanelIdx((prev) => prev + 1);
    } else {
      setZoomedOut(true);
    }
  };

  const handleToggleMode = () => {
    setPanelIdx(0);
    setZoomIdx(0);
    setZoomedOut(false);
    if (mode === "edit") {
      setMode("read");
      if (typeof window !== "undefined") sessionStorage.setItem("editor_mode", "read");
    } else {
      if (isAuthorized) {
        setMode("edit");
        if (typeof window !== "undefined") sessionStorage.setItem("editor_mode", "edit");
      } else {
        setShowAuthModal(true);
        setPasswordInput("");
        setAuthError(false);
      }
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(false);
    try {
      const res = await fetch("/api/auth/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput, onlyMaster: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthorized(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("editor_authorized", "true");
          sessionStorage.setItem("editor_password", passwordInput);
          sessionStorage.setItem("editor_mode", "edit");
        }
        setShowAuthModal(false);
        setPanelIdx(0);
        setZoomedOut(false);
        setMode("edit");
      } else {
        setAuthError(true);
      }
    } catch (err) {
      console.error("Error authenticating:", err);
      setAuthError(true);
    }
  };

  const dialoguesNode = useMemo(() => {
    return (
      <DialogueLayers
        mode={mode}
        activeLayer={activeLayer}
        localDialogues={localDialogues}
        showAllDialogues={showAllDialogues}
        zoomedOut={zoomedOut}
        containerSize={containerSize}
        imgWidth={imgWidth}
        imgHeight={imgHeight}
        imgLeft={imgLeft}
        imgTop={imgTop}
        currentPanels={currentPanels}
        activePanel={activePanel}
        panelIdx={panelIdx}
        activeReadingBubbleIdx={activeReadingBubbleIdx}
        bubbleOffsets={bubbleOffsets}
        draggedBubbleKey={draggedBubbleKey}
        textScale={textScale}
        autoplay={autoplay}
        speedMultiplier={speedMultiplier}
        isPageChanging={isPageChanging}
        activePanelIdx={activePanelIdx}
        activeBubbleIdx={activeBubbleIdx}
        setActivePanelIdx={setActivePanelIdx}
        setActiveBubbleIdx={setActiveBubbleIdx}
        handleBubblePointerDown={handleBubblePointerDown}
        handleBubblePointerMove={handleBubblePointerMove}
        handleBubblePointerUp={handleBubblePointerUp}
        handleDragEnd={handleDragEnd}
        handleTailTargetDragEnd={handleTailTargetDragEnd}
        handleReorderBubbles={handleReorderBubbles}
        bubbleOpacity={bubbleOpacity}
      />
    );
  }, [
    mode,
    activeLayer,
    localDialogues,
    showAllDialogues,
    zoomedOut,
    containerSize,
    imgWidth,
    imgHeight,
    imgLeft,
    imgTop,
    currentPanels,
    activePanel,
    panelIdx,
    activeReadingBubbleIdx,
    bubbleOffsets,
    draggedBubbleKey,
    textScale,
    autoplay,
    speedMultiplier,
    isPageChanging,
    activePanelIdx,
    activeBubbleIdx,
    setActivePanelIdx,
    setActiveBubbleIdx,
    handleBubblePointerDown,
    handleBubblePointerMove,
    handleBubblePointerUp,
    handleDragEnd,
    handleTailTargetDragEnd,
    handleReorderBubbles,
    bubbleOpacity,
  ]);

  return (
    <div
      className="brand-grain fixed inset-0 z-[150] w-screen h-[100dvh] flex flex-col overflow-hidden"
      style={{ touchAction: "none" }}
    >
      <ReaderTopBar
        saga={saga}
        chapter={chapter}
        mode={mode}
        handleToggleMode={handleToggleMode}
        pageIdx={pageIdx}
        totalPages={pages.length}
        textScale={textScale}
        setTextScale={handleSetTextScale}
        autoplay={autoplay}
        setAutoplay={handleSetAutoplay}
        speedMultiplier={speedMultiplier}
        setSpeedMultiplier={handleSetSpeedMultiplier}
        resetPage={resetPage}
        onOpenHelp={() => setShowInstructions(true)}
        focusEnabled={focusEnabled}
        setFocusEnabled={handleSetFocusEnabled}
        zoomScale={zoomScale}
        setZoomScale={setZoomScale}
        panOffset={panOffset}
        setPanOffset={setPanOffset}
        bubbleOpacity={bubbleOpacity}
        setBubbleOpacity={handleSetBubbleOpacity}
      />

      {/* Floating Mini Music Player (appears when a music track plays) */}
      <MiniMusicPlayer track={activeMusicTrack} />

      <div className={`flex-1 flex ${mode === "read" ? "flex-row" : "flex-col md:flex-row"} overflow-hidden w-full h-full relative`}>
        {/* Read mode: page thumbnail sidebar (PDF-reader style) */}
        <AnimatePresence>
          {mode === "read" && (
            <ReaderPagesSidebar
              pages={pages}
              pageIdx={pageIdx}
              resetPage={resetPage}
              saga={saga}
              totalPages={pages.length}
              onOpenChange={setIsPagesSidebarOpen}
            />
          )}
        </AnimatePresence>

        {/* Edit mode: full editor left sidebar */}
        {mode === "edit" && (
          <EditorLeftSidebar
            pages={pages}
            pageIdx={pageIdx}
            resetPage={resetPage}
            chapter={chapter}
            saga={saga}
            onSave={handleSaveChanges}
          />
        )}
        <ReaderCanvas
          mode={mode}
          activeLayer={activeLayer}
          containerRef={containerRef}
          imgRef={imgRef}
          pages={pages}
          pageIdx={pageIdx}
          chapter={chapter}
          isPanning={isPanning}
          zoomScale={zoomScale}
          panOffset={panOffset}
          imgSize={imgSize}
          imgWidth={imgWidth}
          imgHeight={imgHeight}
          imgLeft={imgLeft}
          imgTop={imgTop}
          showGrid={showGrid}
          gridSize={gridSize}
          currentPanels={currentPanels}
          activePanelIdx={activePanelIdx}
          activeBubbleIdx={activeBubbleIdx}
          panelIdx={panelIdx}
          zoomIdx={zoomIdx}
          zoomedOut={zoomedOut}
          showAllDialogues={showAllDialogues}
          isPageChanging={isPageChanging}
          renderedDialogues={dialoguesNode}
          undoStack={undoStack}
          handleMouseDown={handleMouseDown}
          handleMouseMove={handleMouseMove}
          handleMouseUp={handleMouseUp}
          handleTouchStart={handleTouchStart}
          handleTouchMove={handleTouchMove}
          handleTouchEnd={handleTouchEnd}
          handleWheel={handleWheel}
          handleDoubleClick={handleDoubleClick}
          handleReaderTap={handleReaderTap}
          handleUndo={handleUndo}
          handleAddPanel={handleAddPanel}
          handleAddBubble={handleAddBubble}
          handleDuplicateBubble={handleDuplicateBubble}
          handleRemoveBubble={handleRemoveBubble}
          setActivePanelIdx={setActivePanelIdx}
          handlePanelRectDragEnd={handlePanelRectDragEnd}
          handleFocusYDragEnd={handleFocusYDragEnd}
          handlePanelRectResizeStart={handlePanelRectResizeStart}
          resetPage={resetPage}
          setZoomScale={setZoomScale}
          setPanOffset={setPanOffset}
          nextChapter={nextChapter}
        />

        <DialogueEditorPanel
          mode={mode}
          chapterId={chapter.id}
          sagaTitle={saga.title}
          chapterTitle={chapter.title}
          activeLayer={activeLayer}
          setActiveLayer={setActiveLayer}
          currentPanels={currentPanels}
          activePanelIdx={activePanelIdx}
          activeBubbleIdx={activeBubbleIdx}
          pageIdx={pageIdx}
          pagesLength={pages.length}
          pages={pages}
          localDialogues={localDialogues}
          isSaving={isSaving}
          saveStatus={saveStatus}
          showGrid={showGrid}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          settings={localDialogues.settings || {}}
          handleSaveChanges={handleSaveChanges}
          resetPage={resetPage}
          setShowGrid={setShowGrid}
          setSnapToGrid={setSnapToGrid}
          setGridSize={setGridSize}
          handleAddPanel={handleAddPanel}
          setActivePanelIdx={setActivePanelIdx}
          setActiveBubbleIdx={setActiveBubbleIdx}
          handleRemovePanel={handleRemovePanel}
          handleUpdatePanelParams={handleUpdatePanelParams}
          handleAddBubble={handleAddBubble}
          handleDuplicateBubble={handleDuplicateBubble}
          handleRemoveBubble={handleRemoveBubble}
          handleUpdateBubble={handleUpdateBubble}
          handleUpdateSettings={handleUpdateSettings}
          handleUpdateAudioTracks={handleUpdateAudioTracks}
          presetMode={presetMode}
          setPresetMode={setPresetMode}
          handleMoveBubbleToPanel={handleMoveBubbleToPanel}
          handleReorderPanels={handleReorderPanels}
          handleReorderBubbles={handleReorderBubbles}
          handleApplyGeneratedDialogues={handleApplyGeneratedDialogues}
          hasUnsavedChanges={hasUnsavedChanges}
          hasLocalBackup={hasLocalBackup}
          backupTimestamp={backupTimestamp}
          restoreLocalBackup={restoreLocalBackup}
          discardLocalBackup={discardLocalBackup}
        />
      </div>

      <ReaderAuthModal
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        authError={authError}
        setAuthError={setAuthError}
        handleAuthSubmit={handleAuthSubmit}
      />

      <ReaderInstructionsModal
        isOpen={showInstructions}
        onClose={handleCloseInstructions}
      />

      <UnlockNotificationModal
        isOpen={showUnlockModal}
        onClose={() => setShowUnlockModal(false)}
        chapterId={chapter.id}
      />
    </div>
  );
}
