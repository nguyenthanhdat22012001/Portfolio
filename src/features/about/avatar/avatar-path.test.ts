import { describe, expect, it } from "vitest";
import type { GateEnv } from "@/shared/three/decide-gate";
import { decideAvatarPath, isBelowViewport } from "./avatar-path";

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
    expect(decideAvatarPath({ ...desktop, ...override }, tier, true)).toBe(
      expected
    );
  });

  // M1: the Low path swaps wave → idle; an image already on screen stays put.
  it.each([
    [{}, "low", "fallback"],
    [{ isDesktop: false }, "high", "fallback"],
    [{}, "high", "3d"],
    [{ reduceMotion: true }, "high", "fallback"]
  ] as const)("slot on screen: %o at %s → %s", (override, tier, expected) => {
    expect(decideAvatarPath({ ...desktop, ...override }, tier, false)).toBe(
      expected
    );
  });
});

describe("isBelowViewport", () => {
  const at = (top: number) =>
    ({ getBoundingClientRect: () => ({ top }) }) as unknown as Element;
  const win = { innerHeight: 800 } as Window;

  it.each([
    [800, true],
    [1200, true],
    [799, false],
    [0, false],
    [-500, false]
  ])("top %i in an 800px viewport → %s", (top, expected) => {
    expect(isBelowViewport(at(top), win)).toBe(expected);
  });
});
