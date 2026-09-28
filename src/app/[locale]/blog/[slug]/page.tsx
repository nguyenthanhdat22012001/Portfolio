import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale
} from "next-intl/server";
import { getPostBySlug, getPostLocales, getPostParams } from "@/shared/content";
import { isValidLocale, routing } from "@/shared/i18n/routing";
import { MdxContent } from "@/shared/mdx/MdxContent";
import { buildMetadata } from "@/shared/seo/build-metadata";
import { buildBlogPosting } from "@/shared/seo/json-ld/blog-posting";
import { buildBreadcrumbs } from "@/shared/seo/json-ld/breadcrumbs";
import { JsonLd } from "@/shared/seo/JsonLd";
import { absoluteUrl } from "@/shared/seo/urls";
import { ArticleLayout } from "@/shared/ui/ArticleLayout";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return getPostParams();
}

export async function generateMetadata({
  params
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) return {};
  const entry = getPostBySlug(slug, locale);
  if (!entry) return {};

  return buildMetadata({
    title: entry.doc.title,
    description: entry.doc.description,
    path: `/blog/${slug}`,
    locale,
    availableLocales: getPostLocales(slug),
    type: "article"
  });
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  setRequestLocale(locale);

  const entry = getPostBySlug(slug, locale);
  if (!entry) notFound();

  const t = await getTranslations("blog");
  const tCaseStudy = await getTranslations("caseStudy");
  const format = await getFormatter();
  const { doc, isFallback } = entry;
  const tSeo = await getTranslations("seo");
  const path = `/blog/${slug}`;

  return (
    <>
      <JsonLd
        data={[
          buildBlogPosting({
            slug,
            locale,
            availableLocales: getPostLocales(slug),
            title: doc.title,
            description: doc.description,
            datePublished: doc.datePublished,
            dateModified: doc.dateModified,
            contentLocale: doc.locale
          }),
          buildBreadcrumbs([
            { name: tSeo("breadcrumbHome"), url: absoluteUrl(locale, "/") },
            { name: tSeo("breadcrumbBlog"), url: absoluteUrl(locale, "/blog") },
            { name: doc.title, url: absoluteUrl(locale, path) }
          ])
        ]}
      />
      <ArticleLayout
        backHref="/blog"
        backLabel={t("back")}
        title={doc.title}
        summary={doc.summary}
        meta={format.dateTime(new Date(doc.datePublished), {
          year: "numeric",
          month: "long",
          day: "numeric"
        })}
        tags={doc.tags}
        notice={isFallback ? tCaseStudy("fallbackNotice") : undefined}
        contentLang={isFallback ? routing.defaultLocale : undefined}
      >
        <MdxContent code={doc.content} />
      </ArticleLayout>
    </>
  );
}
