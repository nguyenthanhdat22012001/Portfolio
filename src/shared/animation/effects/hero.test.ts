import { afterEach, describe, expect, it } from "vitest";
import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import { createFakeContext } from "../testing/fake-libs";
import { hero } from "./hero";

function mountHero() {
  document.body.innerHTML =
    '<section id="top"><p data-scroll-hint>Scroll</p></section>';
  return document.getElementById("top") as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = "";
  useScrollStore.getState().setProgress(0);
});

describe("hero", () => {
  it("runs under reduced motion", () => {
    expect(hero.reducedMotion).toBe(true);
  });

  it("writes hero scroll progress to the scroll store", () => {
    const el = mountHero();
    const { ctx, ScrollTrigger } = createFakeContext();
    hero.run(el, ctx);

    expect(ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: el,
        start: "top top",
        end: "bottom top"
      })
    );
    const { onUpdate } = ScrollTrigger.create.mock.calls[0]?.[0] as {
      onUpdate: (self: { progress: number }) => void;
    };
    onUpdate({ progress: 0.4 });
    expect(useScrollStore.getState().progress).toBe(0.4);
  });

  it("resets progress on cleanup", () => {
    const el = mountHero();
    const { ctx } = createFakeContext();
    const cleanup = hero.run(el, ctx);
    useScrollStore.getState().setProgress(0.7);
    cleanup?.();
    expect(useScrollStore.getState().progress).toBe(0);
  });

  it("bobs the scroll hint", () => {
    const el = mountHero();
    const { ctx, gsap } = createFakeContext();
    hero.run(el, ctx);
    expect(gsap.to).toHaveBeenCalledWith(
      el.querySelector("[data-scroll-hint]"),
      expect.objectContaining({ repeat: -1, yoyo: true })
    );
  });

  it("keeps the hint still under reduced motion", () => {
    const el = mountHero();
    const { ctx, gsap } = createFakeContext({ reduceMotion: true });
    hero.run(el, ctx);
    expect(gsap.to).not.toHaveBeenCalled();
  });
});
