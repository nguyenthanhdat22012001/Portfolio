import type { MetadataRoute } from "next";
import { getSiteUrl } from "./site-url";

type Env = Record<string, string | undefined>;

// Preview deployments must never be indexed. Local and CI stay allowed:
// Lighthouse's SEO audit fails pages that robots.txt blocks.
export function buildRobots(env: Env = process.env): MetadataRoute.Robots {
  const sitemap = `${getSiteUrl(env)}/sitemap.xml`;

  if (env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" }, sitemap };
  }

  return { rules: { userAgent: "*", allow: "/" }, sitemap };
}
