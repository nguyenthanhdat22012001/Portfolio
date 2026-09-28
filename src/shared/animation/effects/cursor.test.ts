import { afterEach, describe, expect, it, type Mock } from "vitest";
import { createFakeLibs } from "../testing/fake-libs";
import { startCursor } from "./cursor";

function pointer(
  type: string,
  init: MouseEventInit & { pointerType?: string } = {}
) {
  const event = new MouseEvent(type, { bubbles: true, ...init });
  Object.defineProperty(event, "pointerType", {
    value: init.pointerType ?? "mouse"
  });
  return event;
}

let stop: (() => void) | undefined;

function start() {
  const { libs, gsap } = createFakeLibs();
  stop = startCursor({ gsap: libs.gsap, lenis: {} as never });
  return { gsap };
}

function ring() {
  return document.querySelector<HTMLElement>("[data-cursor]");
}

afterEach(() => {
  stop?.();
  document.body.innerHTML = "";
});

describe("startCursor", () => {
  it("adds one decorative ring that ignores the pointer", () => {
    start();
    expect(document.querySelectorAll("[data-cursor]")).toHaveLength(1);
    expect(ring()?.getAttribute("aria-hidden")).toBe("true");
  });

  it("follows the mouse", () => {
    const { gsap } = start();
    window.dispatchEvent(pointer("pointermove", { clientX: 30, clientY: 40 }));
    const [x, y] = gsap.quickTo.mock.results.map((r) => r.value as Mock);
    expect(x).toHaveBeenCalledWith(30);
    expect(y).toHaveBeenCalledWith(40);
    expect(ring()?.hasAttribute("data-visible")).toBe(true);
  });

  it("ignores touch and pen", () => {
    start();
    window.dispatchEvent(pointer("pointermove", { pointerType: "touch" }));
    expect(ring()?.hasAttribute("data-visible")).toBe(false);
  });

  it("grows over interactive elements", () => {
    start();
    document.body.insertAdjacentHTML(
      "beforeend",
      '<a href="/x"><span>Go</span></a><p>Text</p>'
    );
    document.querySelector("span")?.dispatchEvent(pointer("pointerover"));
    expect(ring()?.hasAttribute("data-hover")).toBe(true);
    document.querySelector("p")?.dispatchEvent(pointer("pointerover"));
    expect(ring()?.hasAttribute("data-hover")).toBe(false);
  });

  it("removes the ring when stopped", () => {
    start();
    stop?.();
    stop = undefined;
    expect(ring()).toBeNull();
  });
});
