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

for (const locale of ["en", "vi"]) {
  test(`/${locale} puts the meta description in <head>`, async ({
    request
  }) => {
    const html = await (await request.get(`/${locale}`)).text();
    const description = html.indexOf('<meta name="description"');

    expect(description).toBeGreaterThan(-1);
    expect(description).toBeLessThan(html.indexOf("</head>"));
  });

  test(`/${locale} is served as a prerendered static page`, async ({
    request
  }) => {
    const response = await request.get(`/${locale}`);
    expect(response.headers()["cache-control"]).not.toContain("no-store");
  });
}

test("favicon.ico is served", async ({ request }) => {
  const response = await request.get("/favicon.ico");
  expect(response.status()).toBe(200);
});
