import type { MetadataRoute } from "next";
import { availableLocales } from "@/shared/content/localize";
import { routing, type Locale } from "@/shared/i18n/routing";
import { absoluteUrl, languageAlternates } from "./urls";

export interface SitemapDoc {
  slug: string;
  locale: Locale;
  lastModified?: string;
}

type Entry = MetadataRoute.Sitemap[number];

function localeEntries(path: string): Entry[] {
  return routing.locales.map((locale) => ({
    url: absoluteUrl(locale, path),
    alternates: { languages: languageAlternates(path, routing.locales) }
  }));
}

// Every document is a real version, so fallback pages never appear.
function docEntries(prefix: string, docs: readonly SitemapDoc[]): Entry[] {
  return docs.map((doc) => {
    const path = `${prefix}/${doc.slug}`;
    return {
      url: absoluteUrl(doc.locale, path),
      ...(doc.lastModified ? { lastModified: doc.lastModified } : {}),
      alternates: {
        languages: languageAlternates(path, availableLocales(docs, doc.slug))
      }
    };
  });
}

export function buildSitemap({
  work,
  posts
}: {
  work: readonly SitemapDoc[];
  posts: readonly SitemapDoc[];
}): MetadataRoute.Sitemap {
  return [
    ...localeEntries("/"),
    // An empty blog index is noindex, so it stays out until a post exists.
    ...(posts.length > 0 ? localeEntries("/blog") : []),
    ...docEntries("/work", work),
    ...docEntries("/blog", posts)
  ];
}
