import { getTranslations } from "next-intl/server";

function LoadBar({
  label,
  value,
  width,
  highlight
}: {
  label: string;
  value: string;
  width: string;
  highlight: boolean;
}) {
  return (
    <div>
      <dt className="flex justify-between font-mono text-sm">
        <span className="text-fg-muted">{label}</span>
        <span className={highlight ? "text-accent" : "text-fg"}>{value}</span>
      </dt>
      <dd className="mt-2 h-3 rounded-full bg-bg">
        <div
          className={`h-full rounded-full ${highlight ? "bg-accent" : "bg-fg-muted"}`}
          style={{ width }}
        />
      </dd>
    </div>
  );
}

// Phase 4 turns these bars into a pinned, scrubbed loading animation.
export async function SwiftVisual() {
  const t = await getTranslations("work.swift");

  return (
    <figure className="rounded-card border border-border bg-bg-elevated p-6">
      <figcaption className="font-mono text-sm text-fg-muted">
        {t("caption")}
      </figcaption>
      <dl className="mt-6 space-y-5">
        <LoadBar
          label={t("before")}
          value={t("beforeValue")}
          width="100%"
          highlight={false}
        />
        <LoadBar
          label={t("after")}
          value={t("afterValue")}
          width="18%"
          highlight
        />
      </dl>
    </figure>
  );
}
