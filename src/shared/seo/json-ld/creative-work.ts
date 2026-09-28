import type { Locale } from "@/shared/i18n/routing";
import { ogImagePath } from "../og/og-image";
import { getSiteUrl } from "../site-url";
import { absoluteUrl, canonicalLocale } from "../urls";
import { personRef, type PersonRef } from "./person";
import { schemaContext } from "./schema";

export interface CreativeWork {
  "@context": typeof schemaContext;
  "@type": "CreativeWork";
  name: string;
  description: string;
  author: PersonRef;
  dateCreated: string;
  about: string[];
  url: string;
  inLanguage: Locale;
  image: string;
}

export function buildCreativeWork({
  slug,
  locale,
  availableLocales,
  title,
  description,
  dateCreated,
  tags,
  contentLocale
}: {
  slug: string;
  locale: Locale;
  availableLocales: readonly Locale[];
  title: string;
  description: string;
  dateCreated: string;
  tags: readonly string[];
  // The language the content is actually written in (en on a fallback page).
  contentLocale: Locale;
}): CreativeWork {
  const path = `/work/${slug}`;
  const canonical = canonicalLocale(locale, availableLocales);

  return {
    "@context": schemaContext,
    "@type": "CreativeWork",
    name: title,
    description,
    author: personRef(),
    dateCreated,
    about: [...tags],
    url: absoluteUrl(canonical, path),
    inLanguage: contentLocale,
    image: `${getSiteUrl()}${ogImagePath(canonical, path)}`
  };
}
