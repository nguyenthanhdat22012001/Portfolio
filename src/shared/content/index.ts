import { blog, work, type Blog, type Work } from "#site/content";
import type { Locale } from "@/shared/i18n/routing";
import {
  assertDefaultLocale,
  assertUnique,
  findForLocale,
  localeParams,
  newestFirst,
  selectForLocale,
  type Localized
} from "./localize";

// Fails the build loudly instead of silently shadowing a translation.
assertUnique("work", work);
assertUnique("blog", blog);
assertDefaultLocale("work", work);
assertDefaultLocale("blog", blog);

export type { Blog, Localized, Work };

export function getWork(locale: Locale): Localized<Work>[] {
  return selectForLocale(work, locale);
}

export function getWorkBySlug(
  slug: string,
  locale: Locale
): Localized<Work> | null {
  return findForLocale(work, slug, locale);
}

export function getWorkParams() {
  return localeParams(work);
}

export function getPosts(locale: Locale): Localized<Blog>[] {
  return newestFirst(
    selectForLocale(blog, locale),
    (post) => post.datePublished
  );
}

export function getPostBySlug(
  slug: string,
  locale: Locale
): Localized<Blog> | null {
  return findForLocale(blog, slug, locale);
}

export function getPostParams() {
  return localeParams(blog);
}
