import type { JSX } from "react";
import { getTranslations } from "next-intl/server";
import { getWork } from "@/shared/content";
import type { Locale } from "@/shared/i18n/routing";
import { Section } from "@/shared/ui/Section";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { chapterOrder, type ChapterKey } from "./chapter-order";
import { OneloyaltyVisual } from "./chapters/OneloyaltyVisual";
import { SafeBulkVisual } from "./chapters/SafeBulkVisual";
import { SwiftVisual } from "./chapters/SwiftVisual";
import { WorkChapter } from "./WorkChapter";

const visuals: Record<ChapterKey, () => Promise<JSX.Element>> = {
  swift: SwiftVisual,
  oneloyalty: OneloyaltyVisual,
  safebulk: SafeBulkVisual
};

export async function WorkSection({ locale }: { locale: Locale }) {
  const t = await getTranslations("work");
  const bySlug = new Map(getWork(locale).map((entry) => [entry.doc.slug, entry]));

  return (
    <Section id="work" titleId="work-title">
      <SectionTitle id="work-title">{t("title")}</SectionTitle>
      <div className="mt-4">
        {chapterOrder.map(({ slug, key }, index) => {
          const entry = bySlug.get(slug);
          if (!entry) return null;
          const Visual = visuals[key];

          return (
            <WorkChapter
              key={slug}
              index={index + 1}
              slug={slug}
              title={entry.doc.title}
              summary={entry.doc.summary}
              tags={entry.doc.tags}
              metric={t(`${key}.metric`)}
              readLabel={t("readCaseStudy")}
              visual={<Visual />}
            />
          );
        })}
      </div>
    </Section>
  );
}
