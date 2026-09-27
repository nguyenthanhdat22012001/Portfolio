import { expect, test } from "@playwright/test";

const slugs = [
  "swift-performance",
  "oneloyalty-layered-architecture",
  "safebulk-bulk-editor"
];

for (const locale of ["en", "vi"]) {
  test(`/${locale} renders the three work chapters in order`, async ({
    page
  }) => {
    await page.goto(`/${locale}`);
    const chapters = page.locator("section#work article[data-chapter]");
    await expect(chapters).toHaveCount(3);
    for (const [index, slug] of slugs.entries()) {
      await expect(chapters.nth(index)).toHaveAttribute("data-chapter", slug);
      await expect(
        chapters.nth(index).locator(`a[href="/${locale}/work/${slug}"]`)
      ).toHaveCount(1);
    }
  });
}

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("the home page has no horizontal overflow", async ({ page }) => {
    await page.goto("/en");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("a chapter link opens its case study", async ({ page }) => {
  await page.goto("/en");
  await page
    .locator('article[data-chapter="swift-performance"]')
    .getByRole("link", { name: /Read case study/ })
    .click();
  await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Swift");
});

for (const slug of slugs) {
  test(`/en/work/${slug} renders its MDX body`, async ({ page }) => {
    await page.goto(`/en/work/${slug}`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("article h2#context")).toBeVisible();
  });
}

test("English case studies show no fallback notice", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  await expect(page.getByTestId("fallback-notice")).toHaveCount(0);
});

test("Vietnamese falls back to English with a notice", async ({ page }) => {
  await page.goto("/vi/work/swift-performance");
  await expect(page.getByTestId("fallback-notice")).toHaveText(
    "Bài viết này hiện chỉ có bằng tiếng Anh."
  );
  await expect(page.locator("article")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("link", { name: /Quay lại dự án/ })
  ).toBeVisible();
});

test("the locale switcher keeps the case study slug", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  await page
    .getByRole("navigation", { name: "Language" })
    .getByRole("link", { name: /VI/ })
    .click();
  await expect(page).toHaveURL(/\/vi\/work\/swift-performance$/);
});

test("header section links from a case study go to the home section", async ({
  page
}) => {
  await page.goto("/en/work/swift-performance");
  await page
    .getByRole("navigation", { name: "Primary" })
    .getByRole("link", { name: "About" })
    .click();
  await expect(page).toHaveURL(/\/en\/?#about$/);
  await expect(page.locator("section#about h2")).toBeVisible();
});

test("external MDX links open in a new tab", async ({ page }) => {
  await page.goto("/en/work/safebulk-bulk-editor");
  const link = page
    .locator("article")
    .getByRole("link", { name: "GitHub" })
    .first();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("an unknown Vietnamese work slug 404s", async ({ page }) => {
  const response = await page.goto("/vi/work/does-not-exist");
  expect(response?.status()).toBe(404);
});
