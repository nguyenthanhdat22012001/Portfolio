// Fails when a CV v1 claim reappears in the built site, the content, or the
// message catalogs. Runs in CI right after `pnpm build`.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = [".next/server/app", "content", "src/shared/i18n/messages"];
const BANNED = [
  // (?<![\d.]) avoids false positives on CSS such as "0.12s"
  /(?<![\d.])1[23](?:[–-]13)?\s?s\b/, // 12s, 13s, 12–13s
  /(?<![\d.])1\.8\s?s\b/,
  /(?<![\d.])1–3\s?s\b/,
  /(?<![\d.])8–9\s?s\b/,
  /\b40\+/,
  /\b12\.6k\b/,
  /\b520\+/,
  /\b8 (languages|ngôn ngữ)\b/i,
  /\b2 teams\b/i,
  /\b5–10 min/i,
  /loom\.com/i
];

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
