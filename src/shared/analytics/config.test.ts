import { describe, expect, it } from "vitest";
import { DISABLED_DOMAIN, speedInsightsEnabled, umamiConfig } from "./config";

const SITE = "https://portfolio-zeta-cyan-13.vercel.app";

describe("umamiConfig", () => {
  it("is off without a website id", () => {
    expect(umamiConfig({ VERCEL_ENV: "production", NEXT_PUBLIC_SITE_URL: SITE })).toBeNull();
  });

  it("tracks only the production host on a Vercel production build", () => {
    expect(
      umamiConfig({
        NEXT_PUBLIC_UMAMI_ID: "abc",
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SITE_URL: SITE
      })
    ).toEqual({ websiteId: "abc", domains: "portfolio-zeta-cyan-13.vercel.app" });
  });

  it("never matches a preview host, even though getSiteUrl falls back to it", () => {
    expect(
      umamiConfig({
        NEXT_PUBLIC_UMAMI_ID: "abc",
        VERCEL_ENV: "preview",
        VERCEL_URL: "portfolio-git-x.vercel.app"
      })
    ).toEqual({ websiteId: "abc", domains: DISABLED_DOMAIN });
  });

  it("never matches in CI or locally", () => {
    expect(umamiConfig({ NEXT_PUBLIC_UMAMI_ID: "ci-dummy" })).toEqual({
      websiteId: "ci-dummy",
      domains: DISABLED_DOMAIN
    });
  });
});

describe("speedInsightsEnabled", () => {
  it("is on only for builds running on Vercel", () => {
    expect(speedInsightsEnabled({ VERCEL: "1" })).toBe(true);
    expect(speedInsightsEnabled({})).toBe(false);
  });
});
