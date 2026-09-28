import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeContext,
  placeBelowFold
} from "@/shared/animation/testing/fake-libs";
import { safebulk } from "./safebulk";

function mount() {
  document.body.innerHTML = `
    <article><ol>
      <li data-safebulk-card>1</li>
      <li data-safebulk-card>2</li>
      <li data-safebulk-card data-active>3</li>
    </ol></article>`;
  return document.querySelector("article") as HTMLElement;
}

const activeIndex = () =>
  [...document.querySelectorAll("[data-safebulk-card]")].findIndex((card) =>
    card.hasAttribute("data-active")
  );

afterEach(() => {
  document.body.innerHTML = "";
});

describe("safebulk", () => {
  it("leaves an on-screen chapter alone", () => {
    const el = mount();
    const { ctx, ScrollTrigger, gsap } = createFakeContext();
    safebulk.run(el, ctx);
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(gsap.from).not.toHaveBeenCalled();
    expect(activeIndex()).toBe(2);
  });

  it("pins on desktop and moves the active card with scroll progress", () => {
    const el = mount();
    placeBelowFold(el);
    const { ctx, ScrollTrigger } = createFakeContext({ isDesktop: true });
    const cleanup = safebulk.run(el, ctx);

    expect(activeIndex()).toBe(0);
    const vars = ScrollTrigger.create.mock.calls[0]?.[0] as {
      pin: boolean;
      trigger: Element;
      onUpdate: (self: { progress: number }) => void;
    };
    expect(vars).toMatchObject({ trigger: el, pin: true });
    vars.onUpdate({ progress: 0.5 });
    expect(activeIndex()).toBe(1);
    vars.onUpdate({ progress: 1 });
    expect(activeIndex()).toBe(2);

    vars.onUpdate({ progress: 0 });
    cleanup?.();
    expect(activeIndex()).toBe(2);
  });

  it("staggers the cards in on mobile without pinning", () => {
    const el = mount();
    placeBelowFold(el);
    const { ctx, ScrollTrigger, gsap } = createFakeContext({
      isDesktop: false
    });
    safebulk.run(el, ctx);
    expect(ScrollTrigger.create).not.toHaveBeenCalled();
    expect(gsap.from).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        scrollTrigger: expect.objectContaining({ trigger: el, once: true })
      })
    );
    expect(activeIndex()).toBe(2);
  });
});
