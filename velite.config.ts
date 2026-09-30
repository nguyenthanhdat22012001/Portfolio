import { defineCollection, defineConfig, s } from "velite";
import { workFrontmatter } from "./src/shared/content/work-schema";

const work = defineCollection({
  name: "Work",
  pattern: "work/**/*.mdx",
  schema: workFrontmatter.extend({ content: s.mdx() })
});

const blog = defineCollection({
  name: "Blog",
  pattern: "blog/**/*.mdx",
  schema: s.object({
    slug: s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: s.string().max(60),
    summary: s.string(),
    // Meta/OG only; the page keeps rendering `summary`.
    description: s.string().min(140).max(160),
    locale: s.enum(["en", "vi"]),
    tags: s.array(s.string()),
    datePublished: s.isodate(),
    dateModified: s.isodate().optional(),
    content: s.mdx()
  })
});

export default defineConfig({
  root: "content",
  collections: { work, blog },
  output: {
    data: ".velite",
    assets: "public/static",
    base: "/static/",
    name: "[name]-[hash:6].[ext]",
    clean: true
  }
});
