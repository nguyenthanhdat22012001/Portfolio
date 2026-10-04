// Fails when a CV v1 claim reappears in the built site, the content, or the
// message catalogs. Runs in CI right after `pnpm build`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { BANNED } from "./stale-claims.mjs";

const BUILD_ROOT = ".next/server/app";
const ROOTS = [BUILD_ROOT, "content", "src/shared/i18n/messages"];

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const hits = [];
for (const root of ROOTS) {
  let files = [];
  try {
    files = walk(root);
  } catch {
    if (root === BUILD_ROOT) {
      console.error(`Cannot read ${root}; run \`pnpm build\` first.`);
      process.exit(1);
    }
    continue;
  }
  for (const file of files.filter((f) => /\.(html|mdx|json|rsc)$/.test(f))) {
    const text = readFileSync(file, "utf8");
    for (const pattern of BANNED) {
      const match = pattern.exec(text);
      if (match) hits.push(`${file}: ${pattern} matched "${match[0]}"`);
    }
  }
}

if (hits.length > 0) {
  console.error(`Stale CV v1 claims found:\n${hits.join("\n")}`);
  process.exit(1);
}
console.log("No stale CV v1 claims.");
