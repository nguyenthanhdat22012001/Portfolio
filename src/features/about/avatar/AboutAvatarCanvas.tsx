"use client";

import {
  PerformanceMonitor,
  type PerformanceMonitorApi
} from "@react-three/drei/core/PerformanceMonitor";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { WebGLRenderer } from "three";
import { useStore } from "zustand";
import { TIER_DPR } from "@/shared/three/detect-tier";
import { declineAction, monitorBounds } from "@/shared/three/perf-policy";
import { qualityStore } from "@/shared/three/quality-store";
import Avatar from "./Avatar";
import { AVATAR } from "./avatar.config";
import type { AvatarSignals } from "./avatar-signals";
import { aboutFrame } from "./choreography";
import { useAccentColor } from "./useAccentColor";

const FRAME = aboutFrame(AVATAR.camera.fov);

export interface AboutAvatarCanvasProps {
  slot: HTMLElement;
  signals: AvatarSignals;
  bubble: string;
  onFail: () => void;
}

// Renders only while the slot is on screen (design D1): leaving pauses the
// intro clock, coming back resumes it. Starts paused: the observer reports
// the real state on its first callback, so an off-screen mount renders nothing.
function useInView(el: Element): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry?.isIntersecting ?? false)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return inView;
}

// A helper, not inline: the React Compiler lint rejects mutating a prop.
function writeGlStats(slot: HTMLElement, info: WebGLRenderer["info"]) {
  slot.dataset.glGeometries = String(info.memory.geometries);
  slot.dataset.glTextures = String(info.memory.textures);
  slot.dataset.glCalls = String(info.render.calls);
}

function clearGlStats(slot: HTMLElement) {
  delete slot.dataset.glGeometries;
  delete slot.dataset.glTextures;
  delete slot.dataset.glCalls;
}

// Renderer counters on the slot for the e2e leak and draw-call checks.
function GlStats({ slot }: { slot: HTMLElement }) {
  const frame = useRef(0);
  useFrame(({ gl }) => {
    frame.current += 1;
    if (frame.current % 30 !== 1) return;
    writeGlStats(slot, gl.info);
  });
  // No stale values after a fallback.
  useEffect(() => () => clearGlStats(slot), [slot]);
  return null;
}

// Entry of the about-avatar chunk.
export default function AboutAvatarCanvas({
  slot,
  signals,
  bubble,
  onFail
}: AboutAvatarCanvasProps) {
  const level = useStore(qualityStore, (state) => state.level ?? "low");
  const visible = useInView(slot);
  const accent = useAccentColor();

  // Our own Off rule (perf-policy), never drei's flipflops/onFallback.
  const onDecline = (api: PerformanceMonitorApi) => {
    const action = declineAction(level, api.averages);
    if (action === "downgrade") qualityStore.getState().downgrade();
    else if (action === "off") onFail();
  };

  return (
    <Canvas
      dpr={TIER_DPR[level]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      // Looks straight down -Z: the avatar at end.z is screenHeight of the slot.
      camera={{
        fov: AVATAR.camera.fov,
        near: 0.1,
        far: 30,
        position: [0, FRAME.cameraY, FRAME.cameraZ],
        // Without a rotation R3F calls lookAt(0, 0, 0), tilting the camera
        // down and lifting the avatar out of the frame.
        rotation: [0, 0, 0]
      }}
      flat
      frameloop={visible ? "always" : "never"}
      eventSource={slot}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener(
          "webglcontextlost",
          (event) => {
            event.preventDefault();
            gl.forceContextLoss = () => {}; // already lost; avoid three's warning
            onFail();
          },
          { once: true }
        );
      }}
    >
      {/* Same levels as the Hero (physically based lights + flat). */}
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <PerformanceMonitor
        bounds={(refreshrate) => monitorBounds(level, refreshrate)}
        onDecline={onDecline}
      />
      <Avatar
        tier={level}
        slot={slot}
        bubble={bubble}
        accent={accent}
        signals={signals}
        onFail={onFail}
      />
      <GlStats slot={slot} />
    </Canvas>
  );
}
