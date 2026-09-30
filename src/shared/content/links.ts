// External links a case study can carry, in display order: the store
// listing first, then the live app, source, and demo.
export const linkKeys = ["appStore", "live", "github", "demo"] as const;

export type LinkKey = (typeof linkKeys)[number];
export type WorkLinks = Partial<Record<LinkKey, string>>;

export function pickLinks(
  links: WorkLinks,
  keys: readonly LinkKey[] = linkKeys
): { key: LinkKey; href: string }[] {
  return keys.flatMap((key) => {
    const href = links[key];
    return href ? [{ key, href }] : [];
  });
}
