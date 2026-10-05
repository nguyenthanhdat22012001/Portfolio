import { ViewTransition, type ComponentProps, type ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { Container } from "./Container";
import { ExternalLinks, type ExternalLink } from "./ExternalLinks";
import { TagList } from "./TagList";

export function ArticleLayout({
  backHref,
  backLabel,
  title,
  summary,
  meta,
  tags,
  byline,
  links,
  newTabLabel,
  notice,
  contentLang,
  uiLang,
  titleTransitionName,
  children
}: {
  backHref: ComponentProps<typeof Link>["href"];
  backLabel: string;
  title: string;
  summary: string;
  meta: string;
  tags: readonly string[];
  byline?: string;
  links?: readonly ExternalLink[];
  newTabLabel?: string;
  notice?: string;
  contentLang?: string;
  uiLang?: string;
  titleTransitionName?: string;
  children: ReactNode;
}) {
  return (
    <Container size="narrow" className="py-12 sm:py-16">
      {/* No prefetch on sight (hover still prefetches): the back link is in
          view on load, and prefetching Home's page chunk pushes Lighthouse's
          script size over budget. */}
      <Link
        href={backHref}
        prefetch={false}
        transitionTypes={["nav-back"]}
        className="text-accent font-mono text-sm hover:underline"
      >
        ← {backLabel}
      </Link>
      {notice ? (
        <p
          role="note"
          data-testid="fallback-notice"
          className="rounded-card border-border bg-bg-elevated text-fg-muted mt-6 border p-4 text-sm"
        >
          {notice}
        </p>
      ) : null}
      <article lang={contentLang} className="mt-8">
        <header>
          {titleTransitionName ? (
            <ViewTransition
              name={titleTransitionName}
              share="morph"
              default="none"
            >
              <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
            </ViewTransition>
          ) : (
            <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          )}
          <p className="text-fg-muted mt-4 text-lg">{summary}</p>
          {byline ? (
            <p data-testid="article-byline" className="mt-4 text-sm">
              {byline}
            </p>
          ) : null}
          <p lang={uiLang} className="text-fg-muted mt-4 font-mono text-sm">
            {meta}
          </p>
          <TagList tags={tags} className="mt-4" />
          {links && newTabLabel ? (
            <ExternalLinks
              links={links}
              newTabLabel={newTabLabel}
              lang={uiLang}
              className="mt-6 font-mono text-sm font-medium"
            />
          ) : null}
        </header>
        <div className="mt-10">{children}</div>
      </article>
    </Container>
  );
}
