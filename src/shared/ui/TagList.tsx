import { motion } from "@/shared/animation/motion";
import { cx } from "@/shared/lib/cx";

const variants = {
  outline: "border border-border px-2.5 py-1 text-xs text-fg-muted",
  filled: "bg-bg-elevated px-3 py-1.5 text-[0.8125rem] text-fg"
} as const;

export function TagList({
  tags,
  variant = "outline",
  stagger = false,
  className
}: {
  tags: readonly string[];
  variant?: keyof typeof variants;
  stagger?: boolean;
  className?: string;
}) {
  return (
    <ul
      className={cx("flex flex-wrap gap-2", className)}
      {...(stagger ? motion("stagger") : {})}
    >
      {tags.map((tag) => (
        <li key={tag} className={cx("rounded-xs font-mono", variants[variant])}>
          {tag}
        </li>
      ))}
    </ul>
  );
}
