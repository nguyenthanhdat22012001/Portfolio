import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CROSS_EDGES, EDGES, NODES } from "./graph-data";
import { HeroGraphStatic } from "./HeroGraphStatic";
import { STATIC_VIEW } from "./layouts";

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

  it("uses the shared static view so the chaos SVG matches the canvas's first frame", () => {
    for (const state of ["chaos", "layered"] as const) {
      expect(render(state).svg.getAttribute("viewBox")).toBe(
        `0 0 ${STATIC_VIEW.w} ${STATIC_VIEW.h}`
      );
    }
    // Node radii follow the canvas's node sizes and perspective.
    const radii = [...render("chaos").svg.querySelectorAll("circle")].map((c) =>
      Number(c.getAttribute("r"))
    );
    expect(new Set(radii).size).toBeGreaterThan(3);
  });

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

  it("marks only the requested node as drifting", () => {
    const markup = renderToStaticMarkup(
      <HeroGraphStatic state="layered" driftNodeId="admin" />
    );
    const host = document.createElement("div");
    host.innerHTML = markup;
    expect(host.querySelectorAll("[data-drift]")).toHaveLength(1);
    expect(
      render("layered").svg.querySelectorAll("[data-drift]")
    ).toHaveLength(0);
  });
});
