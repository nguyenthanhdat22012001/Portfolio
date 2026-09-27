import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { ButtonLink } from "@/shared/ui/ButtonLink";
import { Section } from "@/shared/ui/Section";
import { SectionHeading } from "@/shared/ui/SectionHeading";
import { StackedLines } from "@/shared/ui/StackedLines";
import { CopyEmailButton } from "./CopyEmailButton";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export async function ContactSection() {
  const t = await getTranslations("contact");
  const titleLines = t.raw("titleLines") as string[];

  return (
    <Section id="contact" titleId="contact-title">
      <SectionHeading id="contact-title" index={4} label={t("label")} size="xl">
        <StackedLines lines={titleLines} />
      </SectionHeading>
      <p className="text-fg-muted mt-6 max-w-xl">{t("description")}</p>
      <div className="mt-10 flex flex-wrap items-center gap-4">
        {/* The default accent focus ring would vanish on this accent pill, so
            its controls draw an inset ring in the pill's text color. */}
        <div className="bg-accent text-accent-fg flex w-full flex-col rounded-md font-mono font-semibold sm:w-auto sm:flex-row">
          <a
            href={`mailto:${site.email}`}
            className="focus-visible:outline-accent-fg flex min-h-14 items-center px-5 text-sm break-all hover:opacity-90 focus-visible:-outline-offset-4 sm:px-7 sm:text-base"
          >
            {site.email}
          </a>
          <CopyEmailButton
            email={site.email}
            label={t("copyEmail")}
            copiedLabel={t("copied")}
            className="border-accent-fg/20 focus-visible:outline-accent-fg flex min-h-14 items-center border-t px-5 text-sm hover:opacity-90 focus-visible:-outline-offset-4 sm:border-t-0 sm:border-l sm:text-base"
          />
        </div>
        <ButtonLink
          href={site.linkedin}
          variant="secondary"
          size="lg"
          {...external}
        >
          {t("linkedin")}
          <span aria-hidden="true">&nbsp;↗</span>
        </ButtonLink>
        <ButtonLink
          href={site.github}
          variant="secondary"
          size="lg"
          {...external}
        >
          {t("github")}
          <span aria-hidden="true">&nbsp;↗</span>
        </ButtonLink>
        <ButtonLink href={site.cv} download variant="secondary" size="lg">
          {t("cv")}
        </ButtonLink>
      </div>
    </Section>
  );
}
