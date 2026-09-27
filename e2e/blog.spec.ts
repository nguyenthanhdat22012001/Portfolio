import { expect, test } from "@playwright/test";

test("/en/blog shows the empty state", async ({ page }) => {
  await page.goto("/en/blog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Blog");
  await expect(
    page.getByText("No posts yet — the first ones are on the way.")
  ).toBeVisible();
});

test("/vi/blog shows the Vietnamese empty state", async ({ page }) => {
  await page.goto("/vi/blog");
  await expect(
    page.getByText("Chưa có bài viết nào — những bài đầu tiên sắp ra mắt.")
  ).toBeVisible();
});

test("the header hides the Blog link while there are no posts", async ({
  page
}) => {
  await page.goto("/en");
  await expect(
    page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "Blog" })
  ).toHaveCount(0);
});

test("an unknown blog slug 404s", async ({ page }) => {
  const response = await page.goto("/en/blog/does-not-exist");
  expect(response?.status()).toBe(404);
});
