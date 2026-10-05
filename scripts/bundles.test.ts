import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { beforeAll, describe, expect, it } from "vitest";
import { INITIAL_BUDGET_BYTES, initialScripts, measurePage } from "./bundles.mjs";

const html = [
  '<script src="/_next/static/chunks/polyfills-1.js" noModule=""></script>',
  '<script src="/_next/static/chunks/webpack-2.js" id="_R_" async=""></script>',
  '<script src="/_next/static/chunks/app/%5Blocale%5D/page-3.js" async=""></script>',
  '<script src="/_next/static/chunks/webpack-2.js" async=""></script>',
  '<link rel="preload" as="script" href="/_next/static/chunks/lazy-4.js"/>',
  '<script>self.__next_f.push([1,""])</script>'
].join("");

describe("initialScripts", () => {
  it("lists module scripts once, decoded, without noModule polyfills or preloads", () => {
    expect(initialScripts(html)).toEqual([
      "chunks/webpack-2.js",
      "chunks/app/[locale]/page-3.js"
    ]);
  });
});

describe("measurePage", () => {
  let dir: string;
  const webpack = "console.log('runtime');".repeat(50);
  const page = "export const WebGLRenderer = 1;";

  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "bundles-"));
    mkdirSync(path.join(dir, "chunks/app/[locale]"), { recursive: true });
    writeFileSync(path.join(dir, "chunks/webpack-2.js"), webpack);
    writeFileSync(path.join(dir, "chunks/app/[locale]/page-3.js"), page);
  });

  it("sums gzip sizes of the initial scripts", () => {
    const result = measurePage(html, dir);
    expect(result.gzipBytes).toBe(
      gzipSync(webpack).length + gzipSync(page).length
    );
    expect(result.files).toHaveLength(2);
  });

  it("names initial files that contain three.js", () => {
    expect(measurePage(html, dir).threeFiles).toEqual([
      "chunks/app/[locale]/page-3.js"
    ]);
  });

  it("budgets 150 KB", () => {
    expect(INITIAL_BUDGET_BYTES).toBe(150 * 1024);
  });
});
