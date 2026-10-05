import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { cspViolations, watchCsp } from "./helpers/csp";
import {
  stubUmami,
  umamiCalls,
  waitForUmami,
  UMAMI_SCRIPT
} from "./helpers/umami";

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
  await expect(script).toHaveAttribute("data-exclude-hash", "true");
});

// The real Cloud tracker (vendored, so the test is offline and stable) must
// be able to send under our CSP: it posts to gateway.umami.is/api/send.
// Outside a Vercel production build data-domains is a never-matching host,
// so the served script first points data-domains at the test host. It runs
// as document.currentScript before the tracker reads its attributes, which
// keeps the page's HTML and the loader untouched.
test("the real Umami tracker sends to its gateway without CSP violations", async ({
  page
}) => {
  const tracker = readFileSync(
    path.join(process.cwd(), "e2e/fixtures/umami-script.js"),
    "utf8"
  );
  const allowHost = `document.currentScript.setAttribute("data-domains",location.hostname);\n`;
  await page.route(UMAMI_SCRIPT, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: allowHost + tracker
    })
  );
  const sends: string[] = [];
  await page.route("https://gateway.umami.is/api/send", (route) => {
    sends.push(route.request().postData() ?? "");
    return route.fulfill({ contentType: "application/json", body: "{}" });
  });
  await watchCsp(page);
  await page.goto("/en");
  await waitForUmami(page);
  // Wait for the pageview to be sent or blocked, then check both.
  await expect
    .poll(async () => sends.length + (await cspViolations(page)).length)
    .toBeGreaterThan(0);
  expect(await cspViolations(page)).toEqual([]);
  expect(sends.length).toBeGreaterThan(0);
  expect(JSON.parse(sends[0]!)).toMatchObject({ type: "event" });
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

const EXTERNAL = /linkedin\.com|github\.com|apps\.shopify\.com|youtu\.be/;

test.describe("events", () => {
  test.beforeEach(async ({ context }) => {
    await stubUmami(context);
    // Outbound links open in new tabs; never hit the real sites.
    await context.route(EXTERNAL, (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>stub</title>" })
    );
  });

  async function home(page: Page, path = "/en") {
    await page.goto(path);
    await waitForUmami(page);
  }

  test("View work: cta_view_work, and it still scrolls to Work", async ({
    page
  }) => {
    await home(page);
    await page.locator('#top a[data-track="cta_view_work"]').click();
    await expect(page.locator("#work")).toBeInViewport();
    expect(await umamiCalls(page)).toContainEqual(["cta_view_work", null]);
  });

  for (const location of ["hero", "contact"] as const) {
    test(`${location} CV: cv_download and the file still downloads`, async ({
      page
    }) => {
      await home(page);
      const link = page.locator(
        `a[data-track="cv_download"][data-track-location="${location}"]`
      );
      const download = page.waitForEvent("download");
      await link.click();
      expect((await download).suggestedFilename()).toBe("cv.pdf");
      expect(await umamiCalls(page)).toContainEqual([
        "cv_download",
        { location }
      ]);
    });
  }

  test("copy email: email_copy", async ({ page }) => {
    await home(page);
    await page.locator('button[data-track="email_copy"]').click();
    expect(await umamiCalls(page)).toContainEqual(["email_copy", null]);
  });

  test("case study link: case_study_open, navigating client-side", async ({
    page
  }) => {
    await home(page);
    await page.evaluate(() => {
      (window as { __noReload?: boolean }).__noReload = true;
    });
    await page
      .locator(
        'a[data-track="case_study_open"][data-track-slug="swift-performance"]'
      )
      .click();
    await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
    expect(
      await page.evaluate(() => (window as { __noReload?: boolean }).__noReload)
    ).toBe(true);
    expect(await umamiCalls(page)).toContainEqual([
      "case_study_open",
      { slug: "swift-performance" }
    ]);
  });

  for (const target of ["linkedin", "github", "repo"] as const) {
    test(`${target} link: outbound_click`, async ({ page }) => {
      await home(page);
      const link = page.locator(
        `a[data-track="outbound_click"][data-track-target="${target}"]`
      );
      await expect(link).toHaveCount(1);
      if ((await link.getAttribute("target")) === "_blank") {
        const popup = page.waitForEvent("popup");
        await link.click();
        await (await popup).close();
      } else {
        await link.click();
        await page.waitForURL(EXTERNAL);
        await page.goBack();
      }
      expect(await umamiCalls(page)).toContainEqual([
        "outbound_click",
        { target }
      ]);
    });
  }

  test("case study links carry their kind; App Store sends outbound_click", async ({
    page
  }) => {
    await home(page, "/en/work/safebulk-bulk-editor");
    const header = page.locator("main");
    for (const target of ["appStore", "source", "demo"]) {
      await expect(
        header
          .locator(
            `a[data-track="outbound_click"][data-track-target="${target}"]`
          )
          .first()
      ).toBeAttached();
    }
    const popup = page.waitForEvent("popup");
    await header
      .locator('a[data-track="outbound_click"][data-track-target="appStore"]')
      .first()
      .click();
    await (await popup).close();
    expect(await umamiCalls(page)).toContainEqual([
      "outbound_click",
      { target: "appStore" }
    ]);
  });

  test("locale switch: locale_switch survives the page load", async ({
    page
  }) => {
    await home(page);
    const nav = page.getByRole("navigation", { name: "Language" });
    await expect(nav.locator('a[aria-current="true"]')).not.toHaveAttribute(
      "data-track",
      /.*/
    );
    await nav
      .locator('a[data-track="locale_switch"][data-track-to="vi"]')
      .click();
    await expect(page).toHaveURL(/\/vi$/);
    expect(await umamiCalls(page)).toContainEqual([
      "locale_switch",
      { to: "vi" }
    ]);
  });
});

test("with Umami blocked, tracked controls still work and nothing throws", async ({
  page,
  context
}) => {
  await context.route(UMAMI_SCRIPT, (route) => route.abort());
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/en");
  await page.waitForLoadState("networkidle");
  const download = page.waitForEvent("download");
  await page
    .locator('a[data-track="cv_download"][data-track-location="hero"]')
    .click();
  await download;
  await page.locator('button[data-track="email_copy"]').click();
  expect(errors).toEqual([]);
});

// next-intl sets NEXT_LOCALE only when the URL's locale differs from the
// one Accept-Language would pick, so visiting /en alone in an en-US browser
// never showed it. Check every document response, both locales.
test("no cookies are set", async ({ page, context, request }) => {
  await stubUmami(context);
  const root = await request.get("/", {
    maxRedirects: 0,
    headers: { "accept-language": "vi" }
  });
  expect(root.status()).toBe(307);
  expect(root.headers()["location"]).toMatch(/\/vi$/);
  expect(root.headers()["set-cookie"]).toBeUndefined();

  for (const path of [
    "/en",
    "/vi",
    "/en/work/swift-performance",
    "/vi/work/safebulk-bulk-editor"
  ]) {
    const response = await page.goto(path);
    expect(await response!.headerValue("set-cookie"), path).toBeNull();
    await waitForUmami(page);
  }
  await page.goto("/en");
  await waitForUmami(page);
  await page.locator('button[data-track="email_copy"]').click();
  expect(await context.cookies()).toEqual([]);
});
