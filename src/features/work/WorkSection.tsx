import type { JSX } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import type { MotionName } from "@/shared/animation/motion";
import { getWorkBySlug } from "@/shared/content";
import { pickLinks, type LinkKey } from "@/shared/content/links";
import { isValidLocale, routing } from "@/shared/i18n/routing";
import { Section } from "@/shared/ui/Section";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { chapterOrder, type ChapterKey } from "./chapter-order";
import { OneloyaltyVisual } from "./chapters/OneloyaltyVisual";
import { SafeBulkVisual } from "./chapters/SafeBulkVisual";
import { SwiftVisual } from "./chapters/SwiftVisual";
import { yearRange } from "./period";
import { WorkChapter } from "./WorkChapter";

const visuals: Record<
  ChapterKey,
  (props: { headline: string }) => Promise<JSX.Element>
> = {
  swift: SwiftVisual,
  oneloyalty: OneloyaltyVisual,
  safebulk: SafeBulkVisual
};

const chapterMotion: Record<ChapterKey, MotionName> = {
  swift: "swift",
  oneloyalty: "oneloyalty",
  safebulk: "safebulk"
};

// The home page links out only to things a visitor can try; the live
// listing of an employer's app stays on the case study page.
const homeLinks: readonly LinkKey[] = ["appStore", "github", "demo"];

export async function WorkSection() {
  const requested = await getLocale();
  const locale = isValidLocale(requested) ? requested : routing.defaultLocale;
  const t = await getTranslations("work");
  const tLinks = await getTranslations("links");

  return (
    <Section id="work" titleId="work-title">
      <SectionHeading id="work-title" index={2} label={t("label")}>
        {t("title")}
      </SectionHeading>
      <div className="mt-8 md:mt-4">
        {chapterOrder.map((chapter, index) => {
          const entry = getWorkBySlug(chapter.slug, locale);
          // chapter-order.test.ts guarantees every slug exists in English.
          if (!entry) return null;
          const { doc, isFallback } = entry;
          const Visual = visuals[chapter.key];
          const eyebrow = [
            String(index + 1).padStart(2, "0"),
            doc.company ?? t("coFounder"),
            yearRange(doc.period)
          ].join(" · ");

          return (
            <WorkChapter
              key={chapter.slug}
              slug={chapter.slug}
              eyebrow={eyebrow}
              title={doc.title}
              summary={doc.summary}
              stats={doc.metrics.slice(0, 2)}
              tags={doc.stack.slice(0, 5)}
              contentLang={isFallback ? routing.defaultLocale : undefined}
              readLabel={t("readCaseStudy")}
              links={pickLinks(doc.links, homeLinks).map(({ key, href }) => ({
                href,
                label: tLinks(key)
              }))}
              newTabLabel={tLinks("opensInNewTab")}
              visual={<Visual headline={doc.metrics[0]?.value ?? ""} />}
              reversed={index % 2 === 1}
              motionName={chapterMotion[chapter.key]}
            />
          );
        })}
      </div>
    </Section>
  );
}
