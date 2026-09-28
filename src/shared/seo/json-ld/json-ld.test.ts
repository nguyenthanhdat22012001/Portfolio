import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildBlogPosting } from "./blog-posting";
import { buildBreadcrumbs } from "./breadcrumbs";
import { buildCreativeWork } from "./creative-work";
import { buildPerson, personRef } from "./person";
import { buildProfilePage } from "./profile-page";
import { buildWebSite } from "./website";

const origin = "https://example.dev";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", origin);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("person", () => {
  it("has a stable @id and the public profile fields", () => {
    expect(personRef()).toEqual({ "@id": `${origin}/#person` });
    expect(buildPerson("Front-End Engineer")).toEqual({
      "@type": "Person",
      "@id": `${origin}/#person`,
      name: "Nguyen Thanh Dat",
      alternateName: "Nguyễn Thành Đạt",
      jobTitle: "Front-End Engineer",
      url: origin,
      sameAs: [
        "https://www.linkedin.com/in/dat-nguyen-b26744277",
        "https://github.com/nguyenthanhdat22012001"
      ],
      knowsAbout: expect.arrayContaining(["React", "TypeScript"])
    });
  });
});

describe("buildProfilePage", () => {
  it("wraps the person for the localized home page", () => {
    expect(buildProfilePage({ locale: "vi", jobTitle: "Kỹ sư" })).toEqual({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: `${origin}/vi`,
      inLanguage: "vi",
      mainEntity: expect.objectContaining({
        "@id": `${origin}/#person`,
        jobTitle: "Kỹ sư"
      })
    });
  });
});

describe("buildWebSite", () => {
  it("describes the bilingual site", () => {
    expect(buildWebSite()).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      name: "Nguyen Thanh Dat",
      url: origin,
      inLanguage: ["en", "vi"]
    });
  });
});

describe("buildCreativeWork", () => {
  const input = {
    slug: "swift",
    title: "Swift",
    description: "A case study.",
    dateCreated: "2022-10-01T00:00:00.000Z",
    tags: ["React", "Performance"]
  };

  it("references the author and uses the canonical URL", () => {
    expect(
      buildCreativeWork({
        ...input,
        locale: "en",
        availableLocales: ["en"],
        contentLocale: "en"
      })
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "CreativeWork",
      name: "Swift",
      description: "A case study.",
      author: { "@id": `${origin}/#person` },
      dateCreated: "2022-10-01T00:00:00.000Z",
      about: ["React", "Performance"],
      url: `${origin}/en/work/swift`,
      inLanguage: "en",
      image: `${origin}/en/work/swift/opengraph-image`
    });
  });

  it("on a fallback page points at the English canonical and language", () => {
    expect(
      buildCreativeWork({
        ...input,
        locale: "vi",
        availableLocales: ["en"],
        contentLocale: "en"
      })
    ).toMatchObject({
      url: `${origin}/en/work/swift`,
      inLanguage: "en",
      image: `${origin}/en/work/swift/opengraph-image`
    });
  });
});

describe("buildBlogPosting", () => {
  const input = {
    slug: "load-time",
    locale: "en" as const,
    availableLocales: ["en"] as const,
    title: "Load time",
    description: "A post.",
    datePublished: "2026-10-01T00:00:00.000Z",
    contentLocale: "en" as const
  };

  it("defaults dateModified to datePublished", () => {
    expect(buildBlogPosting(input)).toEqual({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Load time",
      description: "A post.",
      datePublished: "2026-10-01T00:00:00.000Z",
      dateModified: "2026-10-01T00:00:00.000Z",
      author: { "@id": `${origin}/#person` },
      image: `${origin}/en/blog/load-time/opengraph-image`,
      mainEntityOfPage: `${origin}/en/blog/load-time`,
      inLanguage: "en"
    });
  });

  it("keeps an explicit dateModified", () => {
    expect(
      buildBlogPosting({ ...input, dateModified: "2026-11-01T00:00:00.000Z" })
    ).toMatchObject({ dateModified: "2026-11-01T00:00:00.000Z" });
  });
});

describe("buildBreadcrumbs", () => {
  it("numbers items from 1 with absolute URLs", () => {
    expect(
      buildBreadcrumbs([
        { name: "Home", url: `${origin}/en` },
        { name: "Blog", url: `${origin}/en/blog` }
      ])
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: `${origin}/en`
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${origin}/en/blog`
        }
      ]
    });
  });
});
