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

for (const locale of ["en", "vi"]) {
  test(`/${locale} has exactly one h1`, async ({ page }) => {
    await page.goto(`/${locale}`);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test(`/${locale} renders the About, Skills, and Contact sections`, async ({
    page
  }) => {
    await page.goto(`/${locale}`);
    for (const id of ["about", "work", "skills", "contact"]) {
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    }
  });
}

test("the hero CV button downloads /cv.pdf", async ({ page }) => {
  await page.goto("/en");
  const cv = page.locator("#top").getByRole("link", { name: "Download CV" });
  await expect(cv).toHaveAttribute("href", "/cv.pdf");
  await expect(cv).toHaveAttribute("download", "");
});

test("the contact section links to email", async ({ page }) => {
  await page.goto("/en");
  await expect(
    page.locator("#contact").getByRole("link", {
      name: "nguyenthanhdat22012001@gmail.com"
    })
  ).toHaveAttribute("href", "mailto:nguyenthanhdat22012001@gmail.com");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the home page content is fully rendered", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Nguyen Thanh Dat"
    );
    for (const id of ["about", "work", "skills", "contact"]) {
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    }
  });
});

test("the hero View work button jumps to the work section", async ({
  page
}) => {
  await page.goto("/en");
  await expect(
    page.locator("#top").getByRole("link", { name: "View work" })
  ).toHaveAttribute("href", "#work");
});

test.describe("mobile hero", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("shows the avatar slot above the headline", async ({ page }) => {
    await page.goto("/en");
    const slot = page.locator("[data-hero-canvas-slot]");
    await expect(slot).toBeVisible();
    await expect(slot).toHaveAttribute("aria-hidden", "true");
    const slotBox = await slot.boundingBox();
    const titleBox = await page.locator("h1").boundingBox();
    expect(slotBox?.y ?? Infinity).toBeLessThan(titleBox?.y ?? -Infinity);
  });
});
