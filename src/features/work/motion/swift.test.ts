import { afterEach, describe, expect, it } from "vitest";
import {
  createFakeContext,
  placeBelowFold
} from "@/shared/animation/testing/fake-libs";
import { swift } from "./swift";

function mount() {
  document.body.innerHTML = `
    <article>
      <ol>
        <li data-step data-state="done"></li>
        <li data-step data-state="done"></li>
        <li data-step data-state="done" data-fail-once></li>
        <li data-step data-state="done"></li>
      </ol>
      <span data-result-value>−20%</span>
    </article>`;
  return document.querySelector("article") as HTMLElement;
}

const states = () =>
  [...document.querySelectorAll<HTMLElement>("[data-step]")].map(
    (step) => step.dataset.state
  );
const result = () =>
  document.querySelector<HTMLElement>("[data-result-value]") as HTMLElement;

function runBelowFold(isDesktop: boolean) {
  const el = mount();
  placeBelowFold(el);
  const fake = createFakeContext({ isDesktop });
  const cleanup = swift.run(el, fake.ctx);
  const [progress, vars] = fake.gsap.to.mock.calls[0] as [
    { value: number },
    Record<string, unknown> & { onUpdate: () => void }
  ];
  const at = (p: number) => {
    progress.value = p;
    vars.onUpdate();
  };
  return { el, fake, cleanup, vars, at };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("swift", () => {
  it("leaves an on-screen chapter in its final state", () => {
    const el = mount();
    const { ctx, gsap } = createFakeContext();
    swift.run(el, ctx);
    expect(gsap.to).not.toHaveBeenCalled();
    expect(states()).toEqual(["done", "done", "done", "done"]);
    expect(result().textContent).toBe("−20%");
  });

  it("pins and scrubs on desktop, starting from all pending", () => {
    const { el, vars } = runBelowFold(true);
    expect(vars.scrollTrigger).toMatchObject({
      trigger: el,
      pin: true,
      scrub: expect.any(Number)
    });
    expect(states()).toEqual(["pending", "pending", "pending", "pending"]);
    expect(result().style.opacity).toBe("0");
  });

  it("maps progress to step states and the result", () => {
    const { at } = runBelowFold(true);
    at(0.5);
    expect(states()).toEqual(["done", "done", "failed", "pending"]);
    at(0.9);
    expect(states()).toEqual(["done", "done", "done", "done"]);
    expect(result().textContent).toBe("−10%");
    expect(result().style.opacity).toBe("1");
  });

  it("reverses when progress goes back down", () => {
    const { at } = runBelowFold(true);
    at(0.5);
    at(0.1);
    expect(states()).toEqual(["running", "pending", "pending", "pending"]);
    expect(result().style.opacity).toBe("0");
  });

  it("plays once without pinning on mobile", () => {
    const { el, vars } = runBelowFold(false);
    expect(vars.scrollTrigger).toMatchObject({ trigger: el, once: true });
    expect((vars.scrollTrigger as { pin?: boolean }).pin).toBeUndefined();
    expect(vars.duration).toBe(3);
  });

  it("restores the final state on cleanup", () => {
    const { at, cleanup } = runBelowFold(true);
    at(0.5);
    cleanup?.();
    expect(states()).toEqual(["done", "done", "done", "done"]);
    expect(result().textContent).toBe("−20%");
    expect(result().style.opacity).toBe("");
  });

  it("does nothing when its markup is missing", () => {
    document.body.innerHTML = "<article></article>";
    const el = document.querySelector("article") as HTMLElement;
    placeBelowFold(el);
    const { ctx, gsap } = createFakeContext();
    swift.run(el, ctx);
    expect(gsap.to).not.toHaveBeenCalled();
  });
});
