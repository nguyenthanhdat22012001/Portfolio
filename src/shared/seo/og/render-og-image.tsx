import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { getSiteUrl } from "../site-url";
import { OgCard } from "./OgCard";
import { ogImageSize } from "./og-image";

const fontPath = path.join(
  process.cwd(),
  "src/shared/seo/og/fonts/OpenSans-Bold.ttf"
);

export async function renderOgImage({
  eyebrow,
  title,
  name,
  metric
}: {
  eyebrow: string;
  title: string;
  name: string;
  metric?: { value: string; label: string };
}): Promise<ImageResponse> {
  const font = await readFile(fontPath);
  const host = new URL(getSiteUrl()).host;

  return new ImageResponse(
    <OgCard
      eyebrow={eyebrow}
      title={title}
      name={name}
      host={host}
      metric={metric}
    />,
    {
      ...ogImageSize,
      fonts: [{ name: "Open Sans", data: font, weight: 700, style: "normal" }]
    }
  );
}
