import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFormatter,
  getTranslations,
  setRequestLocale
} from "next-intl/server";
import { getPosts } from "@/shared/content";
import { Link } from "@/shared/i18n/navigation";
import { isValidLocale } from "@/shared/i18n/routing";
import { buildMetadata } from "@/shared/seo/build-metadata";
import { Container } from "@/shared/ui/Container";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({
  params
}: {
  params: Params;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
    path: "/blog",
    locale
  });
}

export default async function BlogIndexPage({ params }: { params: Params }) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("blog");
  const format = await getFormatter();
  const posts = getPosts(locale);

  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <h1 className="text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <p className="text-fg-muted mt-4 text-lg">{t("description")}</p>
      {posts.length === 0 ? (
        <p className="rounded-card border-border bg-bg-elevated text-fg-muted mt-10 border p-6">
          {t("empty")}
        </p>
      ) : (
        <ul className="mt-10 space-y-8">
          {posts.map(({ doc }) => (
            <li key={doc.slug}>
              <article>
                <h2 className="text-xl font-semibold">
                  <Link
                    href={`/blog/${doc.slug}`}
                    className="hover:text-accent"
                  >
                    {doc.title}
                  </Link>
                </h2>
                <p className="text-fg-muted mt-1 font-mono text-sm">
                  {format.dateTime(new Date(doc.datePublished), {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </p>
                <p className="text-fg-muted mt-2">{doc.summary}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
