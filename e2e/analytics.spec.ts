import { expect, test } from "@playwright/test";

test("the Umami script is production-shaped and never targets this host", async ({
  page
}) => {
  await page.goto("/en");
  const script = page.locator('script[src="https://cloud.umami.is/script.js"]');
  await expect(script).toHaveCount(1);
  await expect(script).toHaveAttribute("data-website-id", /.+/);
  await expect(script).toHaveAttribute(
    "data-domains",
    "tracking-disabled.invalid"
  );
  await expect(script).toHaveAttribute("data-do-not-track", "true");
});

test("Speed Insights is not loaded off Vercel", async ({ page }) => {
  const vercel: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/_vercel/")) {
      vercel.push(request.url());
    }
  });
  await page.goto("/en");
  await page.waitForLoadState("networkidle");
  expect(vercel).toEqual([]);
});
