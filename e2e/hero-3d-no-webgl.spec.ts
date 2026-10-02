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

test("without WebGL the About avatar is the static idle image", async ({
  page
}) => {
  await page.goto("/en");
  const slot = page.locator("#about-avatar-slot");
  await expect(slot).toHaveAttribute("data-gate", "fallback");
  await slot.scrollIntoViewIfNeeded();
  await expect(slot.locator('[data-avatar-pose="idle"]')).toBeVisible();
  await expect(slot.locator('[data-avatar-pose="wave"]')).toBeHidden();
  await expect(slot.locator("canvas")).toHaveCount(0);
});
