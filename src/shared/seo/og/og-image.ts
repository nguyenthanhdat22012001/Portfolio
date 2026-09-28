import type { Locale } from "@/shared/i18n/routing";
import { localizedPath } from "../urls";

export const ogImageSize = { width: 1200, height: 630 } as const;

// Route served by the page's `opengraph-image.tsx`. Next appends a
// cache-busting query to file-based image URLs; we reference the route
// directly so metadata can set a localized alt text.
export function ogImagePath(locale: Locale, path: string): string {
  return `${localizedPath(locale, path)}/opengraph-image`;
}
