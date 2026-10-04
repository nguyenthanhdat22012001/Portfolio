import { expect, test } from "@playwright/test";

// site.features.blog is false: the blog is switched off until posts exist.
for (const path of ["/en/blog", "/vi/blog", "/en/blog/does-not-exist"]) {
  test(`${path} returns 404 while the blog is off`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
  });
}

test("no navigation offers a Blog link", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("link", { name: "Blog" })).toHaveCount(0);
});

test("sitemap.xml has no blog URL", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).not.toContain("/blog");
});
