import { expect, test } from "@playwright/test";
import { cspViolations, thirdPartyHosts, watchCsp } from "./helpers/csp";
import { stubUmami, waitForUmami } from "./helpers/umami";

const remote = Boolean(process.env.PLAYWRIGHT_BASE_URL);

test("every page sends the security headers", async ({ page, request }) => {
  const response = await page.goto("/en");
  const headers = response!.headers();
  const csp = headers["content-security-policy"] ?? "";
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).toContain("'wasm-unsafe-eval'");
  expect(csp).not.toContain("'unsafe-eval'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toBe(
    "camera=(), microphone=(), geolocation=()"
  );
  expect(headers["x-frame-options"]).toBe("DENY");
  // Locally the build is "preview": no HSTS, no upgrade-insecure-requests.
  // Vercel adds its own HSTS on *.vercel.app, so skip that check remotely.
  if (!remote) {
    expect(headers["strict-transport-security"]).toBeUndefined();
    expect(csp).not.toContain("upgrade-insecure-requests");
  }

  // Hashed static assets get only nosniff (document-only headers skipped).
  // Vercel may append ?dpl=… to static URLs, so match on the URL path.
  const srcs = await page
    .locator('script[src*="/_next/static/"]')
    .evaluateAll((els) => els.map((el) => (el as HTMLScriptElement).src));
  const src = srcs.find((s) => new URL(s).pathname.endsWith(".js"));
  expect(src).toBeDefined();
  const asset = await request.get(src!);
  expect(asset.ok()).toBe(true);
  expect(asset.headers()["x-content-type-options"]).toBe("nosniff");
  expect(asset.headers()["content-security-policy"]).toBeUndefined();
});

for (const path of [
  "/en",
  "/vi",
  "/en/work/swift-performance",
  "/vi/work/safebulk-bulk-editor"
]) {
  test(`${path} has no CSP violations`, async ({ page, context, baseURL }) => {
    if (!remote) await stubUmami(context);
    await watchCsp(page);
    const hosts = thirdPartyHosts(page, baseURL!);
    await page.goto(path);
    await waitForUmami(page);
    // First interaction loads the motion chunk; then walk the page so
    // lazy images and effects run.
    await page.mouse.move(200, 200);
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });
    await page.waitForLoadState("networkidle");
    console.log(`${path} third-party hosts: ${hosts().join(", ") || "none"}`);
    expect(await cspViolations(page)).toEqual([]);
  });
}
