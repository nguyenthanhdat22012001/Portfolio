import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Glyph, GlyphText, withGlyphs } from "./Glyph";

function render(node: ReactElement): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(node);
  return host;
}

describe("Glyph", () => {
  it("is decorative by default", () => {
    const svg = render(<Glyph name="arrow-right" />).querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("role")).toBeNull();
  });

  it("exposes a label as an image when given one", () => {
    const svg = render(<Glyph name="arrow-left" label="←" />).querySelector(
      "svg"
    );
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("←");
    expect(svg?.getAttribute("aria-hidden")).toBeNull();
  });
});

describe("GlyphText", () => {
  it("swaps each symbol for a labelled svg and keeps the rest as text", () => {
    const host = render(
      <p>
        <GlyphText text="app → feature ↗ shared ← CLS ≤ 0.1" />
      </p>
    );
    expect(host.textContent).toBe("app  feature  shared  CLS  0.1");
    expect(
      [...host.querySelectorAll("svg")].map((svg) =>
        svg.getAttribute("aria-label")
      )
    ).toEqual(["→", "↗", "←", "≤"]);
  });

  it("leaves text in the preloaded subsets untouched", () => {
    const host = render(
      <p>
        <GlyphText text="1–3s · −20% ↓" />
      </p>
    );
    expect(host.innerHTML).toBe("<p>1–3s · −20% ↓</p>");
  });
});

describe("withGlyphs", () => {
  it("swaps symbols in string children and passes elements through", () => {
    const host = render(
      <p>{withGlyphs(["2 → 1 ", <strong key="s">repo</strong>])}</p>
    );
    expect(host.innerHTML).toContain("<strong>repo</strong>");
    expect(host.textContent).toBe("2  1 repo");
    expect(host.querySelector("svg")?.getAttribute("aria-label")).toBe("→");
  });
});
