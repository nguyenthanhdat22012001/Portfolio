import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";

// Uppercased by CSS so the message catalogs stay in sentence case.
export function Eyebrow({
  tone = "muted",
  className,
  children
}: {
  tone?: "muted" | "accent";
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      className={cx(
        "font-mono text-xs font-medium tracking-[0.08em] uppercase",
        tone === "accent" ? "text-accent" : "text-fg-muted",
        className
      )}
    >
      {children}
    </p>
  );
}
