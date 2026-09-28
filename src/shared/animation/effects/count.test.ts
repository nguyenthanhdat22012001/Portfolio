import { afterEach, describe, expect, it } from "vitest";
import { createFakeContext, placeBelowFold } from "../testing/fake-libs";
import { count } from "./count";

function mount(text: string) {
  const el = document.createElement("dd");
  el.textContent = text;
  document.body.append(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("count", () => {
  it("leaves on-screen numbers alone", () => {
    const el = mount("8");
    const { ctx, gsap } = createFakeContext();
    count.run(el, ctx);
    expect(gsap.to).not.toHaveBeenCalled();
    expect(el.textContent).toBe("8");
  });

  it("leaves ranges alone", () => {
    const el = mount("1–3s");
    placeBelowFold(el);
    const { ctx, gsap } = createFakeContext();
    count.run(el, ctx);
    expect(gsap.to).not.toHaveBeenCalled();
  });

  it("counts up from zero, keeping the final value for assistive tech", () => {
    const el = mount("40+");
    placeBelowFold(el);
    const { ctx, gsap } = createFakeContext();
    const cleanup = count.run(el, ctx);

    expect(el.textContent).toBe("0+");
    expect(el.getAttribute("aria-label")).toBe("40+");
    const [state, vars] = gsap.to.mock.calls[0] as [
      { value: number },
      { value: number; onUpdate: () => void; scrollTrigger: object }
    ];
    expect(vars.value).toBe(40);
    expect(vars.scrollTrigger).toMatchObject({ trigger: el, once: true });

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
    const { ctx } = createFakeContext();
    count.run(el, ctx);
    expect(el.textContent).toBe("0.0k");
  });
});
