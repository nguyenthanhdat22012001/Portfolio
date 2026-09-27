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

  const links = (
    <ul className="flex flex-col gap-4 md:flex-row md:gap-6">
      {sections.map((id) => (
        <li key={id}>
          <Link
            href={{ pathname: "/", hash: id }}
            className="text-fg-muted hover:text-fg text-sm"
          >
            {t(id)}
          </Link>
        </li>
      ))}
      {hasPosts ? (
        <li>
          <Link href="/blog" className="text-fg-muted hover:text-fg text-sm">
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
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link
            href="/"
            aria-label={t("homeLabel")}
            className="font-mono text-sm font-semibold"
          >
            {t("brand")}
          </Link>
          <nav aria-label={t("primary")} className="hidden md:block">
            {links}
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitcher
              current={locale}
              label={t("language")}
              names={{ en: tLocales("en"), vi: tLocales("vi") }}
            />
            <ThemeToggle label={tTheme("toggle")} />
            <details className="relative md:hidden">
              <summary className="rounded-card border-border cursor-pointer list-none border px-3 py-2 font-mono text-sm">
                {t("menu")}
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
