import { describe, expect, it } from "vitest";
import { buildRobots } from "./robots";

describe("buildRobots", () => {
  it("allows everything and points at the sitemap by default", () => {
    expect(buildRobots({ NEXT_PUBLIC_SITE_URL: "https://dat.dev" })).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://dat.dev/sitemap.xml"
    });
  });

  it("allows everything in production", () => {
    expect(
      buildRobots({
        NEXT_PUBLIC_SITE_URL: "https://dat.dev",
        VERCEL_ENV: "production"
      }).rules
    ).toEqual({ userAgent: "*", allow: "/" });
  });

  it("blocks everything on Vercel previews", () => {
    expect(
      buildRobots({
        VERCEL_ENV: "preview",
        VERCEL_URL: "portfolio-git-x.vercel.app"
      })
    ).toEqual({
      rules: { userAgent: "*", disallow: "/" },
      sitemap: "https://portfolio-git-x.vercel.app/sitemap.xml"
    });
  });
});
