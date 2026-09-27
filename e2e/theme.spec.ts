import { expect, test } from "@playwright/test";

const cases = [
  { colorScheme: "dark", expected: "dark" },
  { colorScheme: "light", expected: "light" }
] as const;

// "no-preference" is not tested here: browsers report `light` for it, so the
// dark fallback only applies without matchMedia (theme-script.test.ts).

for (const { colorScheme, expected } of cases) {
  test.describe(`OS preference: ${colorScheme}`, () => {
    test.use({ colorScheme });

    test(`first load uses the ${expected} theme`, async ({ page }) => {
      await page.goto("/en");
      await expect(page.locator("html")).toHaveAttribute(
        "data-theme",
        expected
      );
    });
  });
}
