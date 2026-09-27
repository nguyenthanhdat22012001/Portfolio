import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";

const widths = {
  default: "max-w-5xl",
  narrow: "max-w-3xl",
  wide: "max-w-[80rem] lg:px-10"
} as const;

export function Container({
  size = "default",
  className,
  children
}: {
  size?: keyof typeof widths;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("mx-auto w-full px-4 sm:px-6", widths[size], className)}>
      {children}
    </div>
  );
}
