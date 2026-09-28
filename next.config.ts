import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

const nextConfig: NextConfig = {
  // OG image routes read this font with fs at request time.
  outputFileTracingIncludes: {
    "/**": ["./src/shared/seo/og/fonts/OpenSans-Bold.ttf"]
  }
};

export default withNextIntl(nextConfig);
