import { afterEach, describe, expect, it } from "vitest";
import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import { createFakeContext } from "../testing/fake-libs";
import { hero } from "./hero";

function mountHero(gate = "pending") {
  document.body.innerHTML = `<section id="top"><div data-hero-graph data-gate="${gate}" data-morph="chaos"></div><p data-scroll-hint>Scroll</p></section>`;
  return document.getElementById("top") as HTMLElement;
}

const graph = () => document.querySelector<HTMLElement>("[data-hero-graph]")!;

function runAndGetUpdate(el: HTMLElement, reduceMotion = false) {
  const { ctx, ScrollTrigger } = createFakeContext({ reduceMotion });
  const cleanup = hero.run(el, ctx);
  const { onUpdate } = ScrollTrigger.create.mock.calls[0]?.[0] as {
    onUpdate: (self: { progress: number }) => void;
  };
  return { onUpdate, cleanup, ScrollTrigger };
}

afterEach(() => {
  document.body.innerHTML = "";
  useScrollStore.getState().setHeroMorph(0);
});

describe("hero", () => {
  it("runs under reduced motion", () => {
    expect(hero.reducedMotion).toBe(true);
  });

  it("writes hero scroll progress to heroMorph", () => {
    const el = mountHero();
    const { onUpdate, ScrollTrigger } = runAndGetUpdate(el);
    expect(ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: el, start: 0, end: expect.any(Function) })
    );
    onUpdate({ progress: 0.4 });
    expect(useScrollStore.getState().heroMorph).toBe(0.4);
  });

  it("ends the morph range by slot position, with a minimum distance", () => {
    const el = mountHero();
    const { ScrollTrigger } = runAndGetUpdate(el);
    const { end } = ScrollTrigger.create.mock.calls[0]?.[0] as { end: () => string };
    // jsdom has zero-sized rects: the floor applies.
    expect(end()).toBe("+=100");
  });

  it("switches the caption to layered at 0.5 and back", () => {
    const { onUpdate } = runAndGetUpdate(mountHero());
    onUpdate({ progress: 0.49 });
    expect(graph().dataset.morph).toBe("chaos");
    onUpdate({ progress: 0.5 });
    expect(graph().dataset.morph).toBe("layered");
    onUpdate({ progress: 0.2 });
    expect(graph().dataset.morph).toBe("chaos");
  });

  it("leaves the caption alone under reduced motion", () => {
    const { onUpdate } = runAndGetUpdate(mountHero(), true);
    onUpdate({ progress: 0.9 });
    expect(graph().dataset.morph).toBe("chaos");
    expect(useScrollStore.getState().heroMorph).toBe(0.9);
  });

  it("leaves the caption alone when the graph fell back", () => {
    const { onUpdate } = runAndGetUpdate(mountHero("fallback"));
    onUpdate({ progress: 0.9 });
    expect(graph().dataset.morph).toBe("chaos");
  });

  it("resets heroMorph and the caption on cleanup", () => {
    const { onUpdate, cleanup } = runAndGetUpdate(mountHero());
    onUpdate({ progress: 0.7 });
    cleanup?.();
    expect(useScrollStore.getState().heroMorph).toBe(0);
    expect(graph().dataset.morph).toBe("chaos");
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
