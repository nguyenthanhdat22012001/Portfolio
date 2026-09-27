import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import { Eyebrow } from "./Eyebrow";

const sizes = {
  lg: "text-3xl font-semibold md:text-[2.5rem]",
  xl: "text-[2.5rem] font-bold tracking-[-0.03em] md:text-[4rem]"
} as const;

export function SectionHeading({
  id,
  index,
  label,
  size = "lg",
  children
}: {
  id: string;
  index: number;
  label: string;
  size?: keyof typeof sizes;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Eyebrow tone="accent">
        {String(index).padStart(2, "0")} / {label}
      </Eyebrow>
      <h2 id={id} className={cx("leading-[1.1]", sizes[size])}>
        {children}
      </h2>
    </div>
  );
}
