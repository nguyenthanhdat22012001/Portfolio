import type { Locale } from "@/shared/i18n/routing";
import { absoluteUrl } from "../urls";
import { buildPerson, type Person } from "./person";
import { schemaContext } from "./schema";

export interface ProfilePage {
  "@context": typeof schemaContext;
  "@type": "ProfilePage";
  url: string;
  inLanguage: Locale;
  mainEntity: Person;
}

export function buildProfilePage({
  locale,
  jobTitle
}: {
  locale: Locale;
  jobTitle: string;
}): ProfilePage {
  return {
    "@context": schemaContext,
    "@type": "ProfilePage",
    url: absoluteUrl(locale, "/"),
    inLanguage: locale,
    mainEntity: buildPerson(jobTitle)
  };
}
