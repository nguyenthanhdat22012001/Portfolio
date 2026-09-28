import { getTranslations } from "next-intl/server";
import { motion } from "@/shared/animation/motion";
import { site } from "@/shared/lib/site";
import { ButtonLink } from "@/shared/ui/ButtonLink";
import { Container } from "@/shared/ui/Container";
import { Eyebrow } from "@/shared/ui/Eyebrow";
import { PlaceholderSlot } from "@/shared/ui/PlaceholderSlot";
import { StackedLines } from "@/shared/ui/StackedLines";

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
          <p className="text-fg-muted max-w-[32.5rem] text-lg leading-relaxed md:text-xl">
            {t("tagline")}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <ButtonLink href="#work">{t("ctaWork")}</ButtonLink>
            <ButtonLink href={site.cv} download variant="secondary">
              {t("ctaCv")}
            </ButtonLink>
          </div>
        </div>
        {/* Phase 5 mounts the canvas here (and a static avatar on mobile);
            the fixed aspect ratio keeps CLS at 0. */}
        <PlaceholderSlot
          data-hero-canvas-slot=""
          className="order-first aspect-[4/3] w-full md:order-none md:aspect-[7/8]"
        />
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
