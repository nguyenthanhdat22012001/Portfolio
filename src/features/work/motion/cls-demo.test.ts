import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeContext,
  placeBelowFold
} from "@/shared/animation/testing/fake-libs";
import { runClsDemo } from "./cls-demo";

function mount() {
  document.body.innerHTML = `
    <div data-cls-demo>
      <div data-layer="before">
        <div data-async-block></div>
        <div data-ghost></div>
        <div data-cards></div>
        <span data-shift-marker></span>
      </div>
      <div data-layer="after">
        <div data-async-block><div data-async-content></div></div>
      </div>
    </div>`;
  return document.querySelector("[data-cls-demo]") as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("runClsDemo", () => {
  it("scrubs a below-the-fold demo on desktop without pinning", () => {
    const root = mount();
    placeBelowFold(root);
    const { ctx, gsap, timeline } = createFakeContext({ isDesktop: true });
    runClsDemo(root, ctx);

    const vars = gsap.timeline.mock.calls[0]?.[0] as {
      scrollTrigger: Record<string, unknown>;
    };
    expect(vars.scrollTrigger).toMatchObject({
      trigger: root,
      start: "top 70%",
      end: "bottom 30%",
      scrub: 1
    });
    expect(vars.scrollTrigger.pin).toBeUndefined();

    const animated = timeline.fromTo.mock.calls.map(([target]) => target);
    expect(animated).toContain(root.querySelector("[data-cards]"));
    expect(animated).toContain(root.querySelector("[data-async-content]"));
  });

  it("animates only transform, clip-path, and opacity", () => {
    const root = mount();
    placeBelowFold(root);
    const { ctx, timeline } = createFakeContext({ isDesktop: true });
    runClsDemo(root, ctx);
    for (const [, from, to] of timeline.fromTo.mock.calls) {
      for (const key of Object.keys({ ...from, ...to })) {
        expect(["y", "clipPath", "opacity", "duration", "ease"]).toContain(key);
      }
    }
  });

  it("leaves an on-screen demo alone", () => {
    const root = mount();
    const { ctx, gsap } = createFakeContext({ isDesktop: true });
    runClsDemo(root, ctx);
    expect(gsap.timeline).not.toHaveBeenCalled();
  });

  it("stays static on mobile", () => {
    const root = mount();
    placeBelowFold(root);
    const { ctx, gsap } = createFakeContext({ isDesktop: false });
    runClsDemo(root, ctx);
    expect(gsap.timeline).not.toHaveBeenCalled();
  });

  it("clears its inline styles on cleanup", () => {
    const root = mount();
    placeBelowFold(root);
    const { ctx, gsap } = createFakeContext({ isDesktop: true });
    const cleanup = runClsDemo(root, ctx);
    cleanup?.();
    expect(gsap.set).toHaveBeenCalledWith(expect.any(Array), {
      clearProps: "clipPath,transform,opacity"
    });
  });
});
