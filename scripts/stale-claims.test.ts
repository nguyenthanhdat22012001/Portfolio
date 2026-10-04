import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findStale } from "./stale-claims.mjs";

describe("stale claim patterns", () => {
  it.each([
    "cut bundle by 55%",
    "about ~55 percent",
    "saved 14 kB",
    "saved 14kB",
    "−14 kB gzip",
    "-14 kB gzip",
    "Formik + Redux Toolkit → React Hook Form",
    "I replaced Formik with RHF",
    "12–13s load"
  ])("flags %j", (text) => {
    expect(findStale(text)).not.toEqual([]);
  });

  it.each(["CLS ≤ 0.1", "−20%", "~1.5 mo", "2 → 1", "width: 55.5rem", "0.14s", 'class="h-14 mt-14"', "2024-06-14"])(
    "allows %j",
    (text) => {
      expect(findStale(text)).toEqual([]);
    }
  );

  it("passes on the current content and message catalogs", () => {
    const files = [
      ...readdirSync("content/work").map((f) => path.join("content/work", f)),
      "src/shared/i18n/messages/en.json",
      "src/shared/i18n/messages/vi.json"
    ];
    for (const file of files) {
      expect([file, findStale(readFileSync(file, "utf8"))]).toEqual([file, []]);
    }
  });
});
