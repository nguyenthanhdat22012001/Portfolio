import { routing, type Locale } from "@/shared/i18n/routing";

export interface LocalizedDoc {
  slug: string;
  locale: Locale;
}

export interface Localized<T> {
  doc: T;
  isFallback: boolean;
}

function uniqueSlugs(docs: readonly LocalizedDoc[]): string[] {
  return [...new Set(docs.map((doc) => doc.slug))];
}

export function findDuplicate(docs: readonly LocalizedDoc[]): string | null {
  const seen = new Set<string>();
  for (const { slug, locale } of docs) {
    const key = `${locale}/${slug}`;
    if (seen.has(key)) return key;
    seen.add(key);
  }
  return null;
}

export function assertUnique(
  collection: string,
  docs: readonly LocalizedDoc[]
): void {
  const duplicate = findDuplicate(docs);
  if (duplicate) {
    throw new Error(`Duplicate ${collection} entry: ${duplicate}`);
  }
}

// Every document must exist in the default locale: fallback only runs
// towards it, and the locale switcher links each page to its twin there.
export function assertDefaultLocale(
  collection: string,
  docs: readonly LocalizedDoc[]
): void {
  for (const { slug, locale } of docs) {
    const hasDefault = docs.some(
      (doc) => doc.slug === slug && doc.locale === routing.defaultLocale
    );
    if (!hasDefault) {
      throw new Error(
        `${collection} entry ${locale}/${slug} has no ${routing.defaultLocale} version`
      );
    }
  }
}

// A missing translation falls back to the default locale (English), never
// the other way round.
export function findForLocale<T extends LocalizedDoc>(
  docs: readonly T[],
  slug: string,
  locale: Locale
): Localized<T> | null {
  const exact = docs.find((doc) => doc.slug === slug && doc.locale === locale);
  if (exact) return { doc: exact, isFallback: false };

  const fallback = docs.find(
    (doc) => doc.slug === slug && doc.locale === routing.defaultLocale
  );
  return fallback ? { doc: fallback, isFallback: true } : null;
}

export function selectForLocale<T extends LocalizedDoc>(
  docs: readonly T[],
  locale: Locale
): Localized<T>[] {
  return uniqueSlugs(docs)
    .map((slug) => findForLocale(docs, slug, locale))
    .filter((entry): entry is Localized<T> => entry !== null);
}

export function localeParams(
  docs: readonly LocalizedDoc[]
): { locale: Locale; slug: string }[] {
  const slugs = uniqueSlugs(docs);
  return routing.locales.flatMap((locale) =>
    slugs
      .filter((slug) => findForLocale(docs, slug, locale) !== null)
      .map((slug) => ({ locale, slug }))
  );
}

export function newestFirst<T>(
  entries: readonly Localized<T>[],
  date: (doc: T) => string
): Localized<T>[] {
  return [...entries].sort((a, b) => date(b.doc).localeCompare(date(a.doc)));
}

// Locales with a real (non-fallback) document for this slug. Fallback
// versions are left out: they are canonicalised to the default locale and
// excluded from hreflang and the sitemap.
export function availableLocales(
  docs: readonly LocalizedDoc[],
  slug: string
): Locale[] {
  return routing.locales.filter((locale) =>
    docs.some((doc) => doc.slug === slug && doc.locale === locale)
  );
}

// Drafts are invisible in production: a draft translation behaves exactly
// like a missing one (EN fallback, no hreflang, no sitemap entry).
export function withoutDrafts<T extends { draft?: boolean }>(
  docs: readonly T[],
  includeDrafts: boolean
): T[] {
  return includeDrafts ? [...docs] : docs.filter((doc) => !doc.draft);
}
