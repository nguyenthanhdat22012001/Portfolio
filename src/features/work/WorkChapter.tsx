import type { ReactNode } from "react";
import { motion, type MotionName } from "@/shared/animation/motion";
import { Link } from "@/shared/i18n/navigation";
import { cx } from "@/shared/lib/cx";
import { Eyebrow } from "@/shared/ui/Eyebrow";
import { Stat, type StatEntry } from "@/shared/ui/Stat";
import { TagList } from "@/shared/ui/TagList";

export function WorkChapter({
  slug,
  eyebrow,
  title,
  summary,
  stats,
  tags,
  readLabel,
  links,
  visual,
  reversed,
  motionName
}: {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  stats: readonly StatEntry[];
  tags: readonly string[];
  readLabel: string;
  links: readonly { href: string; label: string }[];
  visual: ReactNode;
  reversed: boolean;
  motionName?: MotionName;
}) {
  const titleId = `work-${slug}-title`;

  // The DOM keeps text before the visual so reading order never changes;
  // only the visual order flips (visual first on mobile and when reversed).
  return (
    <article
      aria-labelledby={titleId}
      data-chapter={slug}
      {...(motionName ? motion(motionName) : {})}
      className="border-border grid gap-8 border-t py-12 first:border-t-0 md:grid-cols-12 md:items-center md:gap-12 md:py-20"
    >
      <div className="flex flex-col gap-5 md:col-span-5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3
          id={titleId}
          className="text-2xl leading-tight font-semibold md:text-[1.75rem]"
        >
          {title}
        </h3>
        <p className="text-fg-muted leading-[1.7]">{summary}</p>
        <dl className="flex flex-wrap gap-8">
          {stats.map((stat) => (
            <Stat key={stat.label} {...stat} />
          ))}
        </dl>
        <TagList tags={tags} />
        <div className="flex flex-wrap gap-6 font-mono text-[0.9375rem] font-medium">
          <Link href={`/work/${slug}`} className="text-accent hover:underline">
            {readLabel}
            <span className="sr-only">: {title}</span>
            <span aria-hidden="true">&nbsp;→</span>
          </Link>
          {links.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg-muted hover:text-fg"
            >
              {label}
              <span aria-hidden="true">&nbsp;↗</span>
            </a>
          ))}
        </div>
      </div>
      <div
        className={cx(
          "order-first md:col-span-7",
          reversed ? "md:order-first" : "md:order-last"
        )}
      >
        {visual}
      </div>
    </article>
  );
}
