import { getTranslations, setRequestLocale } from "next-intl/server";
import { HeroSection } from "@/features/hero/HeroSection";
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

  return <HeroSection />;
}
