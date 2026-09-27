import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, resolveTheme, themeScript } from "./theme-script";

describe("resolveTheme", () => {
  it("prefers a valid stored theme over the OS", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the OS when nothing valid is stored", () => {
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme("purple", false)).toBe("light");
  });

  it("defaults to dark with no stored value and no OS preference", () => {
    expect(resolveTheme(null, null)).toBe("dark");
  });
});

describe("themeScript", () => {
  function mockMatchMedia(scheme: "dark" | "light" | null) {
    window.matchMedia = vi.fn((query: string) => ({
      matches: scheme !== null && query.includes(scheme)
    })) as unknown as typeof window.matchMedia;
  }

  function run() {
    new Function(themeScript)();
    return document.documentElement.dataset.theme;
  }

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.restoreAllMocks();
  });

  it("applies the stored theme", () => {
    mockMatchMedia("dark");
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    expect(run()).toBe("light");
  });

  it("applies the OS theme when nothing is stored", () => {
    mockMatchMedia("light");
    expect(run()).toBe("light");
  });

  it("falls back to dark with no OS preference", () => {
    mockMatchMedia(null);
    expect(run()).toBe("dark");
  });

  it("still applies the OS theme when localStorage throws", () => {
    mockMatchMedia("light");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(run()).toBe("light");
  });
});
