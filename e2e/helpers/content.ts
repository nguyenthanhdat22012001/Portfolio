import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const WORK_SLUGS = [
  "swift-performance",
  "oneloyalty-layered-architecture",
  "safebulk-bulk-editor"
] as const;

// e2e runs a production build, where `draft: true` hides a translation.
// Deriving expectations from the files means removing `draft` needs no
// test change.
export function viPublished(slug: string): boolean {
  const file = path.join(process.cwd(), "content/work", `${slug}.vi.mdx`);
  if (!existsSync(file)) return false;
  return !/^draft:\s*true\s*$/m.test(readFileSync(file, "utf8"));
}
