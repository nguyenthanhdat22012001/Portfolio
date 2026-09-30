import { describe, expect, it } from "vitest";
import { pickLinks } from "./links";

const links = {
  demo: "https://youtu.be/x",
  github: "https://github.com/x",
  appStore: "https://apps.shopify.com/x",
  live: "https://example.com"
};

describe("pickLinks", () => {
  it("returns App Store first, then live, GitHub, demo", () => {
    expect(pickLinks(links).map(({ key }) => key)).toEqual([
      "appStore",
      "live",
      "github",
      "demo"
    ]);
  });

  it("keeps only the requested keys, in the requested order", () => {
    expect(pickLinks(links, ["appStore", "github", "demo"])).toEqual([
      { key: "appStore", href: "https://apps.shopify.com/x" },
      { key: "github", href: "https://github.com/x" },
      { key: "demo", href: "https://youtu.be/x" }
    ]);
  });

  it("skips missing links", () => {
    expect(pickLinks({ live: "https://example.com" }, ["appStore", "github"])).toEqual([]);
  });
});
