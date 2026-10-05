import { getSiteUrl } from "@/shared/seo/site-url";

type Env = Record<string, string | undefined>;

export const UMAMI_SCRIPT_SRC = "https://cloud.umami.is/script.js";
// Never a real host: the script loads (so CSP and e2e see production
// markup) but Umami's data-domains check stops it from sending.
export const DISABLED_DOMAIN = "tracking-disabled.invalid";

// Umami sends only from the Vercel production build. getSiteUrl() falls
// back to the preview host or localhost elsewhere, so it can't decide this
// on its own.
export function umamiConfig(
  env: Env = process.env
): { websiteId: string; domains: string } | null {
  const websiteId = env.NEXT_PUBLIC_UMAMI_ID;
  if (!websiteId) return null;
  const domains =
    env.VERCEL_ENV === "production"
      ? new URL(getSiteUrl(env)).hostname
      : DISABLED_DOMAIN;
  return { websiteId, domains };
}

// Off Vercel the Speed Insights script URL (/_vercel/speed-insights/*)
// 404s, which logs a console error under `pnpm start` (e2e, local LHCI).
export function speedInsightsEnabled(env: Env = process.env): boolean {
  return env.VERCEL === "1";
}
