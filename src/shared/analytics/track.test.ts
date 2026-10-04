import { afterEach, describe, expect, it, vi } from "vitest";
import { track } from "./track";

describe("track", () => {
  afterEach(() => {
    delete window.umami;
  });

  it("forwards to umami.track", () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    track("avatar_wave_click");
    track("locale_switch", { to: "vi" });
    expect(spy).toHaveBeenNthCalledWith(1, "avatar_wave_click");
    expect(spy).toHaveBeenNthCalledWith(2, "locale_switch", { to: "vi" });
  });

  it("does nothing when Umami is missing or blocked", () => {
    expect(() => track("avatar_wave_click")).not.toThrow();
  });

  it("swallows errors thrown by Umami", () => {
    window.umami = {
      track: () => {
        throw new Error("blocked");
      }
    };
    expect(() => track("avatar_wave_click")).not.toThrow();
  });
});
