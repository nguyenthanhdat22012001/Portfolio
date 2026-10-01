import { getTranslations } from "next-intl/server";
import { magnetic, motion } from "@/shared/animation/motion";
import { site } from "@/shared/lib/site";
import { ButtonLink } from "@/shared/ui/ButtonLink";
import { Container } from "@/shared/ui/Container";
import { Eyebrow } from "@/shared/ui/Eyebrow";
import { StackedLines } from "@/shared/ui/StackedLines";
import { HeroGraphCaption } from "./graph/HeroGraphCaption";
import { HeroGraphStatic } from "./graph/HeroGraphStatic";

export async function HeroSection() {
  const t = await getTranslations("hero");
  const titleLines = t.raw("titleLines") as string[];

  return (
    <section id="top" aria-labelledby="hero-title" {...motion("hero")}>
      <Container
        size="wide"
        className="relative grid items-center gap-10 py-10 md:min-h-[calc(100dvh-5rem)] md:grid-cols-2 md:gap-12 md:py-16"
      >
        <div className="flex flex-col gap-6">
          <Eyebrow>{t("role")}</Eyebrow>
          <h1
            id="hero-title"
            className="text-5xl leading-none font-bold tracking-[-0.03em] md:text-7xl"
          >
            <StackedLines lines={titleLines} />
          </h1>
          <div className="flex max-w-[32.5rem] flex-col gap-3">
            <p className="text-fg-muted text-lg leading-relaxed md:text-xl">
              {t("tagline")}
            </p>
            <p className="text-fg-muted font-mono text-sm">{t("subline")}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <ButtonLink href="#work" {...magnetic()}>
              {t("ctaWork")}
            </ButtonLink>
            <ButtonLink
              href={site.cv}
              download
              variant="secondary"
              {...magnetic()}
            >
              {t("ctaCv")}
            </ButtonLink>
          </div>
        </div>
        {/* Static SVGs render on the server (0 CLS, no-JS fallback); the
            canvas gate is added on top of them in the slot. */}
        <div
          data-hero-graph=""
          data-gate="pending"
          data-morph="chaos"
          className="order-first flex w-full flex-col gap-3 md:order-none"
        >
          <div
            id="hero-canvas-slot"
            aria-hidden="true"
            className="relative aspect-[4/3] w-full md:aspect-[7/8]"
          >
            <HeroGraphStatic state="chaos" />
            <HeroGraphStatic state="layered" />
          </div>
          <HeroGraphCaption
            labels={{
              app: t("graph.legendApp"),
              feature: t("graph.legendFeature"),
              shared: t("graph.legendShared"),
              chaos: t("graph.chaos"),
              layered: t("graph.layered"),
              description: t("graph.description")
            }}
          />
        </div>
        <p
          aria-hidden="true"
          data-scroll-hint=""
          className="text-fg-muted absolute bottom-8 left-10 hidden font-mono text-xs tracking-[0.08em] uppercase md:block"
        >
          {t("scrollHint")} ↓
        </p>
      </Container>
    </section>
  );
}
