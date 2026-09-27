import { getTranslations } from "next-intl/server";
import { Section } from "@/shared/ui/Section";
import { SectionTitle } from "@/shared/ui/SectionTitle";
import { TagList } from "@/shared/ui/TagList";

interface SkillGroup {
  name: string;
  items: string[];
}

export async function SkillsSection() {
  const t = await getTranslations("skills");
  const groups = t.raw("groups") as SkillGroup[];

  return (
    <Section id="skills" titleId="skills-title">
      <SectionTitle id="skills-title">{t("title")}</SectionTitle>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div
            key={group.name}
            className="rounded-card border border-border bg-bg-elevated p-5"
          >
            <h3 className="font-mono text-base font-semibold">{group.name}</h3>
            <TagList tags={group.items} className="mt-4" />
          </div>
        ))}
      </div>
    </Section>
  );
}
