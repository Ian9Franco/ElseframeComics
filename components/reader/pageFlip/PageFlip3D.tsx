"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { FlipDirection } from "./usePageFlipGesture";
import { getPageTexture } from "./pageTextures";
import type { SpoilerMask } from "../readerUtils";

const SEG_X = 60;
const SEG_Y = 30;
const FOV = 30;
const BACK_OPACITY = 0.4;
const LEAD = 0.45;
const CORNER_TILT = 0.06;
/** How fast the drawn sheet catches up with the finger (per second); lower is smoother. */
const SMOOTHING = 11;

type PageRect = { left: number; top: number; width: number; height: number };

function Sheet({
  direction,
  progressRef,
  rect,
  viewport,
  frontSrc,
  frontMasks,
  expandT = 1,
}: {
  direction: FlipDirection;
  progressRef: React.MutableRefObject<number>;
  rect: PageRect;
  viewport: { w: number; h: number };
  frontSrc?: string;
  frontMasks?: SpoilerMask[];
  expandT?: number;
}) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1, SEG_X, SEG_Y), []);
  const texture = useMemo(() => getPageTexture(frontSrc, frontMasks), [frontSrc, frontMasks]);
  const backTexture = useMemo(() => {
    if (!texture) return null;
    const mirrored = texture.clone();
    mirrored.wrapS = THREE.RepeatWrapping;
    mirrored.repeat.x = -1;
    mirrored.offset.x = 1;
    mirrored.needsUpdate = true;
    return mirrored;
  }, [texture]);
  const shadowRef = useRef<THREE.MeshBasicMaterial>(null);
  const shownRef = useRef(progressRef.current);
  const backSynced = useRef(false);
  useEffect(() => {
    backSynced.current = false;
  }, [backTexture]);

  const { size } = useThree();
  const viewW = size.width || viewport.w;
  const viewH = size.height || viewport.h;
  const spineX = rect.left - viewW / 2;
  const centerY = -(rect.top + rect.height / 2 - viewH / 2);

  useFrame((_, delta) => {
    const target = Math.min(1, Math.max(0, progressRef.current));
    const follow = 1 - Math.exp(-Math.min(delta, 0.05) * SMOOTHING);
    shownRef.current += (target - shownRef.current) * follow;
    const raw = shownRef.current * Math.min(1, expandT * 1.05);
    const p = direction === "next" ? raw : 1 - raw;
    const bend = Math.sin(Math.PI * p);
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const ds = rect.width / SEG_X;
    const cols = SEG_X + 1;
    const span = p * (1 + LEAD);

    for (let j = 0; j <= SEG_Y; j++) {
      const v = 0.5 - j / SEG_Y;
      let x = 0;
      let z = 0;
      for (let i = 0; i <= SEG_X; i++) {
        if (i > 0) {
          const u = (i - 0.5) / SEG_X;
          // The free edge leads: forward it lifts first, backward it lands first.
          const lag = direction === "next" ? LEAD * (1 - u) : LEAD * u;
          let q = span - lag + CORNER_TILT * bend * v * u;
          q = Math.min(1, Math.max(0, q));
          const a = Math.PI * q * q * (3 - 2 * q);
          x += Math.cos(a) * ds;
          z += Math.sin(a) * ds;
        }
        const idx = j * cols + i;
        pos.setXYZ(idx, spineX + x, centerY + v * rect.height, 2 + z * 0.55);
      }
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const image = texture?.image as { width?: number } | undefined;
    if (backTexture && image?.width && !backSynced.current) {
      backTexture.needsUpdate = true;
      backSynced.current = true;
    }
    if (shadowRef.current) shadowRef.current.opacity = 0.42 * bend;
  });

  return (
    <>
      <mesh position={[spineX + rect.width / 2, centerY, 0.5]}>
        <planeGeometry args={[rect.width, rect.height]} />
        <meshBasicMaterial ref={shadowRef} color="#000000" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry} frustumCulled={false}>
        <meshStandardMaterial map={texture ?? undefined} side={THREE.FrontSide} roughness={0.92} metalness={0} />
      </mesh>
      {backTexture && (
        <mesh geometry={geometry} frustumCulled={false}>
          <meshStandardMaterial
            map={backTexture}
            transparent
            opacity={BACK_OPACITY}
            depthWrite={false}
            side={THREE.BackSide}
            roughness={1}
            metalness={0}
          />
        </mesh>
      )}
    </>
  );
}

/** Keeps 1 world unit = 1 CSS pixel of the actual canvas, not a stale container size. */
function CameraRig() {
  const camera = useThree((s) => s.camera);
  const height = useThree((s) => s.size.height);
  const distance = height > 0 ? height / 2 / Math.tan((FOV * Math.PI) / 360) : 1;
  useEffect(() => {
    camera.position.set(0, 0, distance);
    camera.far = distance * 4;
    camera.updateProjectionMatrix();
  }, [camera, distance]);
  return null;
}

export function PageFlip3D({
  direction,
  progressRef,
  rect,
  viewport,
  frontSrc,
  frontMasks,
  expandT = 1,
}: {
  direction: FlipDirection | null;
  progressRef: React.MutableRefObject<number>;
  rect: PageRect;
  viewport: { w: number; h: number };
  frontSrc?: string;
  frontMasks?: SpoilerMask[];
  expandT?: number;
}) {
  if (viewport.w <= 0 || viewport.h <= 0) return null;
  const distance = viewport.h / 2 / Math.tan((FOV * Math.PI) / 360);
  const active = !!direction && rect.width > 0 && rect.height > 0;
  const isMobile = viewport.w < 768;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 26, visibility: active ? "visible" : "hidden" }}
    >
      <Canvas
        flat
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        frameloop={active ? "always" : "demand"}
        gl={{ alpha: true, antialias: true }}
        camera={{ fov: FOV, position: [0, 0, distance], near: 1, far: distance * 4 }}
        style={{ width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <CameraRig />
        <ambientLight intensity={0.86} />
        <directionalLight position={[0.4, 0.6, 1]} intensity={0.3} />
        {active && direction && (
          <Sheet
            direction={direction}
            progressRef={progressRef}
            rect={rect}
            viewport={viewport}
            frontSrc={frontSrc}
            frontMasks={frontMasks}
            expandT={expandT}
          />
        )}
      </Canvas>
    </div>
  );
}
