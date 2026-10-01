import { Children, Fragment, type ReactNode } from "react";
import { cx } from "@/shared/lib/cx";

// These symbols are drawn as SVG rather than typed: →, ↗, ← and ≤ sit outside
// the preloaded latin/vietnamese subsets, so a single one makes the browser
// fetch extra font files (symbols, math) late: HTML → CSS → woff2.
// e2e/fonts.spec.ts guards the outcome.
const paths = {
  "arrow-right": "M3 8h10M9 4l4 4-4 4",
  "arrow-up-right": "M4.5 11.5l7-7M6 4.5h5.5V10",
  "arrow-left": "M13 8H3M7 4L3 8l4 4",
  "less-equal": "M11.5 3L4.5 6.5l7 3.5M4.5 13h7"
} as const;

type GlyphName = keyof typeof paths;

export function Glyph({
  name,
  label,
  className
}: {
  name: GlyphName;
  /** Omit for a decorative glyph; pass when it carries meaning. */
  label?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("inline-block align-[-0.125em]", className)}
      {...(label
        ? { role: "img", "aria-label": label }
        : { "aria-hidden": true })}
    >
      <path d={paths[name]} />
    </svg>
  );
}

const symbols: Record<string, GlyphName> = {
  "→": "arrow-right",
  "↗": "arrow-up-right",
  "←": "arrow-left",
  "≤": "less-equal"
};
const symbolPattern = /([→↗←≤])/;

/** Renders `text` with each symbol swapped for a labelled `<Glyph>`. */
export function GlyphText({ text }: { text: string }) {
  if (!symbolPattern.test(text)) return text;
  return text.split(symbolPattern).map((part, i) => {
    const name = symbols[part];
    return (
      <Fragment key={i}>
        {name ? <Glyph name={name} label={part} /> : part}
      </Fragment>
    );
  });
}

/** Applies `GlyphText` to the string children of authored content (MDX). */
export function withGlyphs(children: ReactNode) {
  return Children.map(children, (child) =>
    typeof child === "string" ? <GlyphText text={child} /> : child
  );
}
