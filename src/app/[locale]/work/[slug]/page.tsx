import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { pickLinks } from "@/shared/content/links";
import { getWorkBySlug, getWorkLocales, getWorkParams } from "@/shared/content";
import { isValidLocale, routing } from "@/shared/i18n/routing";
import { MdxContent } from "@/shared/mdx/MdxContent";
import { buildMetadata } from "@/shared/seo/build-metadata";
import { buildBreadcrumbs } from "@/shared/seo/json-ld/breadcrumbs";
import { buildCreativeWork } from "@/shared/seo/json-ld/creative-work";
import { JsonLd } from "@/shared/seo/JsonLd";
import { absoluteUrl } from "@/shared/seo/urls";
import { ArticleLayout } from "@/shared/ui/ArticleLayout";
import { PageTransition } from "@/shared/ui/PageTransition";

type Params = Promise<{ locale: string; slug: string }>;

export function generateStaticParams() {
  return getWorkParams();
}

export async function generateMetadata({
  params
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) return {};
  const entry = getWorkBySlug(slug, locale);
  if (!entry) return {};

  return buildMetadata({
    title: entry.doc.title,
    description: entry.doc.description,
    path: `/work/${slug}`,
    locale,
    availableLocales: getWorkLocales(slug),
    type: "article"
  });
}

export default async function WorkCaseStudyPage({
  params
}: {
  params: Params;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  const entry = getWorkBySlug(slug, locale);
  if (!entry) notFound();

  const t = await getTranslations("caseStudy");
  const format = await getFormatter();
  const { doc, isFallback } = entry;
  const tSeo = await getTranslations("seo");
  const tLinks = await getTranslations("links");
  const path = `/work/${slug}`;

  return (
    <>
      <JsonLd
        data={[
          buildCreativeWork({
            slug,
            locale,
            availableLocales: getWorkLocales(slug),
            title: doc.title,
            description: doc.description,
            period: doc.period,
            stack: doc.stack,
            links: doc.links,
            contentLocale: doc.locale
          }),
          buildBreadcrumbs([
            { name: tSeo("breadcrumbHome"), url: absoluteUrl(locale, "/") },
            { name: doc.title, url: absoluteUrl(locale, path) }
          ])
        ]}
      />
      <PageTransition>
        <ArticleLayout
          backHref={{ pathname: "/", hash: "work" }}
          backLabel={t("back")}
          title={doc.title}
          summary={doc.summary}
          meta={t("started", {
            date: format.dateTime(new Date(doc.period.start), {
              year: "numeric",
              month: "long"
            })
          })}
          tags={doc.stack}
          byline={[doc.role, doc.team].filter(Boolean).join(" · ")}
          links={pickLinks(doc.links).map(({ key, href }) => ({
            href,
            label: tLinks(key)
          }))}
          newTabLabel={tLinks("opensInNewTab")}
          notice={isFallback ? t("fallbackNotice") : undefined}
          contentLang={isFallback ? routing.defaultLocale : undefined}
          titleTransitionName={`work-title-${slug}`}
        >
          <MdxContent code={doc.content} />
        </ArticleLayout>
      </PageTransition>
    </>
  );
}
