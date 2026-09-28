import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlaceholderSlot } from "./PlaceholderSlot";
import { SectionHeading } from "./SectionHeading";
import { StackedLines } from "./StackedLines";
import { Stat } from "./Stat";
import { TagList } from "./TagList";

function render(node: ReactElement): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(node);
  return host;
}

describe("SectionHeading", () => {
  it("numbers the eyebrow and ids the h2", () => {
    const host = render(
      <SectionHeading id="work-title" index={2} label="Work">
        Selected work
      </SectionHeading>
    );
    expect(host.querySelector("p")?.textContent).toBe("02 / Work");
    const heading = host.querySelector("h2");
    expect(heading?.id).toBe("work-title");
    expect(heading?.textContent).toBe("Selected work");
  });
});

describe("Stat", () => {
  it("puts the label in dt before the value in dd", () => {
    const host = render(
      <dl>
        <Stat value="1–3s" label="load, from 12–13s" />
      </dl>
    );
    const pair = host.querySelector("dl > div");
    expect(pair?.firstElementChild?.tagName).toBe("DT");
    expect(host.querySelector("dt")?.textContent).toBe("load, from 12–13s");
    expect(host.querySelector("dd")?.textContent).toBe("1–3s");
  });

  it("marks the value for count-up only when asked", () => {
    const plain = renderToStaticMarkup(<Stat value="4" label="years" />);
    const counted = renderToStaticMarkup(
      <Stat value="4" label="years" countUp />
    );
    expect(plain).not.toContain("data-motion");
    expect(counted).toContain('data-motion="count"');
  });
});

describe("StackedLines", () => {
  it("renders one block per line and reads as a single phrase", () => {
    const host = render(
      <h1>
        <StackedLines lines={["Nguyen", "Thanh Dat"]} />
      </h1>
    );
    expect(host.querySelectorAll("h1 > span")).toHaveLength(2);
    expect(host.textContent).toBe("Nguyen Thanh Dat");
  });
});

describe("PlaceholderSlot", () => {
  it("is hidden from assistive tech, empty, and forwards data attributes", () => {
    const host = render(<PlaceholderSlot data-hero-canvas-slot="" />);
    const slot = host.firstElementChild;
    expect(slot?.getAttribute("aria-hidden")).toBe("true");
    expect(slot?.hasAttribute("data-hero-canvas-slot")).toBe(true);
    expect(slot?.textContent).toBe("");
  });
});

describe("TagList", () => {
  it.each(["outline", "filled"] as const)(
    "renders one list item per tag (%s)",
    (variant) => {
      const host = render(
        <TagList tags={["React", "Vite"]} variant={variant} />
      );
      expect(host.querySelectorAll("li")).toHaveLength(2);
    }
  );
});
