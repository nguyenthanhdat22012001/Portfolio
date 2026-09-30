import { getTranslations } from "next-intl/server";
import { cx } from "@/shared/lib/cx";

// Below md the panes size to their content; at md+ they are bounded by the
// 16:10 frame. motion/cls-demo.ts only transforms, clips, and fades inside
// them. The static markup is each pane's final
// state, which is what mobile, reduced-motion, and no-JS visitors see.
function Pane({
  layer,
  label,
  shiftLabel
}: {
  layer: "before" | "after";
  label: string;
  shiftLabel?: string;
}) {
  const isAfter = layer === "after";
  return (
    <div
      aria-hidden="true"
      data-layer={layer}
      className="rounded-card border-border bg-bg relative flex flex-col gap-3 overflow-hidden border p-4"
    >
      <span
        className={cx(
          "font-mono text-[0.6875rem] tracking-[0.08em] uppercase",
          isAfter ? "text-accent" : "text-fg-muted"
        )}
      >
        {label}
      </span>
      <div className="bg-bg-muted h-3 w-1/2 shrink-0 rounded-xs" />
      <div
        data-async-block=""
        className={cx(
          "relative h-24 shrink-0 overflow-hidden rounded-xs",
          isAfter ? "bg-border" : "border-border bg-bg-elevated border"
        )}
      >
        {isAfter ? (
          <>
            <div className="via-bg-elevated/60 absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent to-transparent motion-safe:animate-[shimmer_1.6s_linear_infinite]" />
            <div
              data-async-content=""
              className="border-border bg-bg-elevated absolute inset-0 rounded-xs border"
            />
          </>
        ) : null}
      </div>
      <div className="relative">
        {isAfter ? null : (
          // Where the cards sat before the async block pushed them down:
          // one block height (h-24) plus one gap (gap-3) above.
          <div
            data-ghost=""
            className="border-border absolute inset-x-0 -top-[6.75rem] h-14 rounded-xs border border-dashed"
          />
        )}
        <div data-cards="" className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((card) => (
            <div
              key={card}
              className="border-border bg-bg-elevated h-14 rounded-xs border"
            />
          ))}
        </div>
      </div>
      {shiftLabel ? (
        <span data-shift-marker="" className="text-fg-muted font-mono text-xs">
          {shiftLabel}
        </span>
      ) : null}
    </div>
  );
}

export async function ClsDemo() {
  const t = await getTranslations("work.oneloyalty.cls");

  return (
    <div
      data-cls-demo=""
      className="grid gap-4 md:aspect-[16/10] md:grid-cols-2"
    >
      <p className="sr-only">{t("summary")}</p>
      <Pane layer="before" label={t("before")} shiftLabel={t("shift")} />
      <Pane layer="after" label={t("after")} />
    </div>
  );
}
