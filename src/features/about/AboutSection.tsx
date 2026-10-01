import { getTranslations } from "next-intl/server";
import { motion } from "@/shared/animation/motion";
import { GlyphText } from "@/shared/ui/Glyph";
import { PlaceholderSlot } from "@/shared/ui/PlaceholderSlot";
import { Section } from "@/shared/ui/Section";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { Stat, type StatEntry } from "@/shared/ui/Stat";

interface Milestone {
  year: string;
  text: string;
}

export async function AboutSection() {
  const t = await getTranslations("about");
  const stats = t.raw("stats") as StatEntry[];
  const timeline = t.raw("timeline") as Milestone[];

  return (
    <Section id="about" titleId="about-title">
      <SectionHeading id="about-title" index={1} label={t("label")}>
        {t("title")}
      </SectionHeading>
      <div className="mt-12 grid gap-8 md:grid-cols-12 md:gap-12">
        {/* Portrait photo goes here later (next/image, same aspect ratio). */}
        <PlaceholderSlot className="aspect-[4/3] w-full md:col-span-4 md:aspect-[3/4]" />
        <div className="flex flex-col gap-8 md:col-span-8">
          <p
            className="max-w-[42.5rem] text-lg leading-[1.7]"
            {...motion("reveal")}
          >
            <GlyphText text={t("lead")} />
          </p>
          <p
            className="text-fg-muted max-w-[42.5rem] leading-[1.7]"
            {...motion("reveal")}
          >
            {t("body")}
          </p>
          <dl className="border-border grid grid-cols-3 gap-6 border-y py-8">
            {stats.map((stat) => (
              <Stat key={stat.label} {...stat} size="lg" countUp />
            ))}
          </dl>
          <ol className="grid gap-6 text-sm sm:grid-cols-3">
            {timeline.map((milestone) => (
              <li key={milestone.year} className="flex flex-col gap-1">
                <span className="font-mono">{milestone.year}</span>
                <span className="text-fg-muted">{milestone.text}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
