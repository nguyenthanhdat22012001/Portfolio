import { afterEach, describe, expect, it } from "vitest";
import { AccentColor } from "./useAccentColor";

afterEach(() => {
  document.documentElement.style.removeProperty("--accent");
});

describe("AccentColor", () => {
  it("reads --accent and bumps its version on every refresh", () => {
    document.documentElement.style.setProperty("--accent", "#ff0000");
    const accent = new AccentColor();
    accent.refresh();
    expect(accent.color.getHexString()).toBe("ff0000");
    expect(accent.version).toBe(1);

    document.documentElement.style.setProperty("--accent", "#00ff00");
    accent.refresh();
    expect(accent.color.getHexString()).toBe("00ff00");
    expect(accent.version).toBe(2);
  });
});
