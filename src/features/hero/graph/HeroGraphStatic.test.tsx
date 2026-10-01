import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CROSS_EDGES, EDGES, NODES } from "./graph-data";
import { HeroGraphStatic } from "./HeroGraphStatic";

function render(state: "chaos" | "layered") {
  const markup = renderToStaticMarkup(<HeroGraphStatic state={state} />);
  const host = document.createElement("div");
  host.innerHTML = markup;
  return { markup, svg: host.querySelector("svg")! };
}

describe("HeroGraphStatic", () => {
  for (const state of ["chaos", "layered"] as const) {
    it(`${state}: stays under 4 KB and draws no text`, () => {
      const { markup, svg } = render(state);
      expect(markup.length).toBeLessThan(4096);
      expect(svg.textContent?.trim()).toBe("");
      expect(svg.getAttribute("data-graph-state")).toBe(state);
      expect(svg.querySelectorAll("circle")).toHaveLength(NODES.length);
    });
  }

  it("draws cross edges dashed only in the chaos state", () => {
    const chaos = render("chaos").svg;
    const layered = render("layered").svg;
    expect(chaos.querySelectorAll("line")).toHaveLength(
      EDGES.length + CROSS_EDGES.length
    );
    expect(
      chaos.querySelector('[stroke-dasharray="4 4"]')?.children
    ).toHaveLength(CROSS_EDGES.length);
    expect(layered.querySelectorAll("line")).toHaveLength(EDGES.length);
    expect(layered.querySelector("[stroke-dasharray]")).toBeNull();
  });

  it("colors nodes by layer through theme utilities", () => {
    const { svg } = render("layered");
    expect(svg.querySelector(".fill-accent")?.children).toHaveLength(2);
    expect(svg.querySelector(".fill-silver")?.children).toHaveLength(6);
    expect(svg.querySelector(".fill-earth")?.children).toHaveLength(5);
  });
});
