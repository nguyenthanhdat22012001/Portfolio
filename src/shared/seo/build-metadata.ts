import type { Metadata } from "next";

interface BuildMetadataInput {
  title: string;
  description: string;
  path: string;
  locale: string;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function buildMetadata({
  title,
  description,
  path,
  locale
}: BuildMetadataInput): Metadata {
  const url = `${siteUrl}/${locale}${path}`;

  return {
    title,
    description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title,
      description,
      url,
      locale
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    }
  };
}
