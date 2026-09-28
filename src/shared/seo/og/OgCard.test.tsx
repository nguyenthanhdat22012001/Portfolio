import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OgCard } from "./OgCard";

describe("OgCard", () => {
  it("renders eyebrow, title, name, and host", () => {
    const html = renderToStaticMarkup(
      <OgCard
        eyebrow="Case study"
        title="Swift: cutting load time"
        name="Nguyễn Thành Đạt"
        host="dat.dev"
      />
    );
    for (const text of [
      "Case study",
      "Swift: cutting load time",
      "Nguyễn Thành Đạt",
      "dat.dev"
    ]) {
      expect(html).toContain(text);
    }
  });

  it("gives every multi-child element an explicit flex display (Satori rule)", () => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(
      <OgCard eyebrow="E" title="T" name="N" host="h" />
    );
    for (const element of host.querySelectorAll("div")) {
      if (element.children.length > 1) {
        expect(element.getAttribute("style")).toContain("display:flex");
      }
    }
  });
});
