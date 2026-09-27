import { getTranslations } from "next-intl/server";

interface Greeting {
  text: string;
  lang: string;
}

// Phase 4 morphs these greetings into one another with SplitText.
export async function OneloyaltyVisual() {
  const t = await getTranslations("work.oneloyalty");
  const greetings = t.raw("greetings") as Greeting[];

  return (
    <figure className="rounded-card border border-border bg-bg-elevated p-6">
      <figcaption className="font-mono text-sm text-fg-muted">
        {t("caption")}
      </figcaption>
      <ul className="mt-6 grid grid-cols-2 gap-3">
        {greetings.map((greeting) => (
          <li
            key={greeting.lang}
            lang={greeting.lang}
            className="rounded-card border border-border px-3 py-2 font-mono text-sm"
          >
            {greeting.text}
          </li>
        ))}
      </ul>
    </figure>
  );
}
