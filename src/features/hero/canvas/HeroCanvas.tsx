"use client";

import { PerformanceMonitor, type PerformanceMonitorApi } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { setConsoleFunction } from "three";
import { LOW_FPS_FLOOR, detectTier, readTierEnv, type RenderTier } from "../quality/detect-tier";
import { useQualityTier } from "../quality/useQualityTier";
import { HeroScene } from "./HeroScene";

// R3F 9.8 still constructs THREE.Clock, which three 0.18x warns about on every
// canvas mount. Drop only that message; everything else reaches the console.
setConsoleFunction((type, message, ...params) => {
  if (type === "warn" && message.includes("Clock: This module has been deprecated")) return;
  console[type](message, ...params);
});

const PerfOverlay =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("./PerfOverlay"), { ssr: false })
    : null;

export interface HeroCanvasProps {
  slot: HTMLDivElement;
  onLive: () => void;
  onFallback: () => void;
  onTier: (level: RenderTier) => void;
}

function useInView(el: Element): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry?.isIntersecting ?? true)
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return inView;
}

// Publishes renderer counters on the graph wrapper for the e2e leak and
// draw-call checks (same idea as data-motion-triggers).
function GlStats() {
  const frame = useRef(0);
  useFrame(({ gl }) => {
    frame.current += 1;
    if (frame.current % 30 !== 1) return;
    const root = gl.domElement.closest<HTMLElement>("[data-hero-graph]");
    if (!root) return;
    root.dataset.glGeometries = String(gl.info.memory.geometries);
    root.dataset.glTextures = String(gl.info.memory.textures);
    root.dataset.glCalls = String(gl.info.render.calls);
  });
  return null;
}

export default function HeroCanvas({ slot, onLive, onFallback, onTier }: HeroCanvasProps) {
  const [initial] = useState(() => detectTier(readTierEnv(slot)));
  const tier = useQualityTier(initial);
  const visible = useInView(slot);

  useEffect(() => onTier(tier.level), [tier.level, onTier]);

  const onDecline = (api: PerformanceMonitorApi) => {
    if (tier.level === "low" && api.fps < LOW_FPS_FLOOR) onFallback();
    else tier.downgrade();
  };

  return (
    <Canvas
      className="hero-graph-canvas"
      dpr={tier.dpr}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 45, near: 0.1, far: 50, position: [0, 0, 9] }}
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
            onFallback();
          },
          { once: true }
        );
        requestAnimationFrame(() => onLive());
      }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <PerformanceMonitor onDecline={onDecline} onFallback={onFallback} flipflops={3} />
      <HeroScene tier={tier.level} />
      <GlStats />
      {PerfOverlay && <PerfOverlay />}
    </Canvas>
  );
}
