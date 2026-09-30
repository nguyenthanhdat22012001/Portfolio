import type { MetadataRoute } from "next";
import { getAllPosts, getAllWork } from "@/shared/content";
import { buildSitemap } from "@/shared/seo/sitemap";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemap({
    work: getAllWork().map((doc) => ({
      slug: doc.slug,
      locale: doc.locale,
      lastModified: doc.dateModified ?? doc.period.start
    })),
    posts: getAllPosts().map((doc) => ({
      slug: doc.slug,
      locale: doc.locale,
      lastModified: doc.dateModified ?? doc.datePublished
    }))
  });
}
