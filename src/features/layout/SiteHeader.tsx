import { getTranslations } from "next-intl/server";
import { getPosts } from "@/shared/content";
import { Link } from "@/shared/i18n/navigation";
import type { Locale } from "@/shared/i18n/routing";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { Container } from "@/shared/ui/Container";
import { LocaleSwitcher } from "./LocaleSwitcher";

const sections = ["about", "work", "skills", "contact"] as const;

export async function SiteHeader({ locale }: { locale: Locale }) {
  const t = await getTranslations("nav");
  const tLocales = await getTranslations("locales");
  const tTheme = await getTranslations("theme");
  const hasPosts = getPosts(locale).length > 0;

  const linkClass = "text-fg-muted hover:text-fg font-mono text-sm";

  const links = (
    <ul className="flex flex-col gap-4 md:flex-row md:gap-10">
      {sections.map((id) => (
        <li key={id}>
          <Link href={{ pathname: "/", hash: id }} className={linkClass}>
            {t(id)}
          </Link>
        </li>
      ))}
      {hasPosts ? (
        <li>
          <Link href="/blog" className={linkClass}>
            {t("blog")}
          </Link>
        </li>
      ) : null}
    </ul>
  );

  return (
    <>
      <a
        href="#main"
        className="focus:rounded-card focus:bg-accent focus:text-accent-fg sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
      >
        {t("skipToContent")}
      </a>
      <header className="border-border bg-bg/90 sticky top-0 z-40 border-b backdrop-blur">
        <Container
          size="wide"
          className="flex h-16 items-center justify-between gap-4 md:h-20"
        >
          <Link
            href="/"
            aria-label={t("homeLabel")}
            className="font-mono text-lg font-bold tracking-[-0.02em]"
          >
            {t("brand")}
          </Link>
          <nav aria-label={t("primary")} className="hidden md:block">
            {links}
          </nav>
          <div className="flex items-center gap-3">
            <LocaleSwitcher
              current={locale}
              label={t("language")}
              names={{ en: tLocales("en"), vi: tLocales("vi") }}
            />
            <ThemeToggle label={tTheme("toggle")} />
            <details className="relative md:hidden">
              <summary className="border-border text-fg inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-md border [&::-webkit-details-marker]:hidden">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="size-4"
                >
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
                <span className="sr-only">{t("menu")}</span>
              </summary>
              <nav
                aria-label={t("primary")}
                className="rounded-card border-border bg-bg-elevated absolute right-0 mt-2 w-48 border p-4"
              >
                {links}
              </nav>
            </details>
          </div>
        </Container>
      </header>
    </>
  );
}
