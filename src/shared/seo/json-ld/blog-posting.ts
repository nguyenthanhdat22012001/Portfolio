import type { Locale } from "@/shared/i18n/routing";
import { ogImagePath } from "../og/og-image";
import { getSiteUrl } from "../site-url";
import { absoluteUrl, canonicalLocale } from "../urls";
import { personRef, type PersonRef } from "./person";
import { schemaContext } from "./schema";

export interface BlogPosting {
  "@context": typeof schemaContext;
  "@type": "BlogPosting";
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  author: PersonRef;
  image: string;
  mainEntityOfPage: string;
  inLanguage: Locale;
}

export function buildBlogPosting({
  slug,
  locale,
  availableLocales,
  title,
  description,
  datePublished,
  dateModified,
  contentLocale
}: {
  slug: string;
  locale: Locale;
  availableLocales: readonly Locale[];
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  contentLocale: Locale;
}): BlogPosting {
  const path = `/blog/${slug}`;
  const canonical = canonicalLocale(locale, availableLocales);

  return {
    "@context": schemaContext,
    "@type": "BlogPosting",
    headline: title,
    description,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: personRef(),
    image: `${getSiteUrl()}${ogImagePath(canonical, path)}`,
    mainEntityOfPage: absoluteUrl(canonical, path),
    inLanguage: contentLocale
  };
}
