"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { MotionHandle } from "@/shared/animation/engine";
import { onFirstInteraction } from "@/shared/animation/load-trigger";

// Ships no animation code. GSAP and Lenis arrive in one lazy chunk on the
// visitor's first scroll, pointer move, key press, or touch; until then (and
// if the chunk fails) the page is the fully readable static site.
export function MotionRoot() {
  const pathname = usePathname();
  const handle = useRef<MotionHandle | null>(null);

  useEffect(() => {
    let active = true;
    const cancel = onFirstInteraction(() => {
      import("./motion-entry")
        .then(({ start }) => {
          if (active) handle.current = start();
        })
        .catch(() => {
          // Stay static.
        });
    });
    return () => {
      active = false;
      cancel();
      handle.current?.dispose();
      handle.current = null;
    };
  }, []);

  useEffect(() => {
    // Next applies the #hash scroll right after commit; scanning a frame later
    // makes isAtOrAboveViewport see the landed scroll position, not the top.
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) handle.current?.rescan();
      });
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
