import { cx } from "@/shared/lib/cx";
import { Glyph } from "./Glyph";

export interface ExternalLink {
  href: string;
  label: string;
}

export function ExternalLinks({
  links,
  newTabLabel,
  className,
  lang
}: {
  links: readonly ExternalLink[];
  newTabLabel: string;
  className?: string;
  lang?: string;
}) {
  if (links.length === 0) return null;

  return (
    <ul lang={lang} className={cx("flex flex-wrap gap-x-6 gap-y-2", className)}>
      {links.map(({ href, label }) => (
        <li key={href}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-fg-muted hover:text-fg"
          >
            {label}
            <span aria-hidden="true">&nbsp;</span>
            <Glyph name="arrow-up-right" />
            <span className="sr-only"> {newTabLabel}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
