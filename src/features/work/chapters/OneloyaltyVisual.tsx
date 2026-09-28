import { getTranslations } from "next-intl/server";
import { cx } from "@/shared/lib/cx";
import { Eyebrow } from "@/shared/ui/Eyebrow";

interface Greeting {
  text: string;
  lang: string;
}

const blockColors = {
  muted: "bg-bg-muted",
  fg: "bg-fg-muted",
  earth: "bg-earth"
} as const;

// prettier-ignore
const blocks: ReadonlyArray<keyof typeof blockColors> = [
  "muted", "fg", "muted", "muted",
  "muted", "muted", "earth", "muted",
  "fg", "muted", "muted", "muted"
];

export async function OneloyaltyVisual() {
  const t = await getTranslations("work.oneloyalty");
  const greetings = t.raw("greetings") as [Greeting, ...Greeting[]];
  const [first] = greetings;

  return (
    <figure className="rounded-card bg-bg-elevated grid gap-8 overflow-hidden p-6 sm:grid-cols-2 md:min-h-[27.5rem] md:p-10">
      <div className="flex flex-col gap-4">
        <Eyebrow>{t("componentsCaption")}</Eyebrow>
        <div
          aria-hidden="true"
          data-oneloyalty-grid=""
          className="grid grid-cols-4 gap-2"
        >
          {blocks.map((color, index) => (
            <div
              key={index}
              className={cx("h-11 rounded-xs", blockColors[color])}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Eyebrow>{t("i18nCaption")}</Eyebrow>
        <div className="rounded-card border-border flex min-h-40 grow flex-col items-center justify-center gap-2 border border-dashed">
          <p
            aria-hidden="true"
            data-oneloyalty-greeting=""
            lang={first.lang}
            className="font-mono text-[2.75rem] font-semibold tracking-[-0.02em]"
          >
            {first.text}
          </p>
          <p
            aria-hidden="true"
            data-oneloyalty-counter=""
            data-counter-template={t.raw("counter") as string}
            className="text-fg-muted font-mono text-xs"
          >
            {t("counter", { current: 1, total: greetings.length })}
          </p>
          <ul className="sr-only" data-oneloyalty-greetings="">
            {greetings.map((greeting) => (
              <li key={greeting.lang} lang={greeting.lang}>
                {greeting.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
