import type { SVGProps } from "react";
import { getTranslations } from "next-intl/server";
import { cx } from "@/shared/lib/cx";
import { Eyebrow } from "@/shared/ui/Eyebrow";

const states = ["pending", "running", "failed", "done"] as const;
type State = (typeof states)[number];

// Every state's icon and label is rendered, stacked in one grid cell; CSS
// shows the one matching the row's data-state. The effect only flips that
// attribute, so a row never changes size.
const cell = "[grid-area:1/1] opacity-0 transition-opacity duration-200";
const visibleWhen: Record<State, string> = {
  pending: "group-data-[state=pending]:opacity-100",
  running: "group-data-[state=running]:opacity-100",
  failed: "group-data-[state=failed]:opacity-100",
  done: "group-data-[state=done]:opacity-100"
};
const statusTone: Record<State, string> = {
  pending: "text-fg-muted",
  running: "text-accent",
  failed: "text-fg",
  done: "text-fg"
};

// The third step fails once and retries, like a real optimization run.
const FAIL_ONCE_INDEX = 2;

function StepIcon({ state, className }: { state: State; className: string }) {
  const props: SVGProps<SVGSVGElement> = {
    viewBox: "0 0 20 20",
    fill: "none",
    strokeWidth: 2,
    strokeLinecap: "round",
    className: cx("size-5", className)
  };
  switch (state) {
    case "pending":
      return (
        <svg {...props} className={cx(props.className, "stroke-fg-muted")}>
          <circle cx="10" cy="10" r="7" />
        </svg>
      );
    case "running":
      return (
        <svg
          {...props}
          className={cx(
            props.className,
            "stroke-accent motion-safe:animate-spin"
          )}
        >
          <path d="M10 3a7 7 0 1 1-7 7" />
        </svg>
      );
    case "failed":
      return (
        <svg {...props} className={cx(props.className, "stroke-earth")}>
          <path d="M6 6l8 8M14 6l-8 8" />
        </svg>
      );
    case "done":
      return (
        <svg {...props} className={cx(props.className, "stroke-accent")}>
          <path d="M4.5 10.5l3.5 3.5 7.5-8" />
        </svg>
      );
  }
}

export async function SwiftVisual() {
  const t = await getTranslations("work.swift");
  const steps = t.raw("steps") as string[];

  return (
    <figure className="rounded-card bg-bg-elevated flex flex-col justify-center gap-8 p-6 md:min-h-[27.5rem] md:p-10">
      <p className="sr-only">{t("summary")}</p>
      <figcaption aria-hidden="true">
        <Eyebrow tone="accent">{t("caption")}</Eyebrow>
      </figcaption>
      <div aria-hidden="true" className="flex flex-col gap-8">
        <ol className="flex flex-col gap-4">
          {steps.map((step, index) => (
            <li
              key={step}
              data-step=""
              data-state="done"
              data-fail-once={index === FAIL_ONCE_INDEX ? "" : undefined}
              className="group flex items-center gap-3 font-mono text-sm"
            >
              <span className="grid shrink-0">
                {states.map((state) => (
                  <StepIcon
                    key={state}
                    state={state}
                    className={cx(cell, visibleWhen[state])}
                  />
                ))}
              </span>
              <span className="grow">{step}</span>
              <span className="grid justify-items-end text-xs">
                {states.map((state) => (
                  <span
                    key={state}
                    className={cx(cell, visibleWhen[state], statusTone[state])}
                  >
                    {t(`status.${state}`)}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex items-baseline gap-3">
          <span
            data-result-value=""
            className="text-accent inline-block min-w-[4ch] font-mono text-5xl font-medium tracking-[-0.02em] tabular-nums"
          >
            {t("resultValue")}
          </span>
          <span className="text-fg-muted text-sm">{t("resultLabel")}</span>
        </div>
      </div>
    </figure>
  );
}
