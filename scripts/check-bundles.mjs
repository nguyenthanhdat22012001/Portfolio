// Fails when a home page's initial JS exceeds 150 KB gzip or pulls in
// three.js. Runs in CI right after `pnpm build`.
import { readFileSync } from "node:fs";
import { INITIAL_BUDGET_BYTES, measurePage } from "./bundles.mjs";

const PAGES = ["en", "vi"];
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const problems = [];

for (const page of PAGES) {
  const file = `.next/server/app/${page}.html`;
  let html;
  try {
    html = readFileSync(file, "utf8");
  } catch {
    console.error(`Cannot read ${file}; run \`pnpm build\` first.`);
    process.exit(1);
  }
  const { files, gzipBytes, threeFiles } = measurePage(html, ".next/static");
  console.log(`/${page}: ${kb(gzipBytes)} gzip initial JS in ${files.length} files`);
  if (files.length === 0) {
    problems.push(`/${page}: no initial scripts found; did the HTML format change?`);
  }
  if (gzipBytes > INITIAL_BUDGET_BYTES) {
    problems.push(`/${page}: ${kb(gzipBytes)} > ${kb(INITIAL_BUDGET_BYTES)}`);
  }
  for (const three of threeFiles) {
    problems.push(`/${page}: initial chunk ${three} contains three.js`);
  }
}

if (problems.length > 0) {
  console.error(`Bundle budget failed:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log("Initial JS within budget; no three.js in initial chunks.");
