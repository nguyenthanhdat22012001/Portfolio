import { getTranslations } from "next-intl/server";
import { Section } from "@/shared/ui/Section";
import { SectionTitle } from "@/shared/ui/SectionTitle";

interface Stat {
  value: string;
  label: string;
}

export async function AboutSection() {
  const t = await getTranslations("about");
  const paragraphs = t.raw("paragraphs") as string[];
  const stats = t.raw("stats") as Stat[];

  return (
    <Section id="about" titleId="about-title">
      <SectionTitle id="about-title">{t("title")}</SectionTitle>
      <div className="mt-8 grid gap-10 md:grid-cols-[2fr_1fr]">
        <div className="text-fg-muted space-y-4 leading-relaxed">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-1">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-card border-border bg-bg-elevated flex flex-col-reverse border p-4"
            >
              <dt className="text-fg-muted mt-1 text-sm">{stat.label}</dt>
              <dd className="text-accent font-mono text-3xl font-bold">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
