import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Open Sans and Google Sans Code keep these code points only in their "math"
// and "symbols" faces (~65–90 KB per page). The "Symbols Local" faces in
// globals.css draw them from a system font instead, so no extra web font is
// fetched. ↓ (U+2193) and − (U+2212) are in the latin face, but stay in the
// local family so all arrows and signs share one style.
const SYMBOLS = [0x2190, 0x2192, 0x2193, 0x2197, 0x2212, 0x2264];
// Code points in U+2070–U+2BFF the preloaded latin faces already carry.
const LATIN_FACE = [0x20ac, 0x2122, 0x2191, 0x2193, 0x2212, 0x2215];

const css = readFileSync(
  path.join(process.cwd(), "src/app/globals.css"),
  "utf8"
);
const symbolFaces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)]
  .map(([, body]) => body!)
  .filter((body) => /font-family:\s*"Symbols Local"/.test(body));

function codePoints(range: string): number[] {
  return range.split(",").flatMap((part) => {
    const [lo, hi = lo] = part.trim().replace(/^U\+/i, "").split("-");
    const out: number[] = [];
    for (let cp = parseInt(lo!, 16); cp <= parseInt(hi!, 16); cp++)
      out.push(cp);
    return out;
  });
}

describe("Symbols Local", () => {
  it("covers exactly the symbol code points, from local fonts only", () => {
    expect(symbolFaces.length).toBeGreaterThan(0);
    const covered = symbolFaces.flatMap((body) => {
      expect(body).not.toMatch(/url\(/);
      expect(body).toMatch(/src:\s*local\(/);
      return codePoints(/unicode-range:\s*([^;]+);/.exec(body)![1]!);
    });
    expect([...new Set(covered)].sort()).toEqual([...SYMBOLS].sort());
  });

  it("comes first in the sans and mono stacks", () => {
    expect(css).toMatch(
      /--font-sans:\s*"Symbols Local",\s*var\(--font-open-sans\)/
    );
    expect(css).toMatch(
      /--font-mono:\s*"Symbols Local",\s*var\(--font-google-sans-code\)/
    );
  });

  it("copy uses no symbol that would pull a late web-font face", () => {
    const files = [
      ...["en", "vi"].map((l) => `src/shared/i18n/messages/${l}.json`),
      ...readdirSync("content/work").map((f) => `content/work/${f}`)
    ];
    const allowed = new Set([...SYMBOLS, ...LATIN_FACE]);
    for (const file of files) {
      const stray = [...readFileSync(file, "utf8")].filter((ch) => {
        const cp = ch.codePointAt(0)!;
        return cp >= 0x2070 && cp <= 0x2bff && !allowed.has(cp);
      });
      expect(stray, file).toEqual([]);
    }
  });
});
