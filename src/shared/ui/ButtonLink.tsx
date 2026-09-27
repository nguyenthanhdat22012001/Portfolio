import type { ComponentProps } from "react";
import { cx } from "@/shared/lib/cx";

const variants = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "border border-border text-fg hover:border-accent hover:text-accent"
} as const;

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"a"> & { variant?: keyof typeof variants }) {
  return (
    <a
      className={cx(
        "inline-flex items-center justify-center rounded-card px-5 py-3 font-mono text-sm font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
