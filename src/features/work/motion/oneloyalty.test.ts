import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeContext,
  placeBelowFold
} from "@/shared/animation/testing/fake-libs";
import { oneloyalty } from "./oneloyalty";

function mount() {
  document.body.innerHTML = `
    <article>
      <div data-oneloyalty-grid><div></div><div></div></div>
      <p data-oneloyalty-greeting lang="en">Hello</p>
      <p data-oneloyalty-counter data-counter-template="{current} / {total}">1 / 3</p>
      <ul data-oneloyalty-greetings>
        <li lang="en">Hello</li><li lang="vi">Xin chào</li><li lang="fr">Bonjour</li>
      </ul>
    </article>`;
  return document.querySelector("article") as HTMLElement;
}

const greeting = () =>
  document.querySelector<HTMLElement>("[data-oneloyalty-greeting]");
const counter = () => document.querySelector("[data-oneloyalty-counter]");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("oneloyalty", () => {
  it("runs under reduced motion", () => {
    expect(oneloyalty.reducedMotion).toBe(true);
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

  it("swaps greetings instantly under reduced motion while on screen", () => {
    const el = mount();
    const { ctx, ScrollTrigger, SplitText } = createFakeContext({
      reduceMotion: true
    });
    const cleanup = oneloyalty.run(el, ctx);

    const { onToggle } = ScrollTrigger.create.mock.calls[0]?.[0] as {
      onToggle: (self: { isActive: boolean }) => void;
    };
    onToggle({ isActive: true });
    vi.advanceTimersByTime(2500);
    expect(greeting()?.textContent).toBe("Xin chào");
    expect(greeting()?.lang).toBe("vi");
    expect(counter()?.textContent).toBe("2 / 3");
    expect(SplitText.create).not.toHaveBeenCalled();

    onToggle({ isActive: false });
    vi.advanceTimersByTime(10_000);
    expect(greeting()?.textContent).toBe("Xin chào");

    cleanup?.();
    expect(greeting()?.textContent).toBe("Hello");
    expect(greeting()?.lang).toBe("en");
    expect(counter()?.textContent).toBe("1 / 3");
  });

  it("morphs characters out and in with motion", () => {
    const el = mount();
    const { ctx, ScrollTrigger, SplitText, gsap } = createFakeContext();
    oneloyalty.run(el, ctx);
    const { onToggle } = ScrollTrigger.create.mock.calls[0]?.[0] as {
      onToggle: (self: { isActive: boolean }) => void;
    };
    onToggle({ isActive: true });
    vi.advanceTimersByTime(2500);

    expect(SplitText.create).toHaveBeenCalledWith(
      greeting(),
      expect.objectContaining({ type: "chars" })
    );
    const outVars = gsap.to.mock.calls.at(-1)?.[1] as {
      onComplete: () => void;
    };
    outVars.onComplete();
    expect(greeting()?.textContent).toBe("Xin chào");
    expect(gsap.from).toHaveBeenCalled();
  });
});
