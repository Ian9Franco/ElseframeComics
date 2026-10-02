import React from "react";
import { motion } from "framer-motion";
import { DialogueBubble, getBubbleStyles } from "./DialogueBubble";
import { PanelStop, Dialogues } from "./audioPlayer";
import {
  buildTailPath,
  estimateBubbleSize,
  findTargetBubble,
  getEffectiveIndexes,
  buildSpeechFusionGroups,
  type FusionBubbleRef,
} from "./readerUtils";
import {
  buildSpeechFusionPath,
  comicBalloonSeed,
  type SpeechFusionNode,
} from "./bubbles/bubbleHelpers";

/** Inactive lines stay readable; the old 0.18 fade hid the new balloon fill. */
const INACTIVE_BUBBLE_OPACITY = 0.82;

function renderSpeechFusion(
  bubbles: FusionBubbleRef[],
  bubbleOpacity: number | undefined,
  bodySizes: Record<string, { w: number; h: number }>
): { element: React.ReactNode; keys: Set<string> } {
  const { groups } = buildSpeechFusionGroups(bubbles);
  const mobile =
    typeof window !== "undefined" && window.innerWidth < 768;
  const bleed = mobile ? 10 : 16;
  const rendered = new Set<string>();

  const nodes = groups.map((group) => {
    if (group.some((b) => !bodySizes[b.key] || bodySizes[b.key].w < 8)) return null;
    const localNodes: SpeechFusionNode[] = group.map((b) => {
      const box = bodySizes[b.key];
      return {
        cx: b.x,
        cy: b.y,
        rx: box.w / 2 + bleed,
        ry: box.h / 2 + bleed,
        seed: comicBalloonSeed(b.index, b.line.text || ""),
        neckPx: b.line.tailWidth,
      };
    });
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of localNodes) {
      minX = Math.min(minX, n.cx - n.rx);
      minY = Math.min(minY, n.cy - n.ry);
      maxX = Math.max(maxX, n.cx + n.rx);
      maxY = Math.max(maxY, n.cy + n.ry);
    }
    const local = localNodes.map((n) => ({
      ...n,
      cx: n.cx - minX,
      cy: n.cy - minY,
    }));
    const allWhisper = group.every((b) => (b.line.style ?? "normal") === "whisper");
    let path: string | null = null;
    try {
      path = buildSpeechFusionPath(local, {
        kind: allWhisper ? "scallop" : "smooth",
      });
    } catch {
      path = null;
    }
    if (!path) return null;
    for (const b of group) rendered.add(b.key);
    const { bgColor, borderColor } = getBubbleStyles(group[0].line, bubbleOpacity);
    const fill = bgColor.replace(
      /rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)/,
      "rgb($1, $2, $3)"
    );
    const w = Math.max(1, maxX - minX);
    const h = Math.max(1, maxY - minY);
    const anyActive = group.some((b) => b.active);
    return (
      <svg
        key={`fusion-${group.map((g) => g.key).join("-")}`}
        className="absolute pointer-events-none overflow-visible"
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        style={{
          left: minX,
          top: minY,
          zIndex: 27,
          opacity: anyActive ? 1 : INACTIVE_BUBBLE_OPACITY,
          transition: "opacity 520ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <path
          d={path}
          fill={fill}
          stroke={borderColor}
          strokeWidth={allWhisper ? 2.75 : 2.15}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  });

  return { element: <>{nodes}</>, keys: rendered };
}

interface DialogueLayersProps {
  mode: "read" | "edit";
  activeLayer?: "paradas" | "mascaras" | "dialogos";
  localDialogues: Dialogues;
  showAllDialogues: boolean;
  zoomedOut: boolean;
  containerSize: { w: number; h: number };
  imgWidth: number;
  imgHeight: number;
  imgLeft: number;
  imgTop: number;
  currentPanels: PanelStop[];
  activePanel: PanelStop;
  panelIdx: number;
  activeReadingBubbleIdx: number;
  bubbleOffsets: Record<string, { x: number; y: number }>;
  draggedBubbleKey: string | null;
  textScale: number;
  bubbleLayoutScale?: number;
  autoplay?: boolean;
  speedMultiplier?: number;
  isPageChanging: boolean;
  activePanelIdx: number;
  activeBubbleIdx: number | null;
  setActivePanelIdx: (idx: number) => void;
  setActiveBubbleIdx: (idx: number | null) => void;
  handleBubblePointerDown: (e: React.PointerEvent, key: string) => void;
  handleBubblePointerMove: (e: React.PointerEvent, key: string) => void;
  handleBubblePointerUp: (e: React.PointerEvent, key: string) => void;
  handleDragEnd: (info: any, pIdx: number, bIdx: number) => void;
  handleTailTargetDragEnd: (info: any, pIdx: number, bIdx: number) => void;
  handleReorderBubbles?: (pIdx: number, fromIdx: number, toIdx: number) => void;
  bubbleOpacity?: number;
  staggerDelay?: boolean;
}

export function DialogueLayers({
  mode,
  activeLayer = "dialogos",
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
  bubbleLayoutScale = 1,
  autoplay = false,
  speedMultiplier = 1.0,
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
  bubbleOpacity = 0.88,
  staggerDelay = false,
}: DialogueLayersProps) {
  const [bodySizes, setBodySizes] = React.useState<Record<string, { w: number; h: number }>>({});
  const handleBodyMeasure = React.useCallback((key: string, size: { w: number; h: number }) => {
    setBodySizes((prev) => {
      const cur = prev[key];
      if (cur && Math.abs(cur.w - size.w) < 1 && Math.abs(cur.h - size.h) < 1) return prev;
      return { ...prev, [key]: size };
    });
  }, []);
  const settings = localDialogues.settings || {};
  const clearReadDialogues = settings.clearReadDialogues ?? true;
  const appearanceAnimation = settings.appearanceAnimation ?? "spring";
  const fadeOutAnimation = settings.fadeOutAnimation ?? "fade";
  const dialogueDepth = settings.dialogueDepth ?? 2;

  const centeredLeft = (containerSize.w - imgWidth) / 2;
  const centeredTop = (containerSize.h - imgHeight) / 2;
  const shiftX = imgLeft - centeredLeft;
  const shiftY = imgTop - centeredTop;

  if (mode === "read") {
    const parallaxFactor = dialogueDepth * 0.08;
    const parallaxX = shiftX * parallaxFactor;
    const parallaxY = shiftY * parallaxFactor;

    const panelsToRender =
      showAllDialogues || zoomedOut
        ? currentPanels
        : !clearReadDialogues
        ? currentPanels.slice(0, panelIdx + 1)
        : [activePanel];

    const fusionEnabled = false;

    return (
      <>
        {panelsToRender.flatMap((panel: PanelStop, pIndex: number) => {
          const dialogueList = panel.dialogue || [];
          const effectiveIndexes = getEffectiveIndexes(dialogueList, imgWidth, imgHeight, imgLeft, imgTop);
          const joinBubbles: FusionBubbleRef[] = dialogueList.map((line, i) => {
            const posX = line.posX ?? 50;
            const posY = line.posY ?? panel.focusY * 100;
            const offset = bubbleOffsets[`${pIndex}-${i}`] || { x: 0, y: 0 };
            const isCurrentPanel = panel === activePanel;
            const isPastPanel = autoplay && !clearReadDialogues && pIndex < panelIdx;
            const active =
              showAllDialogues ||
              zoomedOut ||
              isPastPanel ||
              (isCurrentPanel && (autoplay ? i <= activeReadingBubbleIdx : i === activeReadingBubbleIdx));
            return {
              key: `${pIndex}-${i}`,
              index: i,
              x: imgLeft + (posX / 100) * imgWidth + parallaxX + offset.x,
              y: imgTop + (posY / 100) * imgHeight + parallaxY + offset.y,
              line,
              active,
            };
          });
          const fusion = fusionEnabled
            ? renderSpeechFusion(joinBubbles, bubbleOpacity, bodySizes)
            : { element: null, keys: new Set<string>() };

          return [
            <React.Fragment key={`fusion-${pIndex}`}>{fusion.element}</React.Fragment>,
            ...dialogueList.map((line, i) => {
            const posX = line.posX ?? 50;
            const posY = line.posY ?? panel.focusY * 100;

            const bubbleKey = `${pIndex}-${i}`;
            const offset = bubbleOffsets[bubbleKey] || { x: 0, y: 0 };

            const bubbleLeft = imgLeft + (posX / 100) * imgWidth + parallaxX + offset.x;
            const bubbleTop = imgTop + (posY / 100) * imgHeight + parallaxY + offset.y;
            const targetX = line.tailX !== undefined ? imgLeft + (line.tailX / 100) * imgWidth : null;
            const targetY = line.tailY !== undefined ? imgTop + (line.tailY / 100) * imgHeight : null;
            const effIdx = showAllDialogues || zoomedOut ? 0 : effectiveIndexes[i] ?? i;

            // Use object reference instead of index so this is correct when
            // clearReadDialogues=true (panelsToRender=[activePanel], pIndex always 0).
            const isCurrentPanel = panel === activePanel;
            const isPastPanel = autoplay && !clearReadDialogues && pIndex < panelIdx;
            const isBubbleActive =
              showAllDialogues ||
              zoomedOut ||
              isPastPanel ||
              (isCurrentPanel && (autoplay ? i <= activeReadingBubbleIdx : i === activeReadingBubbleIdx));

            const isTargetOfAny = dialogueList.some((otherLine, otherIdx) => {
              if (otherIdx === i) return false;
              if (otherLine.tailX === undefined || otherLine.tailY === undefined) return false;
              const target = findTargetBubble(
                otherLine.tailX,
                otherLine.tailY,
                dialogueList,
                otherIdx,
                imgWidth,
                imgHeight,
                imgLeft,
                imgTop
              );
              return target && target.index === i;
            });

            let elasticTailNode = null;
            if (targetX !== null && targetY !== null && line.tail !== "none") {
              const { bgColor } = getBubbleStyles(line, bubbleOpacity);
              const target = findTargetBubble(
                line.tailX!,
                line.tailY!,
                dialogueList,
                i,
                imgWidth,
                imgHeight,
                imgLeft,
                imgTop
              );

              let finalTargetX = targetX - bubbleLeft;
              let finalTargetY = targetY - bubbleTop;

              if (target) {
                const targetLine = target.line;
                const targetPosX = targetLine.posX ?? 50;
                const targetPosY = targetLine.posY ?? panel.focusY * 100;

                const targetKey = `${pIndex}-${target.index}`;
                const targetOffset = bubbleOffsets[targetKey] || { x: 0, y: 0 };
                const targetLeft = imgLeft + (targetPosX / 100) * imgWidth + parallaxX + targetOffset.x;
                const targetTop = imgTop + (targetPosY / 100) * imgHeight + parallaxY + targetOffset.y;

                const bx = targetLeft - bubbleLeft;
                const by = targetTop - bubbleTop;
                const dist = Math.sqrt(bx * bx + by * by);

                if (dist > 0.01) {
                  const targetSize = estimateBubbleSize(targetLine);
                  const t = 1 / Math.sqrt((bx / targetSize.halfW) ** 2 + (by / targetSize.halfH) ** 2);

                  const edgeX = bx - bx * t;
                  const edgeY = by - by * t;

                  finalTargetX = edgeX + (bx / dist) * 10;
                  finalTargetY = edgeY + (by / dist) * 10;
                }
              }

              const d = buildTailPath(0, 0, finalTargetX, finalTargetY, line);
              if (d) {
                elasticTailNode = (
                  <svg
                    className="absolute pointer-events-none overflow-visible animate-none"
                    style={{
                      left: "50%",
                      top: "50%",
                      zIndex: 0,
                      opacity: 1,
                      transition: "opacity 520ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    <path d={d} fill={bgColor} stroke="none" strokeWidth={0} />
                  </svg>
                );
              }
            }

            return (
              <div
                key={`read-bub-${pIndex}-${i}`}
                data-dialogue-bubble
                onPointerDown={(e) => handleBubblePointerDown(e, bubbleKey)}
                onPointerMove={(e) => handleBubblePointerMove(e, bubbleKey)}
                onPointerUp={(e) => handleBubblePointerUp(e, bubbleKey)}
                onPointerCancel={(e) => handleBubblePointerUp(e, bubbleKey)}
                onClick={(e) => e.stopPropagation()}
                className={`absolute select-none ${
                  draggedBubbleKey === bubbleKey
                    ? "cursor-grabbing z-[100] pointer-events-auto"
                    : "cursor-grab pointer-events-auto hover:scale-[1.015]"
                }`}
                style={{
                  left: bubbleLeft,
                  top: bubbleTop,
                  transform: "translate(-50%, -50%)",
                  width: "max-content",
                  zIndex: draggedBubbleKey === bubbleKey ? 100 : isTargetOfAny ? 29 : 30,
                  transition:
                    !isPageChanging && draggedBubbleKey !== bubbleKey
                      ? `opacity 520ms cubic-bezier(0.22, 1, 0.36, 1), left 520ms cubic-bezier(0.22, 1, 0.36, 1), top 520ms cubic-bezier(0.22, 1, 0.36, 1)`
                      : "none",
                  touchAction: "none",
                  opacity: isBubbleActive ? 1 : INACTIVE_BUBBLE_OPACITY,
                  pointerEvents: "auto",
                }}
              >
                <DialogueBubble
                  line={line}
                  index={effIdx}
                  elasticTailNode={elasticTailNode}
                  instant={showAllDialogues || zoomedOut || !isBubbleActive}
                  appearanceAnimation={appearanceAnimation}
                  fadeOutAnimation={fadeOutAnimation}
                  depth={dialogueDepth}
                  textScale={textScale}
                  bubbleLayoutScale={bubbleLayoutScale}
                  speedMultiplier={speedMultiplier}
                  bubbleOpacity={bubbleOpacity}
                  staggerDelay={staggerDelay}
                  suppressBalloonOutline={fusion.keys.has(bubbleKey)}
                  onBodyMeasure={(size) => handleBodyMeasure(bubbleKey, size)}
                />
              </div>
            );
          }),
          ];
        })}
      </>
    );
  }

  return (
    <>
      {currentPanels.flatMap((panel: PanelStop, pIdx: number) => {
        const dialogueList = panel.dialogue || [];
        const isCurrentPanel = activePanelIdx === pIdx;

        const joinBubbles: FusionBubbleRef[] = dialogueList.map((line, bIdx) => {
          const posX = line.posX ?? 50;
          const posY = line.posY ?? panel.focusY * 100;
          return {
            key: `${pIdx}-${bIdx}`,
            index: bIdx,
            x: imgLeft + (posX / 100) * imgWidth,
            y: imgTop + (posY / 100) * imgHeight,
            line,
            active: true,
          };
        });
        const fusion = { element: null as React.ReactNode, keys: new Set<string>() };

        return [
          <React.Fragment key={`fusion-edit-${pIdx}`}>{fusion.element}</React.Fragment>,
          ...dialogueList.map((line, bIdx) => {
          const isActive = isCurrentPanel && activeBubbleIdx === bIdx;
          const posX = line.posX ?? 50;
          const posY = line.posY ?? panel.focusY * 100;
          const bubbleLeft = imgLeft + (posX / 100) * imgWidth;
          const bubbleTop = imgTop + (posY / 100) * imgHeight;
          const targetX = line.tailX !== undefined ? imgLeft + (line.tailX / 100) * imgWidth : null;
          const targetY = line.tailY !== undefined ? imgTop + (line.tailY / 100) * imgHeight : null;

          const isTargetOfAny = dialogueList.some((otherLine, otherIdx) => {
            if (otherIdx === bIdx) return false;
            if (otherLine.tailX === undefined || otherLine.tailY === undefined) return false;
            const target = findTargetBubble(
              otherLine.tailX,
              otherLine.tailY,
              dialogueList,
              otherIdx,
              imgWidth,
              imgHeight,
              imgLeft,
              imgTop
            );
            return target && target.index === bIdx;
          });

          let elasticTailNode = null;
          if (targetX !== null && targetY !== null && line.tail !== "none") {
            const { bgColor } = getBubbleStyles(line, bubbleOpacity);
            const target = findTargetBubble(
              line.tailX!,
              line.tailY!,
              dialogueList,
              bIdx,
              imgWidth,
              imgHeight,
              imgLeft,
              imgTop
            );

            let finalTargetX = targetX - bubbleLeft;
            let finalTargetY = targetY - bubbleTop;

            if (target) {
              const targetLine = target.line;
              const targetPosX = targetLine.posX ?? 50;
              const targetPosY = targetLine.posY ?? panel.focusY * 100;
              const targetLeft = imgLeft + (targetPosX / 100) * imgWidth;
              const targetTop = imgTop + (targetPosY / 100) * imgHeight;

              const bx = targetLeft - bubbleLeft;
              const by = targetTop - bubbleTop;
              const dist = Math.sqrt(bx * bx + by * by);

              if (dist > 0.01) {
                const targetSize = estimateBubbleSize(targetLine);
                const t = 1 / Math.sqrt((bx / targetSize.halfW) ** 2 + (by / targetSize.halfH) ** 2);

                const edgeX = bx - bx * t;
                const edgeY = by - by * t;

                finalTargetX = edgeX + (bx / dist) * 10;
                finalTargetY = edgeY + (by / dist) * 10;
              }
            }

            const d = buildTailPath(0, 0, finalTargetX, finalTargetY, line);
            if (d) {
              elasticTailNode = (
                <svg
                  className="absolute pointer-events-none overflow-visible"
                  style={{ left: "50%", top: "50%", zIndex: 0 }}
                >
                  <path d={d} fill={bgColor} stroke="none" strokeWidth={0} />
                </svg>
              );
            }
          }

          return (
            <React.Fragment key={`edit-bub-container-${pIdx}-${bIdx}`}>
              <motion.div
                key={`edit-bub-${pIdx}-${bIdx}-${posX}-${posY}`}
                drag={isActive}
                dragMomentum={false}
                dragElastic={0}
                onDragEnd={(_, info) => handleDragEnd(info, pIdx, bIdx)}
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePanelIdx(pIdx);
                  setActiveBubbleIdx(bIdx);
                }}
                className={`absolute transition-opacity duration-300 ${
                  activeLayer !== "dialogos"
                    ? "opacity-15 pointer-events-none"
                    : isCurrentPanel
                    ? "opacity-100 pointer-events-auto cursor-move"
                    : "opacity-30 hover:opacity-90 pointer-events-auto cursor-move"
                }`}
                style={{
                  left: bubbleLeft,
                  top: bubbleTop,
                  x: 0,
                  y: 0,
                  translateX: "-50%",
                  translateY: "-50%",
                  width: "max-content",
                  zIndex: isActive ? 48 : isCurrentPanel ? (isTargetOfAny ? 39 : 40) : (isTargetOfAny ? 29 : 30),
                }}
              >
                <div
                  className={`relative transition-all ${
                    isActive
                      ? "outline-dashed outline-2 outline-[#e8185a] outline-offset-3 drop-shadow-lg"
                      : isCurrentPanel
                      ? "opacity-95 hover:opacity-100"
                      : "opacity-100"
                  }`}
                >
                  {/* Sequence badge & reorder controls in Edit Mode */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-0.5 rounded-full shadow-md border text-[10px] font-mono font-bold transition-all z-40 select-none ${
                      isActive
                        ? "bg-[#e8185a] text-white border-white/40 shadow-rose-950/40"
                        : isCurrentPanel
                        ? "bg-[#0c0c14]/90 hover:bg-[#161622] text-zinc-200 border-white/20"
                        : "bg-[#0c0c14]/60 hover:bg-[#161622] text-zinc-400 border-white/10"
                    }`}
                  >
                    <span className="font-black tracking-wider">V{pIdx + 1}·#{bIdx + 1}</span>
                    {isActive && (
                      <span className="text-[9px] opacity-90 border-l border-white/30 pl-1 font-mono">
                        {posX}% {posY}%
                      </span>
                    )}
                    {handleReorderBubbles && dialogueList.length > 1 && (
                      <div className="flex items-center gap-0.5 border-l border-white/30 pl-1">
                        {bIdx > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderBubbles(pIdx, bIdx, bIdx - 1);
                            }}
                            className="w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-[8px] font-bold transition-all active:scale-90 cursor-pointer"
                            title="Mover diálogo antes"
                          >
                            ▲
                          </button>
                        )}
                        {bIdx < dialogueList.length - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReorderBubbles(pIdx, bIdx, bIdx + 1);
                            }}
                            className="w-3.5 h-3.5 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center text-[8px] font-bold transition-all active:scale-90 cursor-pointer"
                            title="Mover diálogo después"
                          >
                            ▼
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <DialogueBubble
                    line={line}
                    index={0}
                    elasticTailNode={elasticTailNode}
                    instant={true}
                    appearanceAnimation={appearanceAnimation}
                    fadeOutAnimation={fadeOutAnimation}
                    depth={dialogueDepth}
                    textScale={textScale}
                    bubbleLayoutScale={bubbleLayoutScale}
                    speedMultiplier={speedMultiplier}
                    bubbleOpacity={bubbleOpacity}
                    suppressBalloonOutline={fusion.keys.has(`${pIdx}-${bIdx}`)}
                    onBodyMeasure={(size) => handleBodyMeasure(`${pIdx}-${bIdx}`, size)}
                  />
                </div>
              </motion.div>

              {isActive && line.tail !== "none" && line.tailX !== undefined && line.tailY !== undefined && (() => {
                const targetX2 = imgLeft + (line.tailX / 100) * imgWidth;
                const targetY2 = imgTop + (line.tailY / 100) * imgHeight;
                const isInBubble = !!findTargetBubble(
                  line.tailX,
                  line.tailY,
                  panel.dialogue || [],
                  bIdx,
                  imgWidth,
                  imgHeight,
                  imgLeft,
                  imgTop
                );
                return (
                  <motion.div
                    key={`edit-anchor-${pIdx}-${bIdx}-${line.tailX}-${line.tailY}`}
                    drag
                    dragMomentum={false}
                    dragElastic={0}
                    onDragEnd={(_, info) => handleTailTargetDragEnd(info, pIdx, bIdx)}
                    className="absolute z-50 pointer-events-auto cursor-crosshair"
                    style={{
                      left: targetX2,
                      top: targetY2,
                      x: 0,
                      y: 0,
                      translateX: "-50%",
                      translateY: "-50%",
                    }}
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_0_10px_rgba(96,165,250,0.9)] ${
                          isInBubble ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" : "bg-blue-400"
                        }`}
                      />
                    </div>
                  </motion.div>
                );
              })()}
            </React.Fragment>
          );
        }),
        ];
      })}
    </>
  );
}
