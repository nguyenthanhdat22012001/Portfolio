import { afterEach, describe, expect, it } from "vitest";
import { createFakeContext, placeBelowFold } from "../testing/fake-libs";
import { stagger } from "./stagger";

function mount() {
  document.body.innerHTML = "<ul><li>React</li><li>Vite</li></ul>";
  return document.querySelector("ul") as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("stagger", () => {
  it("leaves on-screen lists alone", () => {
    const el = mount();
    const { ctx, gsap } = createFakeContext();
    stagger.run(el, ctx);
    expect(gsap.from).not.toHaveBeenCalled();
  });

  it("brings the children in one after another", () => {
    const el = mount();
    placeBelowFold(el);
    const { ctx, gsap } = createFakeContext();
    stagger.run(el, ctx);
    expect(gsap.from).toHaveBeenCalledWith(
      el.children,
      expect.objectContaining({
        opacity: 0,
        stagger: expect.any(Number),
        scrollTrigger: expect.objectContaining({ trigger: el, once: true })
      })
    );
  });

  // magnetic.ts drives `y` on the same chips (e.g. Skills), so the reveal
  // must animate a different property or hovering during the reveal would
  // interrupt it under GSAP's default overwrite.
  it("animates yPercent instead of y, so magnetic's y tween doesn't clash", () => {
    const el = mount();
    placeBelowFold(el);
    const { ctx, gsap } = createFakeContext();
    stagger.run(el, ctx);
    const vars = gsap.from.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(vars.yPercent).toBe(50);
    expect(vars).not.toHaveProperty("y");
  });
});
