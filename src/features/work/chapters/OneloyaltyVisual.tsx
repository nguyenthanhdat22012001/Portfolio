import { getTranslations } from "next-intl/server";
import { cx } from "@/shared/lib/cx";
import { Eyebrow } from "@/shared/ui/Eyebrow";
import { ClsDemo } from "./ClsDemo";

const blockColors = {
  muted: "bg-bg-muted",
  fg: "bg-fg-muted",
  earth: "bg-earth"
} as const;

// prettier-ignore
const blocks: ReadonlyArray<keyof typeof blockColors> = [
  "muted", "fg", "muted", "muted", "muted", "muted",
  "earth", "muted", "fg", "muted", "muted", "muted"
];

export async function OneloyaltyVisual() {
  const t = await getTranslations("work.oneloyalty");

  return (
    <figure className="rounded-card bg-bg-elevated flex flex-col gap-8 overflow-hidden p-6 md:p-10">
      <div className="flex flex-col gap-4">
        <Eyebrow>
          {t.rich("componentsCaption", {
            pkg: (chunks) => <span className="normal-case">{chunks}</span>
          })}
        </Eyebrow>
        <div
          aria-hidden="true"
          data-oneloyalty-grid=""
          className="grid grid-cols-6 gap-2"
        >
          {blocks.map((color, index) => (
            <div
              key={index}
              className={cx("h-9 rounded-xs", blockColors[color])}
            />
          ))}
        </div>
      </div>
      <ClsDemo />
    </figure>
  );
}
