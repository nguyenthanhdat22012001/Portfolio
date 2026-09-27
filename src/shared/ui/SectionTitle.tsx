import type { ReactNode } from "react";

export function SectionTitle({
  id,
  children
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <h2 id={id} className="text-2xl font-semibold sm:text-3xl">
      {children}
    </h2>
  );
}
