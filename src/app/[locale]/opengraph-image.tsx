import { getTranslations } from "next-intl/server";
import { isValidLocale, routing } from "@/shared/i18n/routing";
import { ogImageSize } from "@/shared/seo/og/og-image";
import { renderOgImage } from "@/shared/seo/og/render-og-image";

export const size = ogImageSize;
export const contentType = "image/png";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function Image({
  params
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  if (!isValidLocale(locale)) return new Response("Not found", { status: 404 });

  const t = await getTranslations({ locale, namespace: "og" });
  const tMeta = await getTranslations({ locale, namespace: "meta" });

  return renderOgImage({
    eyebrow: t("portfolio"),
    title: tMeta("title"),
    name: t("name")
  });
}
