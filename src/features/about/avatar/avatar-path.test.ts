import { describe, expect, it } from "vitest";
import type { GateEnv } from "@/shared/three/decide-gate";
import { decideAvatarPath } from "./avatar-path";

const desktop: GateEnv = {
  reduceMotion: false,
  hasWebGL: true,
  saveData: false,
  isDesktop: true
};

describe("decideAvatarPath", () => {
  it.each([
    [{}, "high", "3d"],
    [{}, "medium", "3d"],
    [{}, "low", "low"], // Review Focus 1: Hero already dropped the shared tier
    [{ isDesktop: false }, "high", "low"],
    [{ reduceMotion: true }, "high", "fallback"],
    [{ hasWebGL: false }, "high", "fallback"],
    [{ saveData: true }, "high", "fallback"],
    [{ reduceMotion: true, isDesktop: false }, "low", "fallback"]
  ] as const)("%o at %s → %s", (override, tier, expected) => {
    expect(decideAvatarPath({ ...desktop, ...override }, tier)).toBe(expected);
  });
});
