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
