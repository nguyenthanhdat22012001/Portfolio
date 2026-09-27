import { Fragment } from "react";

// Each line is its own block so headings break where the copy says, while the
// text content stays one space-separated phrase for assistive tech and tests.
export function StackedLines({ lines }: { lines: readonly string[] }) {
  return lines.map((line, index) => (
    <Fragment key={line}>
      {index > 0 ? " " : null}
      <span className="block">{line}</span>
    </Fragment>
  ));
}
