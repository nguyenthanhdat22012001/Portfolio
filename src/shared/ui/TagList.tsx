import { cx } from "@/shared/lib/cx";

export function TagList({
  tags,
  className
}: {
  tags: readonly string[];
  className?: string;
}) {
  return (
    <ul className={cx("flex flex-wrap gap-2", className)}>
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full border border-border px-3 py-1 font-mono text-xs text-fg-muted"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
