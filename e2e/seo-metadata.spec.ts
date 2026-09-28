import { expect, test, type Page } from "@playwright/test";

const origin = "http://localhost:3000";

async function hreflangs(page: Page) {
  return page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((links) =>
      Object.fromEntries(
        links.map((link) => [
          link.getAttribute("hreflang"),
          link.getAttribute("href")
        ])
      )
    );
}

test("/en: self canonical, en/vi/x-default alternates", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${origin}/en`
  );
  expect(await hreflangs(page)).toEqual({
    en: `${origin}/en`,
    vi: `${origin}/vi`,
    "x-default": `${origin}/en`
  });
});

test("/vi: self canonical", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${origin}/vi`
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "vi_VN"
  );
});

test("an English case study lists only its real locales", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${origin}/en/work/swift-performance`
  );
  expect(await hreflangs(page)).toEqual({
    en: `${origin}/en/work/swift-performance`,
    "x-default": `${origin}/en/work/swift-performance`
  });
  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  expect(description?.length).toBeGreaterThanOrEqual(140);
  expect(description?.length).toBeLessThanOrEqual(160);
});

test("a Vietnamese fallback case study is canonicalised to English", async ({
  page
}) => {
  await page.goto("/vi/work/swift-performance");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${origin}/en/work/swift-performance`
  );
  await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
});

for (const [path, image] of [
  ["/en", "/en/opengraph-image"],
  ["/vi", "/vi/opengraph-image"],
  ["/en/work/swift-performance", "/en/work/swift-performance/opengraph-image"],
  ["/en/blog", "/en/opengraph-image"]
] as const) {
  test(`${path} has a working og:image and twitter card`, async ({
    page,
    request
  }) => {
    await page.goto(path);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `${origin}${image}`
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      "content",
      "summary_large_image"
    );
    const response = await request.get(image);
    expect(response.headers()["content-type"]).toBe("image/png");
  });
}

test("the empty blog index is noindex", async ({ page }) => {
  await page.goto("/en/blog");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/
  );
});

test("the home page is indexable", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]')
  ).toHaveCount(0);
});

test("unknown paths are noindex", async ({ page }) => {
  await page.goto("/en/nope");
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]')
  ).toHaveCount(1);
});
