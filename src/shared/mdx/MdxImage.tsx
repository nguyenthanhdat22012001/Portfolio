import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";

// MDX `<Image>`: keeps the author's width/height (no CLS) and lazy-loads.
// A file not yet exported renders nothing instead of failing the build.
export function MdxImage({
  src,
  alt,
  width,
  height
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
}) {
  if (!existsSync(path.join(process.cwd(), "public", src))) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`MDX Image: public${src} does not exist; rendering nothing.`);
    }
    return null;
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      sizes="(min-width: 768px) 720px, 100vw"
      className="rounded-card border-border mt-6 h-auto w-full border"
    />
  );
}
