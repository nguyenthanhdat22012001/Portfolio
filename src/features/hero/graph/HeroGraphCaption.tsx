import { cx } from "@/shared/lib/cx";
import { GlyphText } from "@/shared/ui/Glyph";

interface CaptionLabels {
  app: string;
  feature: string;
  shared: string;
  chaos: string;
  layered: string;
  description: string;
}

// Accessible counterpart of the decorative graph. Both lines are rendered;
// globals.css shows the one matching data-morph / data-gate on the wrapper.
export function HeroGraphCaption({ labels }: { labels: CaptionLabels }) {
  const legend = [
    ["bg-accent", labels.app],
    ["bg-silver", labels.feature],
    ["bg-earth", labels.shared]
  ] as const;

  return (
    <div className="text-fg-muted flex flex-col gap-2 font-mono text-xs">
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {legend.map(([swatch, label]) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={cx("size-2 rounded-full", swatch)}
            />
            {label}
          </li>
        ))}
      </ul>
      <p aria-live="off" className="grid">
        <span data-caption-line="chaos">{labels.chaos}</span>
        <span data-caption-line="layered">
          <GlyphText text={labels.layered} />
        </span>
      </p>
      <p className="sr-only">{labels.description}</p>
    </div>
  );
}
