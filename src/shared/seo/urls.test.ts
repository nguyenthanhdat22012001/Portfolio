import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  absoluteUrl,
  canonicalLocale,
  languageAlternates,
  localizedPath
} from "./urls";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.dev/");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("localizedPath", () => {
  it("maps the home path to the bare locale", () => {
    expect(localizedPath("en", "/")).toBe("/en");
  });

  it("prefixes other paths with the locale", () => {
    expect(localizedPath("vi", "/work/swift")).toBe("/vi/work/swift");
  });
});

describe("absoluteUrl", () => {
  it("joins origin and localized path without double slashes", () => {
    expect(absoluteUrl("en", "/")).toBe("https://example.dev/en");
    expect(absoluteUrl("vi", "/blog")).toBe("https://example.dev/vi/blog");
  });
});

describe("canonicalLocale", () => {
  it("keeps a locale that has real content", () => {
    expect(canonicalLocale("vi", ["en", "vi"])).toBe("vi");
  });

  it("sends a fallback page to the default locale", () => {
    expect(canonicalLocale("vi", ["en"])).toBe("en");
  });
});

describe("languageAlternates", () => {
  it("lists each available locale plus x-default", () => {
    expect(languageAlternates("/work/swift", ["en", "vi"])).toEqual({
      en: "https://example.dev/en/work/swift",
      vi: "https://example.dev/vi/work/swift",
      "x-default": "https://example.dev/en/work/swift"
    });
  });

  it("omits locales without real content", () => {
    expect(languageAlternates("/work/swift", ["en"])).toEqual({
      en: "https://example.dev/en/work/swift",
      "x-default": "https://example.dev/en/work/swift"
    });
  });
});
