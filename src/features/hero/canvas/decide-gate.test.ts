import { describe, expect, it, vi } from "vitest";
import { decideGate, probeWebGL, type GateEnv } from "./decide-gate";

const base: GateEnv = {
  reduceMotion: false,
  hasWebGL: true,
  saveData: false,
  isDesktop: true
};

describe("decideGate", () => {
  it.each([
    [{ reduceMotion: true }, "fallback"],
    [{ hasWebGL: false }, "fallback"],
    [{ saveData: true }, "fallback"],
    [{}, "wait-idle"],
    [{ isDesktop: false }, "wait-interaction"]
  ] as const)("%o → %s", (override, expected) => {
    expect(decideGate({ ...base, ...override })).toBe(expected);
  });

  it("reduced motion wins over a capable desktop", () => {
    expect(decideGate({ ...base, reduceMotion: true, isDesktop: true })).toBe(
      "fallback"
    );
  });
});

describe("probeWebGL", () => {
  function fakeDoc(contexts: Record<string, unknown>) {
    const getContext = vi.fn((type: string) => contexts[type] ?? null);
    return {
      doc: { createElement: () => ({ getContext }) } as unknown as Document,
      getContext
    };
  }

  it("is false when no context is available", () => {
    expect(probeWebGL(fakeDoc({}).doc)).toBe(false);
  });

  it("falls back to webgl and releases the probe context", () => {
    const loseContext = vi.fn();
    const gl = { getExtension: () => ({ loseContext }) };
    const { doc, getContext } = fakeDoc({ webgl: gl });
    expect(probeWebGL(doc)).toBe(true);
    expect(getContext).toHaveBeenCalledWith("webgl2");
    expect(loseContext).toHaveBeenCalled();
  });

  it("is false when getContext throws", () => {
    const doc = {
      createElement: () => ({
        getContext: () => {
          throw new Error("blocked");
        }
      })
    } as unknown as Document;
    expect(probeWebGL(doc)).toBe(false);
  });
});
