import { describe, expect, it } from "vitest";
import { ogImagePath, ogImageSize } from "./og-image";

describe("ogImagePath", () => {
  it("points the home page at the locale-root image", () => {
    expect(ogImagePath("en", "/")).toBe("/en/opengraph-image");
  });

  it("points a nested page at its own image", () => {
    expect(ogImagePath("vi", "/work/swift-performance")).toBe(
      "/vi/work/swift-performance/opengraph-image"
    );
  });
});

describe("ogImageSize", () => {
  it("is the 1200×630 OpenGraph size", () => {
    expect(ogImageSize).toEqual({ width: 1200, height: 630 });
  });
});
