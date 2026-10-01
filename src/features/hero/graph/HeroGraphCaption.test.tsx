import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroGraphCaption } from "./HeroGraphCaption";

const labels = {
  app: "app",
  feature: "feature",
  shared: "shared",
  chaos: "Feature-driven: features import each other.",
  layered: "Layered: app → feature → shared.",
  description: "Illustrative diagram."
};

function render() {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<HeroGraphCaption labels={labels} />);
  return host;
}

describe("HeroGraphCaption", () => {
  it("shows a three-item legend with text, not only color", () => {
    const items = render().querySelectorAll("li");
    expect([...items].map((li) => li.textContent)).toEqual([
      "app",
      "feature",
      "shared"
    ]);
  });

  it("renders both caption lines with aria-live off", () => {
    const host = render();
    expect(host.querySelector('[data-caption-line="chaos"]')?.textContent).toBe(
      labels.chaos
    );
    expect(
      host.querySelector('[data-caption-line="layered"]')?.textContent
    ).toBe(labels.layered);
    expect(host.querySelector("[aria-live]")?.getAttribute("aria-live")).toBe(
      "off"
    );
  });

  it("has a screen-reader description and is not aria-hidden", () => {
    const host = render();
    expect(host.querySelector(".sr-only")?.textContent).toBe(
      labels.description
    );
    expect(host.querySelector("[aria-hidden='true'] li")).toBeNull();
  });
});
