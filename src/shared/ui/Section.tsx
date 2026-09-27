import type { ReactNode } from "react";
import { cx } from "@/shared/lib/cx";
import { Container } from "./Container";

export function Section({
  id,
  titleId,
  className,
  children
}: {
  id: string;
  titleId: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cx("border-border py-section border-b", className)}
    >
      <Container>{children}</Container>
    </section>
  );
}
