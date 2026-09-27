import { expect, test } from "@playwright/test";

const cases = [
  { path: "/en/nope", heading: "Page not found" },
  { path: "/en/work/does-not-exist", heading: "Page not found" },
  { path: "/vi/work/does-not-exist", heading: "Không tìm thấy trang" },
  { path: "/en/blog/does-not-exist", heading: "Page not found" }
];

for (const { path, heading } of cases) {
  test(`${path} renders the translated 404 inside the site layout`, async ({
    page
  }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      path.slice(1, 3)
    );
  });
}
