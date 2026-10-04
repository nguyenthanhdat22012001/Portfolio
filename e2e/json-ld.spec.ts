import { expect, test, type Page } from "@playwright/test";

async function schemaTypes(page: Page): Promise<string[]> {
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  return blocks.flatMap((text) => {
    const data: unknown = JSON.parse(text);
    return (Array.isArray(data) ? data : [data]).map(
      (item) => (item as { "@type": string })["@type"]
    );
  });
}

for (const [path, types] of [
  ["/en", ["ProfilePage", "WebSite"]],
  ["/vi", ["ProfilePage", "WebSite"]],
  ["/en/work/swift-performance", ["CreativeWork", "BreadcrumbList"]],
  ["/vi/work/swift-performance", ["CreativeWork", "BreadcrumbList"]]
] as const) {
  test(`${path} has JSON-LD: ${types.join(", ")}`, async ({ page }) => {
    await page.goto(path);
    expect(await schemaTypes(page)).toEqual(types);
  });
}

test("the Vietnamese home page localizes the job title", async ({ page }) => {
  await page.goto("/vi");
  const text = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  expect(text).toContain("Kỹ sư Front-End");
});
