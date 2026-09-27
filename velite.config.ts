import { defineCollection, defineConfig, s } from "velite";

const work = defineCollection({
  name: "Work",
  pattern: "work/**/*.mdx",
  schema: s.object({
    slug: s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: s.string(),
    summary: s.string(),
    locale: s.enum(["en", "vi"]),
    tags: s.array(s.string()),
    dateCreated: s.isodate(),
    content: s.mdx()
  })
});

const blog = defineCollection({
  name: "Blog",
  pattern: "blog/**/*.mdx",
  schema: s.object({
    slug: s.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: s.string(),
    summary: s.string(),
    locale: s.enum(["en", "vi"]),
    tags: s.array(s.string()),
    datePublished: s.isodate(),
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
