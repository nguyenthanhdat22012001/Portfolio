import { expect, test } from "@playwright/test";

test("the skip link is the first focusable element and focuses main", async ({
  page,
  browserName
}) => {
  await page.goto("/en");
  // WebKit's Tab skips links unless Option is held (Safari's default).
  await page.keyboard.press(browserName === "webkit" ? "Alt+Tab" : "Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test(
  "the header lists section links",
  { tag: "@desktop" },
  async ({ page }) => {
    await page.goto("/en");
    const nav = page.getByRole("navigation", { name: "Primary" });
    for (const name of ["About", "Work", "Skills", "Contact"]) {
      await expect(nav.getByRole("link", { name })).toBeVisible();
    }
  }
);

test("the brand reads dat.nguyen and links home by name", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  const brand = page.getByRole("link", { name: "Nguyen Thanh Dat — home" });
  await expect(brand).toHaveText("dat.nguyen");
  await expect(brand).toHaveAttribute("href", /^\/en\/?$/);
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

test("the footer credits the stack and links to the source", async ({
  page
}) => {
  await page.goto("/en");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("Built with Next.js, GSAP, Three.js");
  await expect(
    footer.getByRole("link", { name: "Source on GitHub" })
  ).toHaveAttribute(
    "href",
    "https://github.com/nguyenthanhdat22012001/Portfolio"
  );
  // No production Lighthouse run is recorded yet (site.lighthouse = null).
  await expect(footer).not.toContainText("Lighthouse");
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("the menu opens and its links are reachable", async ({ page }) => {
    await page.goto("/en");
    await page.locator("summary", { hasText: "Menu" }).click();
    const mobileNav = page.getByRole("navigation", { name: "Primary" });
    await expect(mobileNav.getByRole("link", { name: "Skills" })).toBeVisible();
  });
});
