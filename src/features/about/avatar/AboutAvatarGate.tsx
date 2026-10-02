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
import { readGateEnv } from "@/shared/three/decide-gate";
import { readTierEnv } from "@/shared/three/detect-tier";
import { qualityStore } from "@/shared/three/quality-store";
import { decideAvatarPath } from "./avatar-path";
import {
  MOUNT_MARGIN,
  START_MARGIN,
  createAvatarSignals,
  type GateSignals
} from "./avatar-signals";

// The only avatar code in the initial bundle. three.js, the canvas and the
// avatar load in the about-avatar chunk once this gate decides to mount.
const AboutAvatarCanvas = dynamic(
  () => import(/* webpackChunkName: "about-avatar" */ "./AboutAvatarCanvas"),
  { ssr: false, loading: () => null }
);

const SLOT_ID = "about-avatar-slot";
// Matches the image's fade back in (.about-avatar-fallback transition, globals.css).
const FADE_OUT_MS = 400;

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
      console.warn("[about-avatar] canvas failed, showing the image", error);
    }
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface Live {
  slot: HTMLElement;
  signals: GateSignals;
}

export function AboutAvatarGate({ bubble }: { bubble: string }) {
  const [live, setLive] = useState<Live | null>(null);
  const liveRef = useRef<Live | null>(null);
  const failedRef = useRef(false);
  const unmountTimer = useRef<number | undefined>(undefined);

  // One path for every loss of the 3D avatar (design D8): static idle image,
  // counters released, canvas unmounted after the fade.
  const fail = useCallback(() => {
    const current = liveRef.current;
    if (!current || failedRef.current) return;
    failedRef.current = true;
    current.slot.dataset.gate = "fallback";
    current.signals.lost();
    unmountTimer.current = window.setTimeout(() => setLive(null), FADE_OUT_MS);
  }, []);

  useEffect(() => {
    const slot = document.getElementById(SLOT_ID);
    if (!slot) return;
    const signals = createAvatarSignals(slot, slot.closest("section"));
    const tier = qualityStore.getState().init(readTierEnv());
    const path = decideAvatarPath(readGateEnv(), tier);

    if (path === "fallback") {
      slot.dataset.gate = "fallback";
      return () => signals.dispose();
    }
    slot.dataset.gate = "pending";
    if (path === "low") slot.dataset.tier = "low";
    else signals.hold();

    // "top 70%" without GSAP. A slot already above the viewport (landing on
    // #contact) counts as crossed.
    const start = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          signals.setTriggered();
          start.disconnect();
        }
      },
      { rootMargin: START_MARGIN }
    );
    start.observe(slot);

    const visible = new IntersectionObserver(([entry]) =>
      signals.setInView(entry?.isIntersecting ?? false)
    );
    visible.observe(slot);

    let mount: IntersectionObserver | undefined;
    const armMount = () => {
      mount = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          mount?.disconnect();
          // The Hero canvas may have stepped the shared tier down meanwhile.
          if (qualityStore.getState().level === "low") {
            slot.dataset.tier = "low";
            signals.lost();
            return;
          }
          slot.dataset.gate = "mount";
          const next = { slot, signals };
          liveRef.current = next;
          setLive(next);
        },
        { rootMargin: MOUNT_MARGIN }
      );
      mount.observe(slot);
    };
    // The slot can start inside the 400px margin on a short desktop viewport;
    // waiting for the first scroll keeps the chunk and the GLB off the initial
    // load (design D8).
    if (path === "3d") {
      window.addEventListener("scroll", armMount, {
        once: true,
        passive: true
      });
    }

    return () => {
      window.removeEventListener("scroll", armMount);
      start.disconnect();
      visible.disconnect();
      mount?.disconnect();
      signals.dispose();
      window.clearTimeout(unmountTimer.current);
      liveRef.current = null;
      failedRef.current = false;
    };
  }, []);

  if (!live) return null;
  return (
    <CanvasBoundary onError={fail}>
      <AboutAvatarCanvas
        slot={live.slot}
        signals={live.signals}
        bubble={bubble}
        onFail={fail}
      />
    </CanvasBoundary>
  );
}
