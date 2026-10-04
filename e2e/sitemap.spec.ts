import { expect, test } from "@playwright/test";
import { WORK_SLUGS, viPublished } from "./helpers/content";

const origin = "http://localhost:3000";

test("sitemap.xml lists real pages with hreflang alternates", async ({
  request
}) => {
  const response = await request.get("/sitemap.xml");
  expect(response.status()).toBe(200);
  const xml = await response.text();

  for (const path of ["/en", "/vi", ...WORK_SLUGS.map((s) => `/en/work/${s}`)]) {
    expect(xml).toContain(`<loc>${origin}${path}</loc>`);
  }
  expect(xml).toContain(`hreflang="vi" href="${origin}/vi"`);
  // Draft (fallback) translations and the hidden blog are not listed.
  for (const slug of WORK_SLUGS) {
    const vi = `<loc>${origin}/vi/work/${slug}</loc>`;
    if (viPublished(slug)) {
      expect(xml).toContain(vi);
      expect(xml).toContain(`hreflang="vi" href="${origin}/vi/work/${slug}"`);
    } else {
      expect(xml).not.toContain(vi);
    }
  }
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
