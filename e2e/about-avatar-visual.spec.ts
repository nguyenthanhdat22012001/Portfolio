// Local-only: snapshot baselines are platform-specific, so CI doesn't run this file.
import { expect, test } from "@playwright/test";

// The sticky header lands wherever the scroll left it, on top of About.
const HIDE_HEADER = "header { visibility: hidden !important; }";

for (const colorScheme of ["light", "dark"] as const) {
  test(`About at 390px (Low, idle image), ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    await page.goto("/en");
    const slot = page.locator("#about-avatar-slot");
    await slot.scrollIntoViewIfNeeded();
    await expect(slot.locator('[data-avatar-pose="idle"]')).toBeVisible({
      timeout: 4_000
    });
    // Scrolling loaded the motion chunk: let the reveals and counters below
    // the slot finish, or the shot catches them mid-way.
    const stats = page.locator("#about dl dd");
    await stats.last().scrollIntoViewIfNeeded();
    await expect(stats).toHaveText(["4", "3", "1.5"], { timeout: 10_000 });
    await page.addStyleTag({ content: HIDE_HEADER });
    await expect(page.locator("#about")).toHaveScreenshot(
      `about-390-${colorScheme}.png`,
      {
        animations: "disabled"
      }
    );
  });

  test(`About at 1440px (3D idle), ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme });
    await page.goto("/en");
    await expect(page.locator("[data-hero-graph]")).toHaveAttribute(
      "data-gate",
      "live",
      { timeout: 15_000 }
    );
    const slot = page.locator("#about-avatar-slot");
    await page.evaluate(() => window.scrollBy(0, 200));
    await slot.scrollIntoViewIfNeeded();
    await expect(slot).toHaveAttribute("data-avatar-phase", "idle", {
      timeout: 20_000
    });
    // The idle clip keeps moving: mask the canvas, snapshot the layout around it.
    await page.addStyleTag({ content: HIDE_HEADER });
    await expect(page.locator("#about")).toHaveScreenshot(
      `about-1440-${colorScheme}.png`,
      {
        mask: [slot.locator("canvas")],
        animations: "disabled"
      }
    );
  });
}
