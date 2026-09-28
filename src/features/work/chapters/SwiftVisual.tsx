import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/shared/ui/Eyebrow";

const markers = ["①", "②", "③"];

export async function SwiftVisual() {
  const t = await getTranslations("work.swift");
  const steps = t.raw("steps") as string[];

  return (
    <figure className="rounded-card bg-bg-elevated flex flex-col justify-center gap-8 p-6 md:min-h-[27.5rem] md:p-10">
      <figcaption>
        <Eyebrow>{t("caption")}</Eyebrow>
      </figcaption>
      <div className="flex flex-col gap-2.5">
        <div
          aria-hidden="true"
          data-swift-bar="before"
          className="bg-bg-muted h-3 w-full origin-left rounded-xs"
        />
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-fg-muted font-mono text-sm line-through">
            {t("beforeLabel", { value: t("beforeValue") })}
          </p>
          {/* Filled in by features/work/motion/swift.ts; empty without JS. */}
          <span
            aria-hidden="true"
            data-swift-timer=""
            className="text-fg-muted font-mono text-sm tabular-nums"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        <div
          aria-hidden="true"
          data-swift-bar="after"
          className="bg-accent h-3 w-[15%] origin-left rounded-xs"
        />
        <p
          data-swift-after=""
          className="text-accent font-mono text-5xl font-medium tracking-[-0.02em]"
        >
          {t("afterValue")}
        </p>
      </div>
      <ol className="text-fg-muted flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">
        {steps.map((step, index) => (
          <li key={step} data-swift-step="">
            <span aria-hidden="true">{markers[index]} </span>
            {step}
          </li>
        ))}
      </ol>
    </figure>
  );
}
