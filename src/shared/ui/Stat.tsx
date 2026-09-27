import { cx } from "@/shared/lib/cx";

export interface StatEntry {
  value: string;
  label: string;
}

const sizes = {
  lg: { value: "text-5xl", label: "text-sm" },
  md: { value: "text-[1.75rem]", label: "text-[0.8125rem]" }
} as const;

// dt comes first in the DOM (label, then value) but the value shows on top.
export function Stat({
  value,
  label,
  size = "md"
}: StatEntry & { size?: keyof typeof sizes }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className={cx("text-fg-muted", sizes[size].label)}>{label}</dt>
      <dd
        className={cx(
          "text-accent font-mono font-medium tracking-[-0.02em]",
          sizes[size].value
        )}
      >
        {value}
      </dd>
    </div>
  );
}
