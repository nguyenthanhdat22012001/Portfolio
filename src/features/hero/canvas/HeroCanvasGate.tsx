"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";
import { onFirstInteraction } from "@/shared/animation/load-trigger";
import type { RenderTier } from "../quality/detect-tier";
import { decideGate, readGateEnv } from "./decide-gate";
import { afterLoadIdle } from "./schedule";

// The only hero 3D code in the initial bundle. three.js and the scene load
// in HeroCanvas's lazy chunk once this gate decides to mount.
const HeroCanvas = dynamic(() => import("./HeroCanvas"), {
  ssr: false,
  loading: () => null
});

const SLOT_ID = "hero-canvas-slot";
const FADE_OUT_MS = 300;

type Gate = "pending" | "mount" | "live" | "fallback";

// Survives client navigations: once someone has interacted, returning to
// Home mounts without waiting for another interaction.
let interacted = false;

class CanvasBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[hero-3d] canvas failed, showing the static graph", error);
    }
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function HeroCanvasGate() {
  const rootRef = useRef<HTMLElement | null>(null);
  const failedRef = useRef(false);
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);

  const setGate = useCallback((gate: Gate) => {
    if (rootRef.current) rootRef.current.dataset.gate = gate;
  }, []);

  const toFallback = useCallback(() => {
    if (failedRef.current) return;
    failedRef.current = true;
    setGate("fallback");
    window.setTimeout(() => setSlot(null), FADE_OUT_MS);
  }, [setGate]);

  const onLive = useCallback(() => {
    if (!failedRef.current) setGate("live");
  }, [setGate]);

  const onTier = useCallback((level: RenderTier) => {
    if (rootRef.current) rootRef.current.dataset.tier = level;
  }, []);

  useEffect(() => {
    const el = document.getElementById(SLOT_ID);
    if (!(el instanceof HTMLDivElement)) return;
    rootRef.current = el.closest<HTMLElement>("[data-hero-graph]");

    const decision = decideGate(readGateEnv());
    if (decision === "fallback") {
      setGate("fallback");
      return;
    }

    let observer: IntersectionObserver | undefined;
    const mountWhenVisible = () => {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer?.disconnect();
          setGate("mount");
          setSlot(el);
        },
        { rootMargin: "200px" }
      );
      observer.observe(el);
    };

    let cancel: () => void;
    if (decision === "wait-idle") {
      cancel = afterLoadIdle(mountWhenVisible);
    } else if (interacted) {
      mountWhenVisible();
      cancel = () => {};
    } else {
      cancel = onFirstInteraction(() => {
        interacted = true;
        mountWhenVisible();
      });
    }

    return () => {
      cancel();
      observer?.disconnect();
    };
  }, [setGate]);

  if (!slot) return null;
  return (
    <CanvasBoundary onError={toFallback}>
      <HeroCanvas
        slot={slot}
        onLive={onLive}
        onFallback={toFallback}
        onTier={onTier}
      />
    </CanvasBoundary>
  );
}
