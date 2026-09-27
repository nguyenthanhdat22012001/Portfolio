"use client";

import { Link, usePathname } from "@/shared/i18n/navigation";
import { routing, type Locale } from "@/shared/i18n/routing";
import { cx } from "@/shared/lib/cx";

// Client-only because the current path is needed to link to the same page
// in the other locale; the links still server-render, so it works without JS.
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
      <ul className="flex items-center gap-1 font-mono text-sm">
        {routing.locales.map((locale) => (
          <li key={locale}>
            <Link
              href={pathname}
              locale={locale}
              hrefLang={locale}
              aria-current={locale === current ? "true" : undefined}
              className={cx(
                "rounded-card px-2 py-1",
                locale === current
                  ? "text-accent"
                  : "text-fg-muted hover:text-fg"
              )}
            >
              {locale.toUpperCase()}
              <span className="sr-only"> — {names[locale]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
