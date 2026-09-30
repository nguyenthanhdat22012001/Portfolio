import { magnetic, motion } from "@/shared/animation/motion";
import { cx } from "@/shared/lib/cx";

export type TagItem = string | { name: string; note: string };

const variants = {
  outline: "border border-border px-2.5 py-1 text-xs text-fg-muted",
  filled: "bg-bg-elevated px-3 py-1.5 text-[0.8125rem] text-fg"
} as const;

export function TagList({
  tags,
  variant = "outline",
  stagger = false,
  className,
  magneticStrength
}: {
  tags: readonly TagItem[];
  variant?: keyof typeof variants;
  stagger?: boolean;
  className?: string;
  magneticStrength?: number;
}) {
  return (
    <ul
      className={cx("flex flex-wrap gap-2", className)}
      {...(stagger ? motion("stagger") : {})}
    >
      {tags.map((tag) => {
        const { name, note } =
          typeof tag === "string" ? { name: tag, note: undefined } : tag;
        return (
          <li
            key={name}
            className={cx("rounded-xs font-mono", variants[variant])}
            {...(magneticStrength ? magnetic(magneticStrength) : {})}
          >
            {name}
            {note ? <span className="text-fg-muted"> {note}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
