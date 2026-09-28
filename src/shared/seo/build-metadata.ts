import type { Metadata } from "next";
import type { Locale } from "@/shared/i18n/routing";
import { site } from "@/shared/lib/site";
import { ogImagePath, ogImageSize } from "./og/og-image";
import { getSiteUrl } from "./site-url";
import { absoluteUrl, canonicalLocale, languageAlternates } from "./urls";

const ogLocale: Record<Locale, string> = { en: "en_US", vi: "vi_VN" };

export interface BuildMetadataInput {
  title: string;
  description: string;
  path: string;
  locale: Locale;
  // Locales with real (non-fallback) content for this path.
  availableLocales: readonly Locale[];
  type: "website" | "article";
  // Defaults to this page's own OG image route.
  imagePath?: string;
  noindex?: boolean;
}

export function buildMetadata({
  title,
  description,
  path,
  locale,
  availableLocales,
  type,
  imagePath,
  noindex
}: BuildMetadataInput): Metadata {
  const isRealPage = availableLocales.includes(locale);
  const canonical = absoluteUrl(
    canonicalLocale(locale, availableLocales),
    path
  );
  // Set explicitly: Next only injects a file-based image when `images` is
  // absent, and its `alt` export cannot be localized.
  const images = [
    {
      url: `${getSiteUrl()}${imagePath ?? ogImagePath(locale, path)}`,
      ...ogImageSize,
      alt: title
    }
  ];

  return {
    title,
    description,
    alternates: isRealPage
      ? { canonical, languages: languageAlternates(path, availableLocales) }
      : { canonical },
    openGraph: {
      type,
      siteName: site.name,
      title,
      description,
      url: canonical,
      locale: ogLocale[locale],
      alternateLocale: availableLocales
        .filter((other) => other !== locale)
        .map((other) => ogLocale[other]),
      images
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {})
  };
}
