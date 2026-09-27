import { describe, expect, it } from "vitest";
import { useScrollStore } from "./scroll-store";

describe("useScrollStore", () => {
  it("defaults progress to 0", () => {
    expect(useScrollStore.getState().progress).toBe(0);
  });

  it("updates progress via setProgress", () => {
    useScrollStore.getState().setProgress(0.42);
    expect(useScrollStore.getState().progress).toBe(0.42);
  });
});
