import { site } from "@/shared/lib/site";
import { getSiteUrl } from "../site-url";

export interface PersonRef {
  "@id": string;
}

export interface Person extends PersonRef {
  "@type": "Person";
  name: string;
  alternateName: string;
  jobTitle: string;
  url: string;
  sameAs: string[];
  knowsAbout: string[];
}

// Other schemas point at the person by @id instead of repeating it.
export function personRef(): PersonRef {
  return { "@id": `${getSiteUrl()}/#person` };
}

export function buildPerson(jobTitle: string): Person {
  return {
    "@type": "Person",
    ...personRef(),
    name: site.name,
    alternateName: site.alternateName,
    jobTitle,
    url: getSiteUrl(),
    sameAs: [site.linkedin, site.github],
    knowsAbout: [...site.knowsAbout]
  };
}
