import type { ComponentProps, ReactNode } from "react";
import * as runtime from "react/jsx-runtime";
import { Link } from "@/shared/i18n/navigation";
import { withGlyphs } from "@/shared/ui/Glyph";
import { linkKind, slugify, textContent } from "./mdx-utils";

const linkClass = "text-accent underline underline-offset-4";

function MdxLink({ href = "", children, ...props }: ComponentProps<"a">) {
  const kind = linkKind(href);
  if (kind === "internal") {
    return (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={linkClass}
      {...(kind === "external"
        ? { target: "_blank", rel: "noopener noreferrer" }
        : {})}
      {...props}
    >
      {children}
    </a>
  );
}

const components = {
  a: MdxLink,
  h2: ({ children }: ComponentProps<"h2">) => (
    <h2
      id={slugify(textContent(children))}
      className="mt-12 scroll-mt-24 text-2xl font-semibold"
    >
      {children}
    </h2>
  ),
  h3: ({ children }: ComponentProps<"h3">) => (
    <h3
      id={slugify(textContent(children))}
      className="mt-8 scroll-mt-24 text-xl font-semibold"
    >
      {children}
    </h3>
  ),
  p: ({ children, ...props }: ComponentProps<"p">) => (
    <p className="mt-4 leading-relaxed" {...props}>
      {withGlyphs(children)}
    </p>
  ),
  ul: (props: ComponentProps<"ul">) => (
    <ul className="mt-4 list-disc space-y-2 pl-6" {...props} />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6" {...props} />
  ),
  li: ({ children, ...props }: ComponentProps<"li">) => (
    <li {...props}>{withGlyphs(children)}</li>
  ),
  strong: ({ children, ...props }: ComponentProps<"strong">) => (
    <strong className="text-fg font-semibold" {...props}>
      {withGlyphs(children)}
    </strong>
  ),
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      className="border-accent text-fg-muted mt-6 border-l-2 pl-4"
      {...props}
    />
  ),
  code: (props: ComponentProps<"code">) => (
    <code
      className="bg-bg-elevated rounded px-1.5 py-0.5 font-mono text-[0.9em]"
      {...props}
    />
  ),
  pre: (props: ComponentProps<"pre">) => (
    <pre
      className="rounded-card border-border bg-bg-elevated mt-6 overflow-x-auto border p-4 font-mono text-sm [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  table: (props: ComponentProps<"table">) => (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: ({ children, ...props }: ComponentProps<"th">) => (
    <th
      className="border-border bg-bg-elevated border px-3 py-2 text-left font-mono"
      {...props}
    >
      {withGlyphs(children)}
    </th>
  ),
  td: ({ children, ...props }: ComponentProps<"td">) => (
    <td className="border-border border px-3 py-2 align-top" {...props}>
      {withGlyphs(children)}
    </td>
  ),
  hr: () => <hr className="border-border my-10" />
};

// Velite compiles MDX to a function body that expects the JSX runtime as its
// first argument. Content is authored in this repo, so evaluating it is safe.
function getMdxComponent(code: string) {
  const factory = new Function(code) as (scope: typeof runtime) => {
    default: (props: { components?: object }) => ReactNode;
  };
  return factory({ ...runtime }).default;
}

// Called directly (not rendered as a JSX tag) because the component is
// compiled fresh from each `code` string: an identifier bound to a
// dynamically-created component would be flagged by
// react-hooks/static-components, which assumes JSX tags stay stable across
// renders. This content has no internal state, so invoking it as a plain
// function produces the same output without that assumption.
export function MdxContent({ code }: { code: string }) {
  return getMdxComponent(code)({ components });
}
