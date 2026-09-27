import type { ComponentProps } from "react";
import { cx } from "@/shared/lib/cx";

// Reserves space for media that arrives later (photo, 3D canvas); callers set
// the aspect ratio so swapping in the real thing causes no layout shift.
export function PlaceholderSlot({
  className,
  ...props
}: Omit<ComponentProps<"div">, "children">) {
  return (
    <div
      {...props}
      aria-hidden="true"
      className={cx(
        "rounded-card border-border border border-dashed",
        className
      )}
    />
  );
}
