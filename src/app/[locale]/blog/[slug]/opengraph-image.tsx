import { getTranslations } from "next-intl/server";
import { getPostBySlug, getPostParams } from "@/shared/content";
import { isValidLocale } from "@/shared/i18n/routing";
import { ogImageSize } from "@/shared/seo/og/og-image";
import { renderOgImage } from "@/shared/seo/og/render-og-image";

export const size = ogImageSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return getPostParams();
}

export default async function Image({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) return new Response("Not found", { status: 404 });
  const entry = getPostBySlug(slug, locale);
  if (!entry) return new Response("Not found", { status: 404 });

  const t = await getTranslations({ locale, namespace: "og" });

  return renderOgImage({
    eyebrow: t("blog"),
    title: entry.doc.title,
    name: t("name")
  });
}
