import { expect, test } from "@playwright/test";

const cases = [
  {
    path: "/en/nope",
    heading: "This page wandered off the graph.",
    home: "Back to home"
  },
  {
    path: "/en/work/does-not-exist",
    heading: "This page wandered off the graph.",
    home: "Back to home"
  },
  {
    path: "/vi/work/does-not-exist",
    heading: "Trang này đã lạc khỏi sơ đồ.",
    home: "Về trang chủ"
  },
  {
    path: "/en/blog/does-not-exist",
    heading: "This page wandered off the graph.",
    home: "Back to home"
  }
];

for (const { path, heading, home } of cases) {
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
    await expect(page.getByRole("link", { name: home })).toHaveAttribute(
      "href",
      `/${path.slice(1, 3)}`
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/
    );
  });
}

test("the 404 graph is the static SVG with one drifting node, no three.js", async ({
  page
}) => {
  const scripts: string[] = [];
  page.on("response", async (response) => {
    if (response.url().includes("/_next/static/chunks/")) {
      scripts.push(await response.text().catch(() => ""));
    }
  });
  await page.goto("/en/nope");
  await page.waitForLoadState("networkidle");
  const svg = page.locator('.not-found-graph svg[data-graph-state="layered"]');
  await expect(svg).toBeVisible();
  await expect(svg.locator("[data-drift]")).toHaveCount(1);
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(scripts.some((source) => source.includes("WebGLRenderer"))).toBe(
    false
  );
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the drifting node stays still", async ({ page }) => {
    await page.goto("/en/nope");
    const name = await page
      .locator("[data-drift]")
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(name).toBe("none");
  });
});
