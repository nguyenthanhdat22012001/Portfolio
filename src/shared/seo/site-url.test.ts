import { describe, expect, it } from "vitest";
import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL and strips trailing slashes", () => {
    expect(
      getSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://dat.dev/",
        VERCEL_ENV: "production",
        VERCEL_URL: "portfolio-abc.vercel.app"
      })
    ).toBe("https://dat.dev");
  });

  it("throws on a Vercel production build without NEXT_PUBLIC_SITE_URL", () => {
    expect(() =>
      getSiteUrl({
        VERCEL_ENV: "production",
        VERCEL_URL: "portfolio-abc.vercel.app"
      })
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("uses the deployment URL on Vercel previews", () => {
    expect(
      getSiteUrl({
        VERCEL_ENV: "preview",
        VERCEL_URL: "portfolio-git-x.vercel.app"
      })
    ).toBe("https://portfolio-git-x.vercel.app");
  });

  it("falls back to localhost for local dev and CI", () => {
    expect(getSiteUrl({})).toBe("http://localhost:3000");
  });

  it("treats an empty NEXT_PUBLIC_SITE_URL as unset", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "" })).toBe(
      "http://localhost:3000"
    );
  });
});
