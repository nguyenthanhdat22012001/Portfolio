import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { motion } from "@/shared/animation/motion";
import { site } from "@/shared/lib/site";
import { Container } from "@/shared/ui/Container";

const categories = [
  "performance",
  "accessibility",
  "bestPractices",
  "seo"
] as const;

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-border border-t" {...motion("footer-reveal")}>
      <Container
        size="wide"
        className="text-fg-muted flex flex-col gap-4 py-8 font-mono text-xs sm:flex-row sm:items-center sm:justify-between md:min-h-25"
      >
        <p>
          {t("copyright", { year: new Date().getFullYear() })} ·{" "}
          {t("builtWith")}
        </p>
        <p>
          {t("lighthouse.title")}{" "}
          {categories.map((category, index) => (
            <Fragment key={category}>
              {index > 0 ? <span aria-hidden="true"> · </span> : null}
              <span>
                <span className="sr-only">{t(`lighthouse.${category}`)} </span>
                {site.lighthouse[category]}
              </span>
            </Fragment>
          ))}
        </p>
      </Container>
    </footer>
  );
}
