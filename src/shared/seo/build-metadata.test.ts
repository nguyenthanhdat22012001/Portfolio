import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMetadata } from "./build-metadata";

const origin = "https://example.dev";
const base = {
  title: "Swift",
  description: "A case study.",
  path: "/work/swift",
  type: "article" as const
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildMetadata", () => {
  it("gives a real page a self canonical and hreflang for each real locale", () => {
    const metadata = buildMetadata({
      ...base,
      locale: "vi",
      availableLocales: ["en", "vi"]
    });

    expect(metadata.alternates).toEqual({
      canonical: `${origin}/vi/work/swift`,
      languages: {
        en: `${origin}/en/work/swift`,
        vi: `${origin}/vi/work/swift`,
        "x-default": `${origin}/en/work/swift`
      }
    });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      siteName: "Nguyen Thanh Dat",
      url: `${origin}/vi/work/swift`,
      locale: "vi_VN",
      alternateLocale: ["en_US"]
    });
  });

  it("canonicalises a fallback page to English with no hreflang", () => {
    const metadata = buildMetadata({
      ...base,
      locale: "vi",
      availableLocales: ["en"]
    });

    expect(metadata.alternates).toEqual({
      canonical: `${origin}/en/work/swift`
    });
    expect(metadata.openGraph).toMatchObject({
      url: `${origin}/en/work/swift`,
      alternateLocale: ["en_US"]
    });
  });

  it("uses the bare locale for the home page", () => {
    const metadata = buildMetadata({
      ...base,
      path: "/",
      type: "website",
      locale: "en",
      availableLocales: ["en", "vi"]
    });

    expect(metadata.alternates?.canonical).toBe(`${origin}/en`);
  });

  it("defaults the image to the page's own OG route with alt = title", () => {
    const metadata = buildMetadata({
      ...base,
      locale: "vi",
      availableLocales: ["en"]
    });
    const image = {
      url: `${origin}/vi/work/swift/opengraph-image`,
      width: 1200,
      height: 630,
      alt: "Swift"
    };

    expect(metadata.openGraph?.images).toEqual([image]);
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Swift",
      description: "A case study.",
      images: [image]
    });
  });

  it("accepts an image override", () => {
    const metadata = buildMetadata({
      ...base,
      path: "/blog",
      locale: "en",
      availableLocales: ["en", "vi"],
      imagePath: "/en/opengraph-image"
    });

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: `${origin}/en/opengraph-image` })
    ]);
  });

  it("marks noindex pages and leaves indexable pages alone", () => {
    const hidden = buildMetadata({
      ...base,
      locale: "en",
      availableLocales: ["en"],
      noindex: true
    });
    const visible = buildMetadata({
      ...base,
      locale: "en",
      availableLocales: ["en"]
    });

    expect(hidden.robots).toEqual({ index: false, follow: true });
    expect(visible.robots).toBeUndefined();
  });
});
