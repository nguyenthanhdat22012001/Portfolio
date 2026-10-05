import { expect, test } from "@playwright/test";
import { WORK_SLUGS, viPublished } from "./helpers/content";

const slugs = WORK_SLUGS;

for (const locale of ["en", "vi"]) {
  test(`/${locale} renders the three work chapters in order`, async ({
    page
  }) => {
    await page.goto(`/${locale}`);
    const chapters = page.locator("section#work article[data-chapter]");
    await expect(chapters).toHaveCount(3);
    for (const [index, slug] of slugs.entries()) {
      await expect(chapters.nth(index)).toHaveAttribute("data-chapter", slug);
      await expect(
        chapters.nth(index).locator(`a[href="/${locale}/work/${slug}"]`)
      ).toHaveCount(1);
    }
  });
}

test("/vi fallback case study marks its header links as vi", async ({
  page
}) => {
  test.skip(
    viPublished("safebulk-bulk-editor"),
    "VI is published; no fallback to test"
  );
  await page.goto("/vi/work/safebulk-bulk-editor");
  await expect(
    page.locator("article header ul:has(a[target=_blank])")
  ).toHaveAttribute("lang", "vi");
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  for (const locale of ["en", "vi"]) {
    test(`/${locale} has no horizontal overflow`, async ({ page }) => {
      await page.goto(`/${locale}`);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test("a chapter link opens its case study", async ({ page }) => {
  await page.goto("/en");
  await page
    .locator('article[data-chapter="swift-performance"]')
    .getByRole("link", { name: /Read case study/ })
    .click();
  await expect(page).toHaveURL(/\/en\/work\/swift-performance$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Swift");
});

for (const slug of slugs) {
  test(`/en/work/${slug} renders its MDX body`, async ({ page }) => {
    await page.goto(`/en/work/${slug}`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("article h2#context")).toBeVisible();
  });
}

test("English case studies show no fallback notice", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  await expect(page.getByTestId("fallback-notice")).toHaveCount(0);
});

test("Vietnamese falls back to English with a notice", async ({ page }) => {
  test.skip(
    viPublished("swift-performance"),
    "VI is published; no fallback to test"
  );
  await page.goto("/vi/work/swift-performance");
  await expect(page.getByTestId("fallback-notice")).toHaveText(
    "Bài viết này hiện chỉ có bằng tiếng Anh."
  );
  await expect(page.locator("article")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("link", { name: /Quay lại dự án/ })
  ).toBeVisible();
});

test("the locale switcher keeps the case study slug", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  await page
    .getByRole("navigation", { name: "Language" })
    .getByRole("link", { name: /VI/ })
    .click();
  await expect(page).toHaveURL(/\/vi\/work\/swift-performance$/);
});

test(
  "header section links from a case study go to the home section",
  { tag: "@desktop" },
  async ({ page }) => {
    await page.goto("/en/work/swift-performance");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "About" })
      .click();
    await expect(page).toHaveURL(/\/en\/?#about$/);
    await expect(page.locator("section#about h2")).toBeVisible();
  }
);

test("external MDX links open in a new tab", async ({ page }) => {
  await page.goto("/en/work/safebulk-bulk-editor");
  const link = page
    .locator("article")
    .getByRole("link", { name: "GitHub" })
    .first();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
});

test("an unknown Vietnamese work slug 404s", async ({ page }) => {
  const response = await page.goto("/vi/work/does-not-exist");
  expect(response?.status()).toBe(404);
});

test("SafeBulk links to the App Store, source and demo next to the case study link", async ({
  page
}) => {
  await page.goto("/en");
  const chapter = page.locator('article[data-chapter="safebulk-bulk-editor"]');
  await expect(
    chapter.getByRole("link", { name: /^Shopify App Store/ })
  ).toHaveAttribute("href", "https://apps.shopify.com/safebulk-editor");
  await expect(chapter.getByRole("link", { name: /^GitHub/ })).toHaveAttribute(
    "href",
    "https://github.com/nguyenthanhdat22012001/safe-bulk-shopify"
  );
  await expect(chapter.getByRole("link", { name: /^Demo/ })).toHaveAttribute(
    "href",
    "https://youtu.be/uaKi8VwIrKE"
  );
});

test("Swift and Oneloyalty chapters link only to their case study", async ({
  page
}) => {
  await page.goto("/en");
  for (const slug of ["swift-performance", "oneloyalty-layered-architecture"]) {
    await expect(
      page.locator(`article[data-chapter="${slug}"] a[target="_blank"]`)
    ).toHaveCount(0);
  }
});

test("chapter eyebrows show the company or co-founder role and years", async ({
  page
}) => {
  await page.goto("/en");
  const eyebrow = (slug: string) =>
    page.locator(`article[data-chapter="${slug}"] p`).first();
  await expect(eyebrow("swift-performance")).toHaveText(
    "01 · FireGroup · 2022–2024"
  );
  await expect(eyebrow("oneloyalty-layered-architecture")).toHaveText(
    "02 · FireGroup · 2024–2026"
  );
  await expect(eyebrow("safebulk-bulk-editor")).toHaveText(
    "03 · Co-founder · 2026"
  );
});

test("every chapter shows exactly two stats", async ({ page }) => {
  await page.goto("/en");
  for (const slug of slugs) {
    await expect(
      page.locator(`article[data-chapter="${slug}"] dl dd`)
    ).toHaveCount(2);
  }
});

test("the second chapter shows its visual first on desktop but keeps the heading first in the DOM", async ({
  page
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en");
  const chapter = page.locator(
    'article[data-chapter="oneloyalty-layered-architecture"]'
  );
  const figureBox = await chapter.locator("figure").boundingBox();
  const titleBox = await chapter.locator("h3").boundingBox();
  expect(figureBox?.x ?? Infinity).toBeLessThan(titleBox?.x ?? -Infinity);
  const firstTag = await chapter
    .locator("h3, figure")
    .first()
    .evaluate((element) => element.tagName);
  expect(firstTag).toBe("H3");
});

test("the Oneloyalty visual explains the CLS demo to screen readers", async ({
  page
}) => {
  await page.goto("/en");
  const chapter = page.locator(
    'article[data-chapter="oneloyalty-layered-architecture"]'
  );
  await expect(chapter.locator("[data-cls-demo] .sr-only")).toContainText(
    "CLS ≤ 0.1"
  );
  await expect(chapter.locator("[data-layer]")).toHaveCount(2);
});

test("a case study header shows role, team, and its store link first", async ({
  page
}) => {
  await page.goto("/en/work/safebulk-bulk-editor");
  const header = page.locator("article header");
  await expect(header.getByTestId("article-byline")).toHaveText(
    "Co-founder · Sole Front-End Developer · 1 FE, 1 BE"
  );
  const links = header.getByRole("link");
  await expect(links.first()).toHaveAttribute(
    "href",
    "https://apps.shopify.com/safebulk-editor"
  );
  await expect(links.first()).toHaveAccessibleName(
    /^Shopify App Store.*\(opens in new tab\)$/
  );
  await expect(header.getByRole("link", { name: /^Demo/ })).toHaveAttribute(
    "href",
    "https://youtu.be/uaKi8VwIrKE"
  );
});

test("Swift's header links to its live Shopify listing", async ({ page }) => {
  await page.goto("/en/work/swift-performance");
  await expect(page.getByTestId("article-byline")).toHaveText(
    "Front-End Engineer (joined as a fresher) · Team of 9 (2 FE)"
  );
  await expect(
    page.locator("article header").getByRole("link", { name: /^Live app/ })
  ).toHaveAttribute("href", "https://apps.shopify.com/swift");
});

test("the Vietnamese home keeps English chapter content marked as English", async ({
  page
}) => {
  test.skip(
    viPublished("swift-performance"),
    "VI is published; no fallback to test"
  );
  await page.goto("/vi");
  const chapter = page.locator('article[data-chapter="swift-performance"]');
  await expect(chapter.locator("h3")).toHaveAttribute("lang", "en");
  await expect(chapter.locator("dl")).toHaveAttribute("lang", "en");
  await expect(
    chapter.getByRole("link", { name: /Đọc case study/ })
  ).not.toHaveAttribute("lang", "en");
  await expect(
    page.locator('article[data-chapter="safebulk-bulk-editor"] p').first()
  ).toHaveText("03 · Đồng sáng lập · 2026");
});

test.describe("Swift and Oneloyalty visuals without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("show their final state", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator('[data-step][data-state="done"]')).toHaveCount(4);
    await expect(page.locator("[data-result-value]")).toHaveText("−20%");
    await expect(page.locator("[data-layer]")).toHaveCount(2);
  });

  for (const viewport of [
    { width: 360, height: 800 },
    { width: 800, height: 900 },
    { width: 1280, height: 800 }
  ]) {
    test(`keep the CLS demo panes unclipped at ${viewport.width}px`, async ({
      page
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/en");
      const panes = page.locator("[data-cls-demo] [data-layer]");
      await expect(panes).toHaveCount(2);
      const sizes = await panes.evaluateAll((els) =>
        els.map((el) => ({
          layer: (el as HTMLElement).dataset.layer,
          scroll: el.scrollHeight,
          client: el.clientHeight
        }))
      );
      for (const { layer, scroll, client } of sizes) {
        expect(scroll, `${layer} pane`).toBeLessThanOrEqual(client);
      }
    });
  }
});

test("SafeBulk renders its comparison and results tables", async ({ page }) => {
  await page.goto("/en/work/safebulk-bulk-editor");
  const tables = page.locator("article table");
  await expect(tables).toHaveCount(2);
  await expect(tables.first().locator("th").first()).toHaveText(
    "What merchants complained about"
  );
});

test("Swift renders its progress screenshot without layout shift", async ({
  page
}) => {
  await page.goto("/en/work/swift-performance");
  const image = page.locator('article img[src*="progress.webp"]');
  await expect(image).toHaveAttribute("width", "1600");
  await expect(image).toHaveAttribute("height", "822");
  await expect(image).toHaveAttribute("loading", "lazy");
});

test("the Oneloyalty chapter shows its frontmatter metrics", async ({
  page
}) => {
  await page.goto("/en");
  const stats = page.locator(
    'article[data-chapter="oneloyalty-layered-architecture"] dl dd'
  );
  await expect(stats).toHaveText(["≤ 0.1", "2 → 1"]);
});

for (const slug of WORK_SLUGS) {
  test(`/vi/work/${slug} renders Vietnamese once published`, async ({
    page
  }) => {
    test.skip(!viPublished(slug), "VI is still a draft");
    await page.goto(`/vi/work/${slug}`);
    await expect(page.getByTestId("fallback-notice")).toHaveCount(0);
    await expect(page.locator("article")).not.toHaveAttribute("lang", "en");
  });
}
