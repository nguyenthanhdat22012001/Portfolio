import { s } from "velite";

const yearMonth = s.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const url = s.string().url().optional();

// Frontmatter of content/work/*.mdx. velite.config.ts adds the compiled
// MDX body; keeping the rest here lets it be unit-tested.
export const workFrontmatter = s.object({
  slug: s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: s.string().max(60),
  summary: s.string(),
  // Meta/OG only; the page keeps rendering `summary`.
  description: s.string().min(140).max(160),
  locale: s.enum(["en", "vi"]),
  role: s.string(),
  team: s.string().optional(),
  company: s.string().optional(),
  period: s.object({ start: yearMonth, end: yearMonth.optional() }),
  stack: s.array(s.string()).min(1),
  // Frontmatter order is intentional: metrics[0] is the headline metric.
  metrics: s
    .array(s.object({ value: s.string(), label: s.string() }))
    .min(1)
    .max(4),
  links: s
    .object({ appStore: url, live: url, github: url, demo: url })
    .strict(),
  dateModified: s.isodate().optional()
});
