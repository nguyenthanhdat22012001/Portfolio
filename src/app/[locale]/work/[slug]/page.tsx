import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale
} from "next-intl/server";
import { getWorkBySlug, getWorkParams } from "@/shared/content";
import { isValidLocale, routing } from "@/shared/i18n/routing";
import { MdxContent } from "@/shared/mdx/MdxContent";
import { buildMetadata } from "@/shared/seo/build-metadata";
import { ArticleLayout } from "@/shared/ui/ArticleLayout";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return getWorkParams();
}

// Unknown slugs 404 at the routing layer instead of rendering on demand.
export const dynamicParams = false;

export async function generateMetadata({
  params
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = isValidLocale(locale) ? getWorkBySlug(slug, locale) : null;
  if (!entry) return {};

  return buildMetadata({
    title: entry.doc.title,
    description: entry.doc.summary,
    path: `/work/${slug}`,
    locale
  });
}

export default async function WorkCaseStudyPage({
  params
}: {
  params: Params;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  setRequestLocale(locale);

  const entry = getWorkBySlug(slug, locale);
  if (!entry) notFound();

  const t = await getTranslations("caseStudy");
  const format = await getFormatter();
  const { doc, isFallback } = entry;

  return (
    <ArticleLayout
      backHref={{ pathname: "/", hash: "work" }}
      backLabel={t("back")}
      title={doc.title}
      summary={doc.summary}
      meta={t("started", {
        date: format.dateTime(new Date(doc.dateCreated), {
          year: "numeric",
          month: "long"
        })
      })}
      tags={doc.tags}
      notice={isFallback ? t("fallbackNotice") : undefined}
      contentLang={isFallback ? routing.defaultLocale : undefined}
    >
      <MdxContent code={doc.content} />
    </ArticleLayout>
  );
}
