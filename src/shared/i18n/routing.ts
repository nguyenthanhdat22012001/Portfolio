import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "vi"],
  defaultLocale: "en",
  // hreflang comes only from buildMetadata, which leaves fallback pages out.
  // next-intl's Link response header would list every locale for every page.
  alternateLinks: false,
  // No NEXT_LOCALE cookie: the site sets no cookies at all (privacy, no
  // consent banner). `/` redirects by Accept-Language on every visit, and
  // the locale lives in the URL.
  localeCookie: false
});

export type Locale = (typeof routing.locales)[number];

export function isValidLocale(value: string): value is Locale {
  return (routing.locales as readonly string[]).includes(value);
}
