import { site } from "@/shared/lib/site";
import { getSiteUrl } from "../site-url";

export interface PersonRef {
  "@type": "Person";
  "@id": string;
  name: string;
  url: string;
}

export interface Person extends PersonRef {
  alternateName: string;
  jobTitle: string;
  url: string;
  sameAs: string[];
  address: {
    "@type": "PostalAddress";
    addressLocality: string;
    addressCountry: string;
  };
  knowsAbout: string[];
}

// Shares the home page's @id, but carries name and url too: Google does not
// resolve an @id defined on another page, and Article authors need a name.
export function personRef(): PersonRef {
  return {
    "@type": "Person",
    "@id": `${getSiteUrl()}/#person`,
    name: site.name,
    url: getSiteUrl()
  };
}

export function buildPerson(jobTitle: string): Person {
  return {
    ...personRef(),
    alternateName: site.alternateName,
    jobTitle,
    sameAs: [site.linkedin, site.github],
    address: {
      "@type": "PostalAddress",
      addressLocality: site.address.locality,
      addressCountry: site.address.country
    },
    knowsAbout: [...site.knowsAbout]
  };
}
