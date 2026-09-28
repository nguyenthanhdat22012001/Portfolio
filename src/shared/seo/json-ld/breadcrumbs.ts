import { schemaContext } from "./schema";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface BreadcrumbList {
  "@context": typeof schemaContext;
  "@type": "BreadcrumbList";
  itemListElement: {
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }[];
}

export function buildBreadcrumbs(
  items: readonly BreadcrumbItem[]
): BreadcrumbList {
  return {
    "@context": schemaContext,
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}
