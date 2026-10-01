import { expect, test } from "@playwright/test";

// A glyph outside the preloaded subsets (→ or ≤, say) makes the browser fetch
// another woff2 only after the CSS is parsed and the text laid out: an
// HTML → CSS → font chain Lighthouse flags. Every font a page uses must
// therefore be one it preloads. shared/ui/Glyph.tsx draws such symbols as SVG.
const paths = [
  "/en",
  "/vi",
  "/en/work/swift-performance",
  "/en/work/oneloyalty-layered-architecture",
  "/en/work/safebulk-bulk-editor",
  "/en/blog"
];

// Accepted exception: Google's latin-ext range overlaps vietnamese for
// ă/đ/ơ/ư and is declared later, so Vietnamese text needs it too. Preloading
// it would cost every /en page ~57 KB, and next/font can't preload per locale.
const LATIN_EXT = /^U\+100-2BA\b/i;

for (const path of paths) {
  test(`${path} only loads preloaded fonts`, async ({ page }) => {
    const requested = new Set<string>();
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname.endsWith(".woff2")) requested.add(url.pathname);
    });

    await page.goto(path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const { preloaded, ranges } = await page.evaluate(() => {
      const ranges: Record<string, string> = {};
      for (const sheet of document.styleSheets) {
        for (const rule of sheet.cssRules) {
          if (!(rule instanceof CSSFontFaceRule)) continue;
          const src = /url\("?([^")]+)"?\)/.exec(
            rule.style.getPropertyValue("src")
          )?.[1];
          if (src) {
            ranges[new URL(src, location.href).pathname] =
              rule.style.getPropertyValue("unicode-range");
          }
        }
      }
      const preloaded = [
        ...document.querySelectorAll<HTMLLinkElement>(
          'link[rel="preload"][as="font"]'
        )
      ].map((link) => new URL(link.href).pathname);
      return { preloaded, ranges };
    });

    expect(preloaded.length).toBeGreaterThan(0);
    const late = [...requested].filter(
      (font) =>
        !preloaded.includes(font) &&
        !(path.startsWith("/vi") && LATIN_EXT.test(ranges[font] ?? ""))
    );
    expect(
      late.map((font) => `${font} (${ranges[font]?.slice(0, 40)})`)
    ).toEqual([]);
  });
}
