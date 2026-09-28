import { describe, expect, it, vi } from "vitest";
import { onFirstInteraction } from "./load-trigger";

describe("onFirstInteraction", () => {
  for (const type of ["scroll", "pointermove", "keydown", "touchstart"]) {
    it(`fires on the first ${type}`, () => {
      const callback = vi.fn();
      onFirstInteraction(callback);
      window.dispatchEvent(new Event(type));
      expect(callback).toHaveBeenCalledOnce();
    });
  }

  it("fires only once across several interactions", () => {
    const callback = vi.fn();
    onFirstInteraction(callback);
    window.dispatchEvent(new Event("pointermove"));
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("keydown"));
    expect(callback).toHaveBeenCalledOnce();
  });

  it("never fires after being cancelled", () => {
    const callback = vi.fn();
    const cancel = onFirstInteraction(callback);
    cancel();
    window.dispatchEvent(new Event("pointermove"));
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not fire on its own", () => {
    const callback = vi.fn();
    onFirstInteraction(callback);
    window.dispatchEvent(new Event("load"));
    expect(callback).not.toHaveBeenCalled();
  });
});
