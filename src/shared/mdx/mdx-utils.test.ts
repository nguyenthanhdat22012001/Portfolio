import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { linkKind, slugify, textContent } from "./mdx-utils";

describe("textContent", () => {
  it("flattens strings, numbers, arrays, and elements", () => {
    const node = [
      "Deep dive: ",
      createElement("code", null, "npm"),
      " x",
      2
    ];
    expect(textContent(node)).toBe("Deep dive: npm x2");
  });

  it("ignores null, undefined, and booleans", () => {
    expect(textContent([null, undefined, false, "a"])).toBe("a");
  });
});

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Deep dive: an NPM package")).toBe(
      "deep-dive-an-npm-package"
    );
  });

  it("strips Vietnamese diacritics, including đ", () => {
    expect(slugify("Bối cảnh & Vấn đề")).toBe("boi-canh-van-de");
  });
});

describe("linkKind", () => {
  it("classifies hrefs", () => {
    expect(linkKind("/work/swift-performance")).toBe("internal");
    expect(linkKind("#results")).toBe("hash");
    expect(linkKind("https://apps.shopify.com/swift")).toBe("external");
    expect(linkKind("mailto:someone@example.com")).toBe("external");
    expect(linkKind("//cdn.example.com/x")).toBe("external");
  });
});
