import { afterEach, describe, expect, it, vi } from "vitest";

// A post exists but site.features.blog stays false (a staged launch): the OG
// image must 404 like the post page does.
vi.mock("#site/content", async (importOriginal) => {
  const actual = await importOriginal<typeof import("#site/content")>();
  return {
    ...actual,
    blog: [{ slug: "first", locale: "en", title: "First post" }]
  };
});
vi.mock("@/shared/seo/og/render-og-image", () => ({
  renderOgImage: () => new Response("png", { status: 200 })
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("blog post OG image while the blog is off", () => {
  it("has no static params", async () => {
    const { generateStaticParams } = await import("./opengraph-image");
    expect(generateStaticParams()).toEqual([]);
  });

  it("returns 404 for an existing post", async () => {
    const { default: Image } = await import("./opengraph-image");
    const response = await Image({
      params: Promise.resolve({ locale: "en", slug: "first" })
    });
    expect(response.status).toBe(404);
  });
});
