// Initial-JS budget from the build output (Phase 6 §6.4.2). Recent Next
// versions no longer print First Load JS, so this reads the prerendered HTML
// and gzips the scripts it names. Lazy chunks are budgeted by the e2e specs
// that load them (hero-3d, about-avatar, motion).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

export const INITIAL_BUDGET_BYTES = 150 * 1024;

const SCRIPT_TAG = /<script\b[^>]*>/g;
const SRC = /\bsrc="\/_next\/static\/([^"]+\.js)"/;

// Script files the document loads on its own, relative to .next/static.
// noModule polyfills are skipped: modern browsers never fetch them.
export function initialScripts(html) {
  const files = [...html.matchAll(SCRIPT_TAG)].flatMap(([tag]) => {
    if (/\bnomodule\b/i.test(tag)) return [];
    const src = SRC.exec(tag)?.[1];
    return src ? [decodeURIComponent(src)] : [];
  });
  return [...new Set(files)];
}

export function measurePage(html, staticDir) {
  const files = initialScripts(html);
  let gzipBytes = 0;
  const threeFiles = [];
  for (const file of files) {
    const body = readFileSync(join(staticDir, file));
    gzipBytes += gzipSync(body).length;
    if (body.includes("WebGLRenderer")) threeFiles.push(file);
  }
  return { files, gzipBytes, threeFiles };
}
