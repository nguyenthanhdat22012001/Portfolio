import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSitemap } from "./sitemap";

const origin = "https://example.dev";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

const work = [
  { slug: "swift", locale: "en", lastModified: "2022-10-01T00:00:00.000Z" },
  { slug: "loyal", locale: "en", lastModified: "2024-06-01T00:00:00.000Z" },
  { slug: "loyal", locale: "vi", lastModified: "2024-06-01T00:00:00.000Z" }
] as const;

describe("buildSitemap", () => {
  it("lists each home page with alternates and no lastModified", () => {
    const entries = buildSitemap({ work: [], posts: [] });
    expect(entries).toEqual([
      {
        url: `${origin}/en`,
        alternates: {
          languages: {
            en: `${origin}/en`,
            vi: `${origin}/vi`,
            "x-default": `${origin}/en`
          }
        }
      },
      {
        url: `${origin}/vi`,
        alternates: {
          languages: {
            en: `${origin}/en`,
            vi: `${origin}/vi`,
            "x-default": `${origin}/en`
          }
        }
      }
    ]);
  });

  it("lists only real versions of case studies, with their own alternates", () => {
    const entries = buildSitemap({ work, posts: [] });
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain(`${origin}/en/work/swift`);
    expect(urls).not.toContain(`${origin}/vi/work/swift`);
    expect(urls).toContain(`${origin}/vi/work/loyal`);
    expect(entries.find((e) => e.url === `${origin}/en/work/swift`)).toEqual({
      url: `${origin}/en/work/swift`,
      lastModified: "2022-10-01T00:00:00.000Z",
      alternates: {
        languages: {
          en: `${origin}/en/work/swift`,
          "x-default": `${origin}/en/work/swift`
        }
      }
    });
  });

  it("omits the blog index while there are no posts", () => {
    const urls = buildSitemap({ work, posts: [] }).map((entry) => entry.url);
    expect(urls.some((url) => url.includes("/blog"))).toBe(false);
  });

  it("adds the blog index per locale and each real post once posts exist", () => {
    const urls = buildSitemap({
      work: [],
      posts: [
        {
          slug: "load-time",
          locale: "en",
          lastModified: "2026-10-01T00:00:00.000Z"
        }
      ]
    }).map((entry) => entry.url);

    expect(urls).toEqual([
      `${origin}/en`,
      `${origin}/vi`,
      `${origin}/en/blog`,
      `${origin}/vi/blog`,
      `${origin}/en/blog/load-time`
    ]);
  });
});
