"use client";

import {
  PerformanceMonitor,
  type PerformanceMonitorApi
} from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { setConsoleFunction } from "three";
import {
  detectTier,
  readTierEnv,
  type RenderTier
} from "../quality/detect-tier";
import { declineAction, monitorBounds } from "../quality/perf-policy";
import { useQualityTier } from "../quality/useQualityTier";
import { CAMERA_FOV } from "./graph-frame";
import { HeroScene } from "./HeroScene";

// R3F 9.8 still constructs THREE.Clock, which three 0.18x warns about on every
// canvas mount. Drop only that message; everything else reaches the console.
setConsoleFunction((type, message, ...params) => {
  if (
    type === "warn" &&
    message.includes("Clock: This module has been deprecated")
  )
    return;
  console[type](message, ...params);
});

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

export default function HeroCanvas({
  slot,
  onLive,
  onFallback,
  onTier
}: HeroCanvasProps) {
  const [initial] = useState(() => detectTier(readTierEnv(slot)));
  const tier = useQualityTier(initial);
  const visible = useInView(slot);

  useEffect(() => onTier(tier.level), [tier.level, onTier]);

  // drei's own flipflops/onFallback also count inclines, so a steady 60 fps
  // would trip them; Off is decided here from declines only (perf-policy).
  const onDecline = (api: PerformanceMonitorApi) => {
    const action = declineAction(tier.level, api.averages);
    if (action === "downgrade") tier.downgrade();
    else if (action === "off") onFallback();
  };

  return (
    <Canvas
      className="hero-graph-canvas"
      dpr={tier.dpr}
      gl={{
        antialias: false,
        alpha: true,
        powerPreference: "high-performance"
      }}
      camera={{ fov: CAMERA_FOV, near: 0.1, far: 50, position: [0, 0, 9] }}
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
            // The context is already gone; three's dispose-time forceContextLoss would
            // warn that WEBGL_lose_context is unsupported on a lost context.
            gl.forceContextLoss = () => {};
            onFallback();
          },
          { once: true }
        );
        requestAnimationFrame(() => onLive());
      }}
    >
      {/* Lights are physically based (r155+): the spec's 0.6/1.1 are ~pi too dim; `flat` skips tone mapping so layer colors stay near their tokens. */}
      <ambientLight intensity={1.6} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} />
      <PerformanceMonitor
        bounds={(refreshrate) => monitorBounds(tier.level, refreshrate)}
        onDecline={onDecline}
      />
      <HeroScene tier={tier.level} slot={slot} />
      <GlStats />
    </Canvas>
  );
}
