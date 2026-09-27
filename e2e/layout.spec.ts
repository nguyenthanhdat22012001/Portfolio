import { expect, test } from "@playwright/test";

test("the skip link is the first focusable element and focuses main", async ({
  page
}) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("the header lists section links", async ({ page }) => {
  await page.goto("/en");
  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const name of ["About", "Work", "Skills", "Contact"]) {
    await expect(nav.getByRole("link", { name })).toBeVisible();
  }
});

test("the locale switcher keeps the page and changes language", async ({
  page
}) => {
  await page.goto("/en");
  await page
    .getByRole("navigation", { name: "Language" })
    .getByRole("link", { name: /VI/ })
    .click();
  await expect(page).toHaveURL(/\/vi$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyễn Thành Đạt"
  );
});

test("the footer links to email, LinkedIn, and GitHub", async ({ page }) => {
  await page.goto("/en");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Email" })).toHaveAttribute(
    "href",
    "mailto:nguyenthanhdat22012001@gmail.com"
  );
  await expect(footer.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    /linkedin\.com/
  );
  await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    /github\.com\/nguyenthanhdat22012001$/
  );
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("the menu opens and its links are reachable", async ({ page }) => {
    await page.goto("/en");
    await page.getByText("Menu", { exact: true }).click();
    const mobileNav = page.getByRole("navigation", { name: "Primary" });
    await expect(mobileNav.getByRole("link", { name: "Skills" })).toBeVisible();
  });
});
