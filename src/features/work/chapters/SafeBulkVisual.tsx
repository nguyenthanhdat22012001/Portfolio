import { getTranslations } from "next-intl/server";
import { cx } from "@/shared/lib/cx";

// Desktop overlaps the cards like a deck; mobile shows a plain list.
const placement = [
  "md:top-0 md:right-20 md:left-0 md:h-[16.25rem]",
  "md:top-20 md:right-10 md:left-10 md:h-[16.25rem]",
  "md:top-[10.625rem] md:right-0 md:left-20 md:h-[16.875rem]"
];

export async function SafeBulkVisual() {
  const t = await getTranslations("work.safebulk");
  const steps = t.raw("steps") as string[];

  return (
    <figure>
      <figcaption className="sr-only">{t("caption")}</figcaption>
      <ol className="flex flex-col gap-3 md:relative md:block md:h-[27.5rem]">
        {steps.map((step, index) => (
          <li
            key={step}
            data-safebulk-card=""
            data-active={index === steps.length - 1 ? "" : undefined}
            className={cx(
              "group rounded-card border-border bg-bg data-active:border-accent data-active:bg-bg-elevated flex flex-col gap-3 border p-5 md:absolute md:p-7",
              placement[index]
            )}
          >
            <span className="text-fg-muted group-data-active:text-accent font-mono text-xs tracking-[0.08em] uppercase">
              {t("stepLabel", { number: index + 1 })}
            </span>
            <span className="text-fg-muted group-data-active:text-fg font-mono text-lg md:text-xl">
              {step}
            </span>
            <div
              aria-hidden="true"
              className="hidden flex-col gap-2 group-data-active:flex"
            >
              <div className="bg-bg-muted h-2.5 w-[90%] rounded-xs" />
              <div className="bg-bg-muted h-2.5 w-[70%] rounded-xs" />
              <div className="bg-earth h-2.5 w-[80%] rounded-xs" />
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}
