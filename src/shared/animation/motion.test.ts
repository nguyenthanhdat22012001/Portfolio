import { describe, expect, it } from "vitest";
import { magnetic, motion } from "./motion";

describe("motion", () => {
  it("returns the data-motion attribute for an effect", () => {
    expect(motion("hero")).toEqual({ "data-motion": "hero" });
  });
});

describe("magnetic", () => {
  it("defaults to a strength of 0.35", () => {
    expect(magnetic()).toEqual({ "data-magnetic": "0.35" });
  });

  it("accepts a custom strength", () => {
    expect(magnetic(0.2)).toEqual({ "data-magnetic": "0.2" });
  });
});
