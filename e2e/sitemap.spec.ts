import { expect, test } from "@playwright/test";

const origin = "http://localhost:3000";

test("sitemap.xml lists real pages with hreflang alternates", async ({
  request
}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();

  for (const path of [
    "/en",
    "/vi",
    "/en/work/swift-performance",
    "/en/work/oneloyalty-layered-architecture",
    "/en/work/safebulk-bulk-editor"
  ]) {
    expect(xml).toContain(`<loc>${origin}${path}</loc>`);
  }
  expect(xml).toContain(`hreflang="vi" href="${origin}/vi"`);
  // Fallback versions and the empty blog are not listed.
  expect(xml).not.toContain(`${origin}/vi/work/`);
  expect(xml).not.toContain("/blog");
});

test("robots.txt allows crawling and points at the sitemap", async ({
  request
}) => {
  const response = await request.get("/robots.txt");
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).toContain("Allow: /");
  expect(text).not.toContain("Disallow");
  expect(text).toContain(`Sitemap: ${origin}/sitemap.xml`);
});
