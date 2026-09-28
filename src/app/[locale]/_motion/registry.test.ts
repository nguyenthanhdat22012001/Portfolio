import { describe, expect, it } from "vitest";
import { motionNames } from "@/shared/animation/motion";
import { motionRegistry } from "./registry";

describe("motionRegistry", () => {
  it("implements exactly the effects named in motionNames", () => {
    expect(Object.keys(motionRegistry).sort()).toEqual([...motionNames].sort());
  });
});
