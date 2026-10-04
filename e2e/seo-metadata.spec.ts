import { expect, test, type Page } from "@playwright/test";
import { WORK_SLUGS, viPublished } from "./helpers/content";

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

for (const slug of WORK_SLUGS) {
  const en = `${origin}/en/work/${slug}`;
  const vi = `${origin}/vi/work/${slug}`;

  test(`/en/work/${slug}: hreflang matches its published locales`, async ({
    page
  }) => {
    await page.goto(`/en/work/${slug}`);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      en
    );
    expect(await hreflangs(page)).toEqual(
      viPublished(slug) ? { en, vi, "x-default": en } : { en, "x-default": en }
    );
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description?.length).toBeGreaterThanOrEqual(140);
    expect(description?.length).toBeLessThanOrEqual(160);
  });

  test(`/vi/work/${slug}: canonical follows the VI publish state`, async ({
    page
  }) => {
    const response = await page.goto(`/vi/work/${slug}`);
    // hreflang comes only from the page's metadata; next-intl's Link header
    // would list /vi even for a fallback page (Lighthouse SEO "canonical").
    expect(response?.headers()["link"] ?? "").not.toContain("hreflang");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      viPublished(slug) ? vi : en
    );
    if (!viPublished(slug)) {
      await expect(
        page.locator('link[rel="alternate"][hreflang]')
      ).toHaveCount(0);
    }
  });
}

for (const [path, image] of [
  ["/en", "/en/opengraph-image"],
  ["/vi", "/vi/opengraph-image"],
  ["/en/work/swift-performance", "/en/work/swift-performance/opengraph-image"]
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
