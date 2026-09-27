import { getTranslations } from "next-intl/server";
import { Section } from "@/shared/ui/Section";
import { SectionHeading } from "@/shared/ui/SectionHeading";
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
      <SectionHeading id="skills-title" index={3} label={t("label")}>
        {t("title")}
      </SectionHeading>
      <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.name} className="flex flex-col gap-3">
            <h3 className="text-fg-muted font-mono text-[0.8125rem] font-normal tracking-normal">
              {group.name}
            </h3>
            <TagList tags={group.items} variant="filled" />
          </div>
        ))}
      </div>
    </Section>
  );
}
