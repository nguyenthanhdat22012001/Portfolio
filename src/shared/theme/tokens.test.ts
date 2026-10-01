import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { colorTokens, themes, type ColorToken } from "./tokens";

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(1 + offset, 3 + offset), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number
  ];
  return (light + 0.05) / (dark + 0.05);
}

const textPairs: Array<[ColorToken, ColorToken]> = [
  ["fg", "bg"],
  ["fg", "bg-elevated"],
  ["fg-muted", "bg"],
  ["fg-muted", "bg-elevated"],
  ["accent", "bg"],
  ["accent", "bg-elevated"],
  ["accent-fg", "accent"]
];

describe("color tokens", () => {
  for (const theme of themes) {
    it.each(textPairs)(`${theme}: %s on %s is at least 4.5:1`, (fg, bg) => {
      expect(
        contrast(colorTokens[theme][fg], colorTokens[theme][bg])
      ).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("globals.css mirrors tokens.ts", () => {
  const css = readFileSync(
    path.resolve(process.cwd(), "src/app/globals.css"),
    "utf8"
  ).toLowerCase();

  function block(selector: string): string {
    const start = css.indexOf(`${selector} {`);
    if (start === -1) throw new Error(`globals.css is missing ${selector}`);
    return css.slice(start, css.indexOf("}", start));
  }

  const blocks = {
    light: [block(":root")],
    dark: [block('[data-theme="dark"]'), block(":root:not([data-theme])")]
  } as const;

  for (const theme of themes) {
    it(`declares every ${theme} token`, () => {
      for (const cssBlock of blocks[theme]) {
        for (const [name, value] of Object.entries(colorTokens[theme])) {
          expect(cssBlock).toContain(`--${name}: ${value.toLowerCase()};`);
        }
      }
    });
  }
});

describe("decorative fills", () => {
  for (const theme of themes) {
    it(`${theme}: bg-muted is visible on bg-elevated (at least 1.25:1)`, () => {
      expect(
        contrast(
          colorTokens[theme]["bg-muted"],
          colorTokens[theme]["bg-elevated"]
        )
      ).toBeGreaterThanOrEqual(1.25);
    });
  }

  for (const theme of themes) {
    it(`${theme}: silver is visible on bg and bg-elevated (at least 3:1)`, () => {
      for (const bg of ["bg", "bg-elevated"] as const) {
        expect(
          contrast(colorTokens[theme].silver, colorTokens[theme][bg])
        ).toBeGreaterThanOrEqual(3);
      }
    });
  }

  it("never uses bg-muted, earth or silver as a text color", () => {
    const root = path.resolve(process.cwd(), "src");
    const files = readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => path.join(root, file));

    for (const file of files) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /\btext-(bg-muted|earth|silver)\b/
      );
    }
  });
});
