import type { ReactNode } from "react";
import { Link } from "@/shared/i18n/navigation";
import { TagList } from "@/shared/ui/TagList";

export function WorkChapter({
  index,
  slug,
  title,
  summary,
  tags,
  metric,
  readLabel,
  visual
}: {
  index: number;
  slug: string;
  title: string;
  summary: string;
  tags: readonly string[];
  metric: string;
  readLabel: string;
  visual: ReactNode;
}) {
  const titleId = `work-${slug}-title`;

  return (
    <article
      aria-labelledby={titleId}
      data-chapter={slug}
      className="grid gap-8 border-t border-border py-12 first:border-t-0 md:grid-cols-2 md:gap-12"
    >
      <div>
        <p className="font-mono text-sm text-accent">
          {String(index).padStart(2, "0")}
        </p>
        <h3 id={titleId} className="mt-2 text-xl font-semibold sm:text-2xl">
          {title}
        </h3>
        <p className="mt-4 font-mono text-lg text-accent">{metric}</p>
        <p className="mt-4 leading-relaxed text-fg-muted">{summary}</p>
        <TagList tags={tags} className="mt-4" />
        <Link
          href={`/work/${slug}`}
          className="mt-6 inline-flex font-mono text-sm font-semibold text-accent underline underline-offset-4"
        >
          {readLabel}
          <span className="sr-only">: {title}</span>
          <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
      <div>{visual}</div>
    </article>
  );
}
