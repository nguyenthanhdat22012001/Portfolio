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
});
