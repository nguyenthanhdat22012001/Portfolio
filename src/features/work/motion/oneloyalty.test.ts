import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeContext,
  placeBelowFold
} from "@/shared/animation/testing/fake-libs";
import { oneloyalty } from "./oneloyalty";

function mount() {
  document.body.innerHTML = `
    <article>
      <div data-oneloyalty-grid><div></div><div></div></div>
      <div data-cls-demo>
        <div data-layer="before">
          <div data-async-block></div><div data-cards></div>
        </div>
        <div data-layer="after">
          <div data-async-block><div data-async-content></div></div>
        </div>
      </div>
    </article>`;
  return document.querySelector("article") as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("oneloyalty", () => {
  it("does not run under reduced motion", () => {
    expect(oneloyalty.reducedMotion).toBeFalsy();
  });

  it("scatters below-the-fold blocks and merges them on enter", () => {
    const el = mount();
    const grid = el.querySelector("[data-oneloyalty-grid]") as HTMLElement;
    placeBelowFold(grid);
    const { ctx, gsap } = createFakeContext();
    oneloyalty.run(el, ctx);

    const blocks = [...grid.children];
    expect(gsap.set).toHaveBeenCalledWith(blocks, expect.any(Object));
    expect(gsap.to).toHaveBeenCalledWith(
      blocks,
      expect.objectContaining({
        x: 0,
        y: 0,
        rotation: 0,
        scrollTrigger: expect.objectContaining({ trigger: grid, once: true })
      })
    );
  });

  it("leaves on-screen blocks in place", () => {
    const el = mount();
    const { ctx, gsap } = createFakeContext();
    oneloyalty.run(el, ctx);
    expect(gsap.set).not.toHaveBeenCalled();
  });

  it("starts the CLS demo when it is below the fold", () => {
    const el = mount();
    placeBelowFold(el.querySelector("[data-cls-demo]") as HTMLElement);
    const { ctx, gsap } = createFakeContext({ isDesktop: true });
    oneloyalty.run(el, ctx);
    expect(gsap.timeline).toHaveBeenCalledTimes(1);
  });
});
