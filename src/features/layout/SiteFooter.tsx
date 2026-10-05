import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { trackAttrs } from "@/shared/analytics/events";
import { motion } from "@/shared/animation/motion";
import { site } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";
import { lighthouseToShow } from "./lighthouse";

const categories = [
  "performance",
  "accessibility",
  "bestPractices",
  "seo"
] as const;

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const scores = lighthouseToShow(site.lighthouse, new Date());

  return (
    <footer className="border-border border-t" {...motion("footer-reveal")}>
      <Container
        size="wide"
        className="text-fg-muted flex flex-col gap-4 py-8 font-mono text-xs sm:flex-row sm:items-center sm:justify-between md:min-h-25"
      >
        <p>
          {t("copyright", { year: new Date().getFullYear() })} ·{" "}
          {t("builtWith")} ·{" "}
          <a
            href={site.repo}
            {...trackAttrs("outbound_click", { target: "repo" })}
            className="hover:text-fg underline underline-offset-4"
          >
            {t("source")}
          </a>
        </p>
        {scores ? (
          <p>
            {t("lighthouse.title")}{" "}
            {categories.map((category, index) => (
              <Fragment key={category}>
                {index > 0 ? <span aria-hidden="true"> · </span> : null}
                <span>
                  <span className="sr-only">
                    {t(`lighthouse.${category}`)}{" "}
                  </span>
                  {scores[category]}
                </span>
              </Fragment>
            ))}
          </p>
        ) : null}
      </Container>
    </footer>
  );
}
