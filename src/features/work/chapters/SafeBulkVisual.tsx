import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";

// Phase 4 pins these cards and flips through them step by step.
export async function SafeBulkVisual() {
  const t = await getTranslations("work.safebulk");
  const steps = t.raw("steps") as string[];

  return (
    <figure className="rounded-card border border-border bg-bg-elevated p-6">
      <figcaption className="font-mono text-sm text-fg-muted">
        {t("caption")}
      </figcaption>
      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step}
            className="rounded-card border border-border bg-bg p-4"
            style={{ marginLeft: `${index * 1.25}rem` }}
          >
            <span className="block font-mono text-xs text-accent">
              {t("stepLabel", { number: index + 1 })}
            </span>
            <span className="mt-1 block">{step}</span>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap gap-4 font-mono text-sm">
        <a
          href={site.safebulkRepo}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-4"
        >
          {t("github")}
        </a>
        <a
          href={site.safebulkDemo}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-4"
        >
          {t("demo")}
        </a>
      </div>
    </figure>
  );
}
