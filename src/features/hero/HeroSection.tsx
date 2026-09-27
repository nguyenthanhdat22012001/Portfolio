import { getTranslations } from "next-intl/server";
import { site } from "@/shared/lib/site";
import { ButtonLink } from "@/shared/ui/ButtonLink";
import { Container } from "@/shared/ui/Container";

export async function HeroSection() {
  const t = await getTranslations("hero");

  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="border-border border-b"
    >
      <Container className="grid min-h-[calc(100dvh-4rem)] items-center gap-12 py-16 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-accent font-mono text-sm tracking-widest uppercase">
            {t("role")}
          </p>
          <h1 id="hero-title" className="mt-4 text-4xl font-bold sm:text-6xl">
            {t("title")}
          </h1>
          <p className="text-fg-muted mt-6 max-w-xl text-lg">{t("tagline")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="#work">{t("ctaWork")}</ButtonLink>
            <ButtonLink href={site.cv} download variant="secondary">
              {t("ctaCv")}
            </ButtonLink>
          </div>
        </div>
        {/* Reserved for the Phase 5 canvas; fixed aspect ratio keeps CLS at 0. */}
        <div
          aria-hidden="true"
          data-hero-canvas-slot=""
          className="rounded-card border-border bg-bg-elevated hidden aspect-square w-full border md:block"
        />
      </Container>
    </section>
  );
}
