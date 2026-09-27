import type { ComponentProps } from "react";
import { cx } from "@/shared/lib/cx";

const variants = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary:
    "border border-border text-fg hover:border-accent hover:text-accent"
} as const;

const sizes = {
  md: "h-12 px-6 text-[0.9375rem]",
  lg: "h-14 px-7 text-base"
} as const;

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"a"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <a
      className={cx(
        "inline-flex items-center justify-center rounded-md font-mono font-semibold transition-colors",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
