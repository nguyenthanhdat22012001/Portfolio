import { getTranslations } from "next-intl/server";
import { cx } from "@/shared/lib/cx";

// Desktop overlaps the cards like a deck; mobile shows a plain list.
const placement = [
  "md:top-0 md:right-20 md:left-0 md:h-[16.25rem]",
  "md:top-20 md:right-10 md:left-10 md:h-[16.25rem]",
  "md:top-[10.625rem] md:right-0 md:left-20 md:h-[16.875rem]"
];

// Phase 4 pins these cards and flips through them step by step.
export async function SafeBulkVisual() {
  const t = await getTranslations("work.safebulk");
  const steps = t.raw("steps") as string[];

  return (
    <figure>
      <figcaption className="sr-only">{t("caption")}</figcaption>
      <ol className="flex flex-col gap-3 md:relative md:block md:h-[27.5rem]">
        {steps.map((step, index) => {
          const active = index === steps.length - 1;
          return (
            <li
              key={step}
              className={cx(
                "rounded-card flex flex-col gap-3 border p-5 md:absolute md:p-7",
                placement[index],
                active ? "border-accent bg-bg-elevated" : "border-border bg-bg"
              )}
            >
              <span
                className={cx(
                  "font-mono text-xs tracking-[0.08em] uppercase",
                  active ? "text-accent" : "text-fg-muted"
                )}
              >
                {t("stepLabel", { number: index + 1 })}
              </span>
              <span
                className={cx(
                  "font-mono text-lg md:text-xl",
                  active ? "text-fg" : "text-fg-muted"
                )}
              >
                {step}
              </span>
              {active ? (
                <div aria-hidden="true" className="flex flex-col gap-2">
                  <div className="bg-bg-muted h-2.5 w-[90%] rounded-xs" />
                  <div className="bg-bg-muted h-2.5 w-[70%] rounded-xs" />
                  <div className="bg-earth h-2.5 w-[80%] rounded-xs" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
