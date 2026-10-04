import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.doUnmock("@/shared/lib/site");
  vi.doUnmock("#site/content");
  vi.resetModules();
});

describe("isBlogEnabled", () => {
  it("is false while the flag is off", async () => {
    const { isBlogEnabled } = await import("@/shared/content");
    expect(isBlogEnabled()).toBe(false);
  });

  it("stays false with the flag on but no posts", async () => {
    vi.doMock("@/shared/lib/site", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/shared/lib/site")>();
      return { site: { ...actual.site, features: { blog: true } } };
    });
    const { isBlogEnabled } = await import("@/shared/content");
    expect(isBlogEnabled()).toBe(false);
  });

  it("is true with the flag on and a post", async () => {
    vi.doMock("@/shared/lib/site", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/shared/lib/site")>();
      return { site: { ...actual.site, features: { blog: true } } };
    });
    vi.doMock("#site/content", async (importOriginal) => {
      const actual = await importOriginal<typeof import("#site/content")>();
      return { ...actual, blog: [{ slug: "first", locale: "en" }] };
    });
    const { isBlogEnabled } = await import("@/shared/content");
    expect(isBlogEnabled()).toBe(true);
  });
});
