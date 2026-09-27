import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { Container } from "./Container";
import { TagList } from "./TagList";

export function ArticleLayout({
  backHref,
  backLabel,
  title,
  summary,
  meta,
  tags,
  notice,
  contentLang,
  children
}: {
  backHref: ComponentProps<typeof Link>["href"];
  backLabel: string;
  title: string;
  summary: string;
  meta: string;
  tags: readonly string[];
  notice?: string;
  contentLang?: string;
  children: ReactNode;
}) {
  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <Link
        href={backHref}
        className="font-mono text-sm text-accent hover:underline"
      >
        ← {backLabel}
      </Link>
      {notice ? (
        <p
          role="note"
          data-testid="fallback-notice"
          className="mt-6 rounded-card border border-border bg-bg-elevated p-4 text-sm text-fg-muted"
        >
          {notice}
        </p>
      ) : null}
      <article lang={contentLang} className="mt-8">
        <header>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-4 text-lg text-fg-muted">{summary}</p>
          <p className="mt-4 font-mono text-sm text-fg-muted">{meta}</p>
          <TagList tags={tags} className="mt-4" />
        </header>
        <div className="mt-10">{children}</div>
      </article>
    </Container>
  );
}
