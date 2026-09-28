import { routing, type Locale } from "@/shared/i18n/routing";
import { getSiteUrl } from "./site-url";

// "/" is the locale root ("/en"), matching the existing routes.
export function localizedPath(locale: Locale, path: string): string {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export function absoluteUrl(locale: Locale, path: string): string {
  return `${getSiteUrl()}${localizedPath(locale, path)}`;
}

// A page whose locale has no real content (the vi → en fallback) is
// canonicalised to the default locale so it never competes with its twin.
export function canonicalLocale(
  locale: Locale,
  availableLocales: readonly Locale[]
): Locale {
  return availableLocales.includes(locale) ? locale : routing.defaultLocale;
}

// hreflang map shared by page metadata and the sitemap.
export function languageAlternates(
  path: string,
  availableLocales: readonly Locale[]
): Record<string, string> {
  return {
    ...Object.fromEntries(
      availableLocales.map((locale) => [locale, absoluteUrl(locale, path)])
    ),
    "x-default": absoluteUrl(routing.defaultLocale, path)
  };
}
