import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { createFakeLibs } from "../testing/fake-libs";
import { startMagnetic } from "./magnetic";

function pointer(type: string, init: MouseEventInit = {}) {
  const event = new MouseEvent(type, { bubbles: true, ...init });
  Object.defineProperty(event, "pointerType", { value: "mouse" });
  return event;
}

let stop: (() => void) | undefined;

afterEach(() => {
  stop?.();
  document.body.innerHTML = "";
});

function setup() {
  document.body.innerHTML =
    '<a data-magnetic="0.5" href="/cv.pdf"><span>CV</span></a><p>Other</p>';
  const button = document.querySelector("a") as HTMLElement;
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 100,
    height: 40
  } as DOMRect);
  const { libs, gsap } = createFakeLibs();
  stop = startMagnetic({ gsap: libs.gsap, lenis: {} as never });
  const movers = () => gsap.quickTo.mock.results.map((r) => r.value as Mock);
  return { button, movers };
}

describe("startMagnetic", () => {
  it("pulls the element toward the pointer by its strength", () => {
    const { movers } = setup();
    document
      .querySelector("span")
      ?.dispatchEvent(pointer("pointermove", { clientX: 100, clientY: 40 }));
    const [x, y] = movers();
    expect(x).toHaveBeenLastCalledWith(25);
    expect(y).toHaveBeenLastCalledWith(10);
  });

  it("springs back when the pointer moves to something else", () => {
    const { movers } = setup();
    document
      .querySelector("span")
      ?.dispatchEvent(pointer("pointermove", { clientX: 100, clientY: 40 }));
    document
      .querySelector("p")
      ?.dispatchEvent(pointer("pointermove", { clientX: 300, clientY: 300 }));
    const [x, y] = movers();
    expect(x).toHaveBeenLastCalledWith(0);
    expect(y).toHaveBeenLastCalledWith(0);
  });
});
