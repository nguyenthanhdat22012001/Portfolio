import { blog, work as allWork, type Blog, type Work } from "#site/content";
import type { Locale } from "@/shared/i18n/routing";
import { site } from "@/shared/lib/site";
import {
  assertDefaultLocale,
  assertUnique,
  availableLocales,
  findForLocale,
  localeParams,
  newestFirst,
  selectForLocale,
  withoutDrafts,
  type Localized
} from "./localize";

const work = withoutDrafts(allWork, process.env.NODE_ENV !== "production");

// Fails the build loudly instead of silently shadowing a translation. Runs on
// the filtered list, so an English draft fails the production build.
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

export function getWorkLocales(slug: string): Locale[] {
  return availableLocales(work, slug);
}

export function getPostLocales(slug: string): Locale[] {
  return availableLocales(blog, slug);
}

export function hasPosts(): boolean {
  return blog.length > 0;
}

// The blog shows (nav link, routes, sitemap) only when switched on AND a
// post exists, so the site never shows an empty Blog page.
export function isBlogEnabled(): boolean {
  return site.features.blog && hasPosts();
}

// Every real document in every locale — the sitemap's source.
export function getAllWork(): readonly Work[] {
  return work;
}

export function getAllPosts(): readonly Blog[] {
  return blog;
}
