import { expect, test } from "@playwright/test";

test("home page renders in English by default", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyen Thanh Dat"
  );
});

test("home page renders in Vietnamese", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Nguyễn Thành Đạt"
  );
});

test("root path redirects to the default locale", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
});

test("an unknown work slug 404s", async ({ page }) => {
  const response = await page.goto("/en/work/does-not-exist");
  expect(response?.status()).toBe(404);
});
