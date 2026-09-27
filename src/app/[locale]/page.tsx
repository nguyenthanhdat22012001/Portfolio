import { getTranslations, setRequestLocale } from "next-intl/server";
import { AboutSection } from "@/features/about/AboutSection";
import { ContactSection } from "@/features/contact/ContactSection";
import { HeroSection } from "@/features/hero/HeroSection";
import { SkillsSection } from "@/features/skills/SkillsSection";
import { buildMetadata } from "@/shared/seo/build-metadata";

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    locale
  });
}

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <AboutSection />
      <SkillsSection />
      <ContactSection />
    </>
  );
}
