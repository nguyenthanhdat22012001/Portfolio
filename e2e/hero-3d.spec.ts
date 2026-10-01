import { expect, test, type Page } from "@playwright/test";

const graph = (page: Page) => page.locator("[data-hero-graph]");
const svg = (page: Page, state: "chaos" | "layered") =>
  page.locator(`#hero-canvas-slot [data-graph-state="${state}"]`);
const caption = (page: Page, state: "chaos" | "layered") =>
  page.locator(`[data-caption-line="${state}"]`);

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the layered graph and the layered caption", async ({ page }) => {
    await page.goto("/en");
    await expect(svg(page, "layered")).toBeVisible();
    await expect(svg(page, "chaos")).toBeHidden();
    await expect(caption(page, "layered")).toBeVisible();
    await expect(caption(page, "chaos")).toBeHidden();
    await expect(page.getByText("app", { exact: true })).toBeVisible();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows the layered graph from the first paint", async ({ page }) => {
    await page.goto("/en");
    await expect(svg(page, "layered")).toBeVisible();
    await expect(caption(page, "layered")).toBeVisible();
  });
});

test("with JS and motion allowed, the tangle is the placeholder", async ({
  page
}) => {
  await page.goto("/en");
  await expect(graph(page)).toHaveAttribute("data-morph", "chaos");
  await expect(svg(page, "chaos")).toBeVisible();
  await expect(caption(page, "chaos")).toBeVisible();
});
