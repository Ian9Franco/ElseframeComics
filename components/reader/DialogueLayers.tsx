import React from "react";
import { motion } from "framer-motion";
import { DialogueBubble, getBubbleStyles } from "./DialogueBubble";
import { PanelStop, Dialogues } from "./audioPlayer";
import {
  buildTailPath,
  estimateBubbleSize,
  findTargetBubble,
  getEffectiveIndexes,
} from "./readerUtils";
import type { DialogueLine } from "./DialogueBubble";

function isSpeechBalloon(line: DialogueLine) {
  const style = line.style ?? "normal";
  return style === "normal" || style === "whisper";
}

function SpeechJoins({
  bubbles,
}: {
  bubbles: { key: string; x: number; y: number; line: DialogueLine; active: boolean }[];
}) {
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < bubbles.length; i++) {
    for (let j = i + 1; j < bubbles.length; j++) {
      const a = bubbles[i];
      const b = bubbles[j];
      if (!isSpeechBalloon(a.line) || !isSpeechBalloon(b.line)) continue;
      const sa = estimateBubbleSize(a.line);
      const sb = estimateBubbleSize(b.line);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len < 16) continue;
      const gapX = Math.abs(dx) - sa.halfW - sb.halfW;
      const gapY = Math.abs(dy) - sa.halfH - sb.halfH;
      const stacked = gapY < 28 && -gapX > Math.min(sa.halfW, sb.halfW) * 0.5;
      const sideBySide = gapX < 28 && -gapY > Math.min(sa.halfH, sb.halfH) * 0.35;
      if (!stacked && !sideBySide) continue;
      const { bgColor, borderColor } = getBubbleStyles(a.line);
      const neck = stacked
        ? Math.min(sa.halfW, sb.halfW) * 1.2
        : Math.min(sa.halfH, sb.halfH) * 1.15;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      nodes.push(
        <div
          key={`join-${a.key}-${b.key}`}
          className="absolute pointer-events-none"
          style={{
            left: (a.x + b.x) / 2,
            top: (a.y + b.y) / 2,
            width: len,
            height: neck,
            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
            background: bgColor,
            border: `1.85px solid ${borderColor}`,
            borderRadius: neck / 2,
            zIndex: 28,
            opacity: a.active && b.active ? 1 : 0.18,
          }}
        />
      );
    }
  }
  return <>{nodes}</>;
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

    return (
      <>
        {panelsToRender.flatMap((panel: PanelStop, pIndex: number) => {
          const dialogueList = panel.dialogue || [];
          const effectiveIndexes = getEffectiveIndexes(dialogueList, imgWidth, imgHeight, imgLeft, imgTop);
          const joinBubbles = dialogueList.map((line, i) => {
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
              x: imgLeft + (posX / 100) * imgWidth + parallaxX + offset.x,
              y: imgTop + (posY / 100) * imgHeight + parallaxY + offset.y,
              line,
              active,
            };
          });

          return [
            <SpeechJoins key={`joins-${pIndex}`} bubbles={joinBubbles} />,
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
                      opacity: isBubbleActive ? 1.0 : 0.18,
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
                onPointerDown={(e) => handleBubblePointerDown(e, bubbleKey)}
                onPointerMove={(e) => handleBubblePointerMove(e, bubbleKey)}
                onPointerUp={(e) => handleBubblePointerUp(e, bubbleKey)}
                onPointerCancel={(e) => handleBubblePointerUp(e, bubbleKey)}
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
                  opacity: isBubbleActive ? 1.0 : 0.18,
                  pointerEvents: isBubbleActive ? "auto" : "none",
                }}
              >
                <DialogueBubble
                  line={line}
                  index={effIdx}
                  elasticTailNode={elasticTailNode}
                  instant={showAllDialogues || zoomedOut}
                  appearanceAnimation={appearanceAnimation}
                  fadeOutAnimation={fadeOutAnimation}
                  depth={dialogueDepth}
                  textScale={textScale}
                  speedMultiplier={speedMultiplier}
                  bubbleOpacity={bubbleOpacity}
                  staggerDelay={staggerDelay}
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

        const joinBubbles = dialogueList.map((line, bIdx) => {
          const posX = line.posX ?? 50;
          const posY = line.posY ?? panel.focusY * 100;
          return {
            key: `${pIdx}-${bIdx}`,
            x: imgLeft + (posX / 100) * imgWidth,
            y: imgTop + (posY / 100) * imgHeight,
            line,
            active: true,
          };
        });

        return [
          <SpeechJoins key={`joins-edit-${pIdx}`} bubbles={joinBubbles} />,
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
                    speedMultiplier={speedMultiplier}
                    bubbleOpacity={bubbleOpacity}
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
