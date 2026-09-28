import type { JSX } from "react";
import { getTranslations } from "next-intl/server";
import type { MotionName } from "@/shared/animation/motion";
import { site } from "@/shared/lib/site";
import { Section } from "@/shared/ui/Section";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import type { StatEntry } from "@/shared/ui/Stat";
import {
  chapterOrder,
  type ChapterKey,
  type ChapterLink
} from "./chapter-order";
import { OneloyaltyVisual } from "./chapters/OneloyaltyVisual";
import { SafeBulkVisual } from "./chapters/SafeBulkVisual";
import { SwiftVisual } from "./chapters/SwiftVisual";
import { WorkChapter } from "./WorkChapter";

const visuals: Record<ChapterKey, () => Promise<JSX.Element>> = {
  swift: SwiftVisual,
  oneloyalty: OneloyaltyVisual,
  safebulk: SafeBulkVisual
};

const linkHrefs: Record<ChapterLink, string> = {
  github: site.safebulkRepo,
  demo: site.safebulkDemo
};

// Chapters gain entries as their effects land (Tasks 9 and 10).
const chapterMotion: Partial<Record<ChapterKey, MotionName>> = {
  swift: "swift"
};

export async function WorkSection() {
  const t = await getTranslations("work");

  return (
    <Section id="work" titleId="work-title">
      <SectionHeading id="work-title" index={2} label={t("label")}>
        {t("title")}
      </SectionHeading>
      <div className="mt-8 md:mt-4">
        {chapterOrder.map((chapter, index) => {
          const Visual = visuals[chapter.key];
          const eyebrow = [
            String(index + 1).padStart(2, "0"),
            chapter.affiliation ?? t("sideProject"),
            chapter.period
          ].join(" · ");

          return (
            <WorkChapter
              key={chapter.slug}
              slug={chapter.slug}
              eyebrow={eyebrow}
              title={t(`${chapter.key}.title`)}
              summary={t(`${chapter.key}.summary`)}
              stats={t.raw(`${chapter.key}.stats`) as StatEntry[]}
              tags={chapter.tags}
              readLabel={t("readCaseStudy")}
              links={chapter.links.map((link) => ({
                href: linkHrefs[link],
                label: t(`links.${link}`)
              }))}
              visual={<Visual />}
              reversed={index % 2 === 1}
              motionName={chapterMotion[chapter.key]}
            />
          );
        })}
      </div>
    </Section>
  );
}
