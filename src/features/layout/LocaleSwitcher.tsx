"use client";

import { trackAttrs } from "@/shared/analytics/events";
import { getPathname, usePathname } from "@/shared/i18n/navigation";
import { routing, type Locale } from "@/shared/i18n/routing";
import { cx } from "@/shared/lib/cx";

// Client-only because the current path is needed to link to the same page
// in the other locale; the links still server-render, so it works without JS.
// Plain <a>, not <Link>: the locale is the root layout's segment, so a
// client-side switch would remount <html> without re-running the inline
// theme script in <head>. A full document load re-runs it.
export function LocaleSwitcher({
  current,
  label,
  names
}: {
  current: Locale;
  label: string;
  names: Record<Locale, string>;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="border-border flex h-9 items-center rounded-md border px-3 font-mono text-[0.8125rem]">
        {routing.locales.map((locale, index) => (
          <li key={locale} className="flex items-center">
            {index > 0 ? (
              <span aria-hidden="true" className="text-fg-muted px-1.5">
                /
              </span>
            ) : null}
            <a
              href={getPathname({ href: pathname, locale })}
              hrefLang={locale}
              aria-current={locale === current ? "true" : undefined}
              {...(locale === current
                ? {}
                : trackAttrs("locale_switch", { to: locale }))}
              className={cx(
                "py-1",
                locale === current
                  ? "text-accent"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              {locale.toUpperCase()}
              <span className="sr-only"> — {names[locale]}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
