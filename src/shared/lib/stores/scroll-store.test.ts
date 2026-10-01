import { describe, expect, it } from "vitest";
import { useScrollStore } from "./scroll-store";

describe("useScrollStore", () => {
  it("defaults heroMorph to 0", () => {
    expect(useScrollStore.getState().heroMorph).toBe(0);
  });

  it("updates heroMorph via setHeroMorph", () => {
    useScrollStore.getState().setHeroMorph(0.42);
    expect(useScrollStore.getState().heroMorph).toBe(0.42);
  });
});
