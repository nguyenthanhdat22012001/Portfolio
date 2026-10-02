import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { afterLoadIdle, afterLoadIdleOrInput } from "./schedule";

// A fake window: jsdom's `window` and vitest's globalThis can differ, so
// stubbing globals wouldn't reliably reach the code under test.
function fakeWindow({ readyState = "complete", idle = false } = {}) {
  const listeners = new Map<string, (event: Event) => void>();
  const requestIdleCallback = vi.fn<
    (cb: () => void, opts: { timeout: number }) => number
  >(() => 7);
  const win = {
    document: { readyState },
    requestIdleCallback: idle ? requestIdleCallback : undefined,
    cancelIdleCallback: vi.fn(),
    setTimeout: (cb: () => void, ms: number) => setTimeout(cb, ms),
    clearTimeout: (id: number) => clearTimeout(id),
    addEventListener: (type: string, cb: (event: Event) => void) =>
      listeners.set(type, cb),
    removeEventListener: (type: string, cb: (event: Event) => void) => {
      if (listeners.get(type) === cb) listeners.delete(type);
    }
  } as unknown as Window;
  return {
    win,
    requestIdleCallback,
    fire: (type: string) => listeners.get(type)?.(new Event(type)),
    listening: () => [...listeners.keys()]
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("afterLoadIdle", () => {
  it("falls back to a 1.5 s timeout without requestIdleCallback", () => {
    const { win } = fakeWindow();
    const callback = vi.fn();
    afterLoadIdle(callback, win);
    vi.advanceTimersByTime(1499);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("uses requestIdleCallback with a timeout when available", () => {
    const { win, requestIdleCallback } = fakeWindow({ idle: true });
    const callback = vi.fn();
    afterLoadIdle(callback, win);
    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 2000
    });
    requestIdleCallback.mock.calls[0]![0]();
    expect(callback).toHaveBeenCalledOnce();
  });

  it("waits for load when the document is still loading", () => {
    const { win, fire } = fakeWindow({ readyState: "loading" });
    const callback = vi.fn();
    afterLoadIdle(callback, win);
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
    fire("load");
    vi.advanceTimersByTime(1500);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("cancel prevents the callback", () => {
    const { win } = fakeWindow();
    const callback = vi.fn();
    const cancel = afterLoadIdle(callback, win);
    cancel();
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });
});

describe("afterLoadIdleOrInput", () => {
  it("runs once the page is idle, then stops listening for input", () => {
    const { win, fire, listening } = fakeWindow();
    const callback = vi.fn();
    afterLoadIdleOrInput(callback, win);
    expect(listening()).toContain("scroll");
    vi.advanceTimersByTime(1500);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith("idle");
    expect(listening()).toEqual([]);
    fire("scroll");
    expect(callback).toHaveBeenCalledOnce();
  });

  it.each([
    "scroll",
    "wheel",
    "touchstart",
    "keydown",
    "pointerdown",
    "pointermove"
  ] as const)("runs at once on a %s before idle, naming it", (type) => {
    const { win, fire, listening } = fakeWindow();
    const callback = vi.fn();
    afterLoadIdleOrInput(callback, win);
    fire(type);
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(type);
    expect(listening()).toEqual([]);
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledOnce();
  });

  it("runs on input even while the document is still loading", () => {
    const { win, fire } = fakeWindow({ readyState: "loading" });
    const callback = vi.fn();
    afterLoadIdleOrInput(callback, win);
    fire("keydown");
    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith("keydown");
  });

  it("cancel removes every listener and the idle timer", () => {
    const { win, fire, listening } = fakeWindow();
    const callback = vi.fn();
    const cancel = afterLoadIdleOrInput(callback, win);
    cancel();
    expect(listening()).toEqual([]);
    fire("scroll");
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });
});
