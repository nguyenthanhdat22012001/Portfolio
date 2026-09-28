import { SiteFooter } from "@/features/layout/SiteFooter";
import { SiteHeader } from "@/features/layout/SiteHeader";
import { isValidLocale, routing } from "@/shared/i18n/routing";
import { getSiteUrl } from "@/shared/seo/site-url";
import { fontMono, fontSans } from "@/shared/theme/fonts";
import { themeScript } from "@/shared/theme/theme-script";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";

export function generateMetadata(): Metadata {
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;

  return {
    metadataBase: new URL(getSiteUrl()),
    ...(googleVerification
      ? { verification: { google: googleVerification } }
      : {})
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${fontSans.variable} ${fontMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        suppressHydrationWarning
        className="bg-bg text-fg min-h-dvh font-sans antialiased"
      >
        <NextIntlClientProvider>
          <SiteHeader locale={locale} />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
