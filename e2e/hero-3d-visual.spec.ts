// Local-only: snapshot baselines are platform-specific, so CI doesn't run this file.
import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

for (const width of [390, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`static fallback graph at ${width}px, ${colorScheme}`, async ({
      page
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto("/en");
      await expect(page.locator("[data-hero-graph]")).toHaveAttribute(
        "data-gate",
        "fallback"
      );
      await expect(page.locator("#hero-canvas-slot")).toHaveScreenshot(
        `hero-graph-${width}-${colorScheme}.png`
      );
    });
  }
}
