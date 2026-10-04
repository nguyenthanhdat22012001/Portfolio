import { expect, test } from "@playwright/test";

test("Umami loads on the first input, never before (Lighthouse sees none)", async ({
  page
}) => {
  const src = "https://cloud.umami.is/script.js";
  const requests: string[] = [];
  await page.route(src, (route) => {
    requests.push(route.request().url());
    return route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.goto("/en");
  await page.waitForLoadState("networkidle");
  const script = page.locator(`script[src="${src}"]`);
  await expect(script).toHaveCount(0);
  expect(requests).toEqual([]);

  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
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
