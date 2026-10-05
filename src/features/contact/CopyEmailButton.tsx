"use client";

import { useEffect, useState } from "react";
import type { TrackAttrs } from "@/shared/analytics/events";

// Client-only because the Clipboard API needs a click handler. The mailto
// link rendered beside it is the fallback without JS or clipboard access.
export function CopyEmailButton({
  email,
  label,
  copiedLabel,
  className,
  trackAttrs
}: {
  email: string;
  label: string;
  copiedLabel: string;
  className?: string;
  trackAttrs?: TrackAttrs;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      // Clipboard unavailable or denied; the mailto link still works.
    }
  }

  return (
    <>
      <button type="button" onClick={copy} className={className} {...trackAttrs}>
        {copied ? copiedLabel : label}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}
