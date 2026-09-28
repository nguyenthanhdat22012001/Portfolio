import { routing, type Locale } from "@/shared/i18n/routing";
import { site } from "@/shared/lib/site";
import { getSiteUrl } from "../site-url";
import { schemaContext } from "./schema";

export interface WebSite {
  "@context": typeof schemaContext;
  "@type": "WebSite";
  "@id": string;
  name: string;
  url: string;
  inLanguage: Locale[];
}

export function buildWebSite(): WebSite {
  return {
    "@context": schemaContext,
    "@type": "WebSite",
    "@id": `${getSiteUrl()}/#website`,
    name: site.name,
    url: getSiteUrl(),
    inLanguage: [...routing.locales]
  };
}
