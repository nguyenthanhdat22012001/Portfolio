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
      className="border-border grid gap-8 border-t py-12 first:border-t-0 md:grid-cols-2 md:gap-12"
    >
      <div>
        <p className="text-accent font-mono text-sm">
          {String(index).padStart(2, "0")}
        </p>
        <h3 id={titleId} className="mt-2 text-xl font-semibold sm:text-2xl">
          {title}
        </h3>
        <p className="text-accent mt-4 font-mono text-lg">{metric}</p>
        <p className="text-fg-muted mt-4 leading-relaxed">{summary}</p>
        <TagList tags={tags} className="mt-4" />
        <Link
          href={`/work/${slug}`}
          className="text-accent mt-6 inline-flex font-mono text-sm font-semibold underline underline-offset-4"
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
