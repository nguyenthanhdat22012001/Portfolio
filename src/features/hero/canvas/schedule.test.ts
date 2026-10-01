import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { afterLoadIdle } from "./schedule";

// A fake window: jsdom's `window` and vitest's globalThis can differ, so
// stubbing globals wouldn't reliably reach the code under test.
function fakeWindow({ readyState = "complete", idle = false } = {}) {
  const listeners = new Map<string, () => void>();
  const requestIdleCallback = vi.fn<
    (cb: () => void, opts: { timeout: number }) => number
  >(() => 7);
  const win = {
    document: { readyState },
    requestIdleCallback: idle ? requestIdleCallback : undefined,
    cancelIdleCallback: vi.fn(),
    setTimeout: (cb: () => void, ms: number) => setTimeout(cb, ms),
    clearTimeout: (id: number) => clearTimeout(id),
    addEventListener: (type: string, cb: () => void) => listeners.set(type, cb),
    removeEventListener: (type: string) => listeners.delete(type)
  } as unknown as Window;
  return {
    win,
    requestIdleCallback,
    fire: (type: string) => listeners.get(type)?.()
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
