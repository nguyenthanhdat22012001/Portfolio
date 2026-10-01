import { afterEach, describe, expect, it } from "vitest";
import { GraphPalette } from "./useGraphColors";

const root = document.documentElement;

afterEach(() => {
  for (const name of ["--accent", "--silver", "--earth"])
    root.style.removeProperty(name);
});

describe("GraphPalette", () => {
  it("reads the accent, silver and earth tokens", () => {
    root.style.setProperty("--accent", "#c9a227");
    root.style.setProperty("--silver", "#a8acb2");
    root.style.setProperty("--earth", "#8b5e3c");
    const palette = new GraphPalette(root);
    expect(palette.app.getHexString()).toBe("c9a227");
    expect(palette.feature.getHexString()).toBe("a8acb2");
    expect(palette.shared.getHexString()).toBe("8b5e3c");
  });

  it("refresh re-reads tokens and bumps the version", () => {
    root.style.setProperty("--accent", "#c9a227");
    const palette = new GraphPalette(root);
    const before = palette.version;
    root.style.setProperty("--accent", "#8a6a10");
    palette.refresh();
    expect(palette.app.getHexString()).toBe("8a6a10");
    expect(palette.version).toBe(before + 1);
  });

  it("keeps the previous color when a token is missing", () => {
    root.style.setProperty("--accent", "#c9a227");
    const palette = new GraphPalette(root);
    root.style.removeProperty("--accent");
    palette.refresh();
    expect(palette.app.getHexString()).toBe("c9a227");
  });
});
