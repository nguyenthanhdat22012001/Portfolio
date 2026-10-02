import { afterEach, describe, expect, it } from "vitest";
import { createFakeContext, placeBelowFold } from "../testing/fake-libs";
import { HOLD_SAFETY_S, count } from "./count";

type ToVars = { value: number; onUpdate: () => void; scrollTrigger?: object };

function mount(text: string, host: HTMLElement = document.body) {
  const el = document.createElement("dd");
  el.textContent = text;
  host.append(el);
  return el;
}

function enter(fake: ReturnType<typeof createFakeContext>) {
  const [vars] = fake.ScrollTrigger.create.mock.calls[0] as [
    { trigger: Element; start: string; once: boolean; onEnter: () => void }
  ];
  vars.onEnter();
  return vars;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("count", () => {
  it("leaves on-screen numbers alone", () => {
    const el = mount("8");
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
    expect(el.textContent).toBe("8");
  });

  it("leaves ranges alone", () => {
    const el = mount("1–3s");
    placeBelowFold(el);
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
  });

  it("counts up from zero on its trigger, keeping the final value for assistive tech", () => {
    const el = mount("40+");
    placeBelowFold(el);
    const fake = createFakeContext();
    const cleanup = count.run(el, fake.ctx);

    expect(el.textContent).toBe("0+");
    expect(el.getAttribute("aria-label")).toBe("40+");
    expect(fake.gsap.to).not.toHaveBeenCalled();
    expect(enter(fake)).toMatchObject({ trigger: el, start: "top 90%", once: true });

    const [state, vars] = fake.gsap.to.mock.calls[0] as [{ value: number }, ToVars];
    expect(vars.value).toBe(40);
    expect(vars.scrollTrigger).toBeUndefined();
    state.value = 21.6;
    vars.onUpdate();
    expect(el.textContent).toBe("22+");

    cleanup?.();
    expect(el.textContent).toBe("40+");
    expect(el.hasAttribute("aria-label")).toBe(false);
  });

  it("keeps decimals", () => {
    const el = mount("12.6k");
    placeBelowFold(el);
    count.run(el, createFakeContext().ctx);
    expect(el.textContent).toBe("0.0k");
  });

  it("counts 1.5 with one decimal and restores it", () => {
    const el = mount("1.5");
    placeBelowFold(el);
    const fake = createFakeContext();
    const cleanup = count.run(el, fake.ctx);
    expect(el.textContent).toBe("0.0");
    enter(fake);
    const [state, vars] = fake.gsap.to.mock.calls[0] as [{ value: number }, ToVars];
    expect(vars.value).toBe(1.5);
    state.value = 0.75;
    vars.onUpdate();
    expect(el.textContent).toBe("0.8");
    cleanup?.();
    expect(el.textContent).toBe("1.5");
  });
});

describe("count under data-count-hold (About avatar)", () => {
  function held() {
    const host = document.createElement("section");
    host.setAttribute("data-count-hold", "");
    document.body.append(host);
    const el = mount("4", host);
    placeBelowFold(el);
    return { host, el };
  }

  it("waits on its trigger until the hold is removed", async () => {
    const { host, el } = held();
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    enter(fake);
    expect(fake.gsap.to).not.toHaveBeenCalled();
    host.removeAttribute("data-count-hold");
    await flush(); // MutationObserver callbacks are microtasks
    expect(fake.gsap.to).toHaveBeenCalledTimes(1);
  });

  it("starts at once if the hold is already gone when the stat enters", () => {
    const { host, el } = held();
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    host.removeAttribute("data-count-hold");
    enter(fake);
    expect(fake.gsap.to).toHaveBeenCalledTimes(1);
  });

  it("never blocks: starts HOLD_SAFETY_S after its trigger anyway", () => {
    const { el } = held();
    const fake = createFakeContext();
    count.run(el, fake.ctx);
    enter(fake);
    const [delay, start] = fake.gsap.delayedCall.mock.calls[0] as [number, () => void];
    expect(delay).toBe(HOLD_SAFETY_S);
    expect(HOLD_SAFETY_S).toBe(4);
    start();
    start(); // a later release must not count twice
    expect(fake.gsap.to).toHaveBeenCalledTimes(1);
  });

  it("cleanup stops waiting and kills a running count", async () => {
    const { host, el } = held();
    const fake = createFakeContext();
    const cleanup = count.run(el, fake.ctx);
    enter(fake);
    cleanup?.();
    host.removeAttribute("data-count-hold");
    await flush();
    expect(fake.gsap.to).not.toHaveBeenCalled();
    const safety = fake.gsap.delayedCall.mock.results[0]!.value as { kill: () => void };
    expect(safety.kill).toHaveBeenCalled();
  });
});
