import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeContext,
  placeBelowFold
} from "@/shared/animation/testing/fake-libs";
import { swift } from "./swift";

function mount() {
  document.body.innerHTML = `
    <article>
      <div data-swift-bar="before"></div>
      <span data-swift-timer></span>
      <div data-swift-bar="after"></div>
      <p data-swift-after>1–3s</p>
      <ol><li data-swift-step>a</li><li data-swift-step>b</li></ol>
    </article>`;
  return document.querySelector("article") as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("swift", () => {
  it("leaves an on-screen chapter alone", () => {
    const el = mount();
    const { ctx, gsap } = createFakeContext();
    swift.run(el, ctx);
    expect(gsap.timeline).not.toHaveBeenCalled();
  });

  it("pins and scrubs on desktop", () => {
    const el = mount();
    placeBelowFold(el);
    const { ctx, gsap } = createFakeContext({ isDesktop: true });
    swift.run(el, ctx);
    expect(gsap.timeline).toHaveBeenCalledWith(
      expect.objectContaining({
        scrollTrigger: expect.objectContaining({
          trigger: el,
          pin: true,
          scrub: expect.any(Number)
        })
      })
    );
    expect(el.querySelector("[data-swift-timer]")?.textContent).toBe("0.0s");
  });

  it("plays once without pinning on mobile, in about 1.2 s", () => {
    const el = mount();
    placeBelowFold(el);
    const { ctx, gsap, timeline } = createFakeContext({ isDesktop: false });
    swift.run(el, ctx);
    const vars = gsap.timeline.mock.calls[0]?.[0] as {
      scrollTrigger: Record<string, unknown>;
    };
    expect(vars.scrollTrigger).toMatchObject({ trigger: el, once: true });
    expect(vars.scrollTrigger.pin).toBeUndefined();
    expect(timeline.timeScale).toHaveBeenCalledWith(2.4 / 1.2);
  });

  it("clears the timer on cleanup", () => {
    const el = mount();
    placeBelowFold(el);
    const { ctx } = createFakeContext();
    const cleanup = swift.run(el, ctx);
    cleanup?.();
    expect(el.querySelector("[data-swift-timer]")?.textContent).toBe("");
  });

  it("does nothing when its markup is missing", () => {
    document.body.innerHTML = "<article></article>";
    const el = document.querySelector("article") as HTMLElement;
    placeBelowFold(el);
    const { ctx, gsap } = createFakeContext();
    swift.run(el, ctx);
    expect(gsap.timeline).not.toHaveBeenCalled();
  });
});
