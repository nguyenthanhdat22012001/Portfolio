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

test("the toggle switches theme and the choice survives a reload", async ({
  page
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/en");
  const toggle = page.getByRole("button", { name: "Dark theme" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

// The locale is the root layout's segment, so a client-side switch would
// remount <html> without re-running the inline theme script.
test("the chosen theme survives a locale switch", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/en");
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page
    .getByRole("navigation", { name: "Language" })
    .getByRole("link", { name: /VI/ })
    .click();
  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(errors.filter((e) => e.includes("script tag"))).toEqual([]);
});
