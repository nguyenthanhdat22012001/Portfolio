import type { ComponentProps, ComponentType } from "react";
import * as runtime from "react/jsx-runtime";
import { Link } from "@/shared/i18n/navigation";
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
  p: (props: ComponentProps<"p">) => (
    <p className="mt-4 leading-relaxed" {...props} />
  ),
  ul: (props: ComponentProps<"ul">) => (
    <ul className="mt-4 list-disc space-y-2 pl-6" {...props} />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6" {...props} />
  ),
  strong: (props: ComponentProps<"strong">) => (
    <strong className="font-semibold text-fg" {...props} />
  ),
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      className="mt-6 border-l-2 border-accent pl-4 text-fg-muted"
      {...props}
    />
  ),
  code: (props: ComponentProps<"code">) => (
    <code
      className="rounded bg-bg-elevated px-1.5 py-0.5 font-mono text-[0.9em]"
      {...props}
    />
  ),
  pre: (props: ComponentProps<"pre">) => (
    <pre
      className="mt-6 overflow-x-auto rounded-card border border-border bg-bg-elevated p-4 font-mono text-sm [&_code]:bg-transparent [&_code]:p-0"
      {...props}
    />
  ),
  table: (props: ComponentProps<"table">) => (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: ComponentProps<"th">) => (
    <th
      className="border border-border bg-bg-elevated px-3 py-2 text-left font-mono"
      {...props}
    />
  ),
  td: (props: ComponentProps<"td">) => (
    <td className="border border-border px-3 py-2 align-top" {...props} />
  ),
  hr: () => <hr className="my-10 border-border" />
};

// Velite compiles MDX to a function body that expects the JSX runtime as its
// first argument. Content is authored in this repo, so evaluating it is safe.
function getMdxComponent(code: string) {
  const factory = new Function(code) as (
    scope: typeof runtime
  ) => { default: ComponentType<{ components?: object }> };
  return factory({ ...runtime }).default;
}

export function MdxContent({ code }: { code: string }) {
  const Content = getMdxComponent(code);
  return <Content components={components} />;
}
