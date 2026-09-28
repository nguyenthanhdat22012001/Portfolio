import { ViewTransition, type ReactNode } from "react";

const directional = {
  "nav-forward": "nav-forward",
  "nav-back": "nav-back",
  default: "none"
};

// Slides pages left/right only for navigations tagged with a transition type
// (see WorkChapter and ArticleLayout links). Goes in page.tsx, not a layout:
// layouts persist, so enter/exit would never fire there.
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={directional} exit={directional} default="none">
      {children}
    </ViewTransition>
  );
}
