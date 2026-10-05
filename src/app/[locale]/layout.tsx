import { SiteFooter } from "@/features/layout/SiteFooter";
import { SiteHeader } from "@/features/layout/SiteHeader";
import { speedInsightsEnabled, umamiConfig } from "@/shared/analytics/config";
import { trackingScript } from "@/shared/analytics/tracking-script";
import { umamiLoaderScript } from "@/shared/analytics/umami-loader";
import { isValidLocale, routing } from "@/shared/i18n/routing";
import { getSiteUrl } from "@/shared/seo/site-url";
import { fontMono, fontSans } from "@/shared/theme/fonts";
import { themeScript } from "@/shared/theme/theme-script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";
import { MotionRoot } from "./_motion/MotionRoot";

export function generateMetadata(): Metadata {
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;

  return {
    metadataBase: new URL(getSiteUrl()),
    ...(googleVerification
      ? { verification: { google: googleVerification } }
      : {})
  };
}

// Pages without their own generateStaticParams (home, blog index) inherit
// these locales; dropping it makes them render on demand.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();

  if (!isValidLocale(locale)) {
    notFound();
  }

  const umami = umamiConfig();

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
        <NextIntlClientProvider messages={null}>
          <SiteHeader locale={locale} />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
          <MotionRoot />
        </NextIntlClientProvider>
        {umami ? (
          <>
            <script
              dangerouslySetInnerHTML={{ __html: umamiLoaderScript(umami) }}
            />
            <script dangerouslySetInnerHTML={{ __html: trackingScript }} />
          </>
        ) : null}
        {speedInsightsEnabled() ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
