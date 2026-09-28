import { afterEach, describe, expect, it, vi } from "vitest";
import { isAtOrAboveViewport } from "./viewport";

function withTop(top: number) {
  const el = document.createElement("div");
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({ top } as DOMRect);
  return el;
}

describe("isAtOrAboveViewport", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is true for an element inside the viewport", () => {
    expect(isAtOrAboveViewport(withTop(100))).toBe(true);
  });

  it("is true for an element scrolled past", () => {
    expect(isAtOrAboveViewport(withTop(-500))).toBe(true);
  });

  it("is false for an element below the fold", () => {
    expect(isAtOrAboveViewport(withTop(window.innerHeight + 1))).toBe(false);
  });
});
