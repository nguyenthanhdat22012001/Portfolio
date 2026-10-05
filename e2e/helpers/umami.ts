import type { BrowserContext, Page } from "@playwright/test";

export const UMAMI_SCRIPT = "https://cloud.umami.is/script.js";

// Stands in for Umami: records track() calls in sessionStorage, so calls
// made right before a same-tab navigation (locale switch) survive it.
const STUB = `(function(){var KEY="__umamiCalls";window.umami={track:function(name,data){var calls=JSON.parse(sessionStorage.getItem(KEY)||"[]");calls.push([name,data===undefined?null:data]);sessionStorage.setItem(KEY,JSON.stringify(calls))}}})()`;

export type UmamiCall = [name: string, data: Record<string, string> | null];

export async function stubUmami(context: BrowserContext) {
  await context.route(UMAMI_SCRIPT, (route) =>
    route.fulfill({ contentType: "application/javascript", body: STUB })
  );
}

// Umami loads on the first input (scroll, pointermove, keydown,
// touchstart); a synthetic scroll on window triggers it in every engine.
export async function waitForUmami(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForFunction(
    () => typeof (window as { umami?: { track?: unknown } }).umami?.track === "function"
  );
}

export function umamiCalls(page: Page): Promise<UmamiCall[]> {
  return page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("__umamiCalls") ?? "[]")
  );
}
