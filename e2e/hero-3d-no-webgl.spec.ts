import { expect, test } from "@playwright/test";
import { collectConsoleProblems } from "./helpers/scripts";

test("without WebGL the hero shows the static layered graph", async ({
  page
}) => {
  const problems = collectConsoleProblems(page);
  await page.goto("/en");
  const graph = page.locator("[data-hero-graph]");
  await expect(graph).toHaveAttribute("data-gate", "fallback");
  await expect(page.locator('[data-graph-state="layered"]')).toBeVisible();
  await expect(page.locator('[data-caption-line="layered"]')).toBeVisible();
  await expect(page.locator("#hero-canvas-slot canvas")).toHaveCount(0);
  expect(problems).toEqual([]);
});

test("without WebGL the avatar is the static idle image", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("[data-hero-graph]")).toHaveAttribute(
    "data-gate",
    "fallback"
  );
  await expect(
    page.locator('#hero-canvas-slot [data-avatar-pose="idle"]')
  ).toBeVisible();
  await expect(
    page.locator('#hero-canvas-slot [data-avatar-pose="wave"]')
  ).toBeHidden();
});
