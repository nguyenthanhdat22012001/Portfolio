import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { ButtonLink } from "@/shared/ui/ButtonLink";
import { Section } from "@/shared/ui/Section";
import { SectionTitle } from "@/shared/ui/SectionTitle";

export async function ContactSection() {
  const t = await getTranslations("contact");

  return (
    <Section id="contact" titleId="contact-title" className="border-b-0">
      <SectionTitle id="contact-title">{t("title")}</SectionTitle>
      <p className="text-fg-muted mt-4 max-w-xl">{t("description")}</p>
      <a
        href={`mailto:${site.email}`}
        className="text-accent mt-8 inline-block font-mono text-lg break-all underline underline-offset-4 sm:text-2xl"
      >
        {site.email}
      </a>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink
          href={site.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
        >
          {t("linkedin")}
        </ButtonLink>
        <ButtonLink
          href={site.github}
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
        >
          {t("github")}
        </ButtonLink>
        <ButtonLink href={site.cv} download variant="secondary">
          {t("cv")}
        </ButtonLink>
      </div>
    </Section>
  );
}
