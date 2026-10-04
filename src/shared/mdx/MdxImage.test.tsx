import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MdxImage } from "./MdxImage";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("MdxImage", () => {
  it("renders a lazy next/image with the MDX size and the article sizes", () => {
    const html = renderToStaticMarkup(
      <MdxImage
        src="/work/swift/progress.webp"
        alt="Swift progress"
        width={1600}
        height={1000}
      />
    );
    expect(html).toContain('alt="Swift progress"');
    expect(html).toContain('width="1600"');
    expect(html).toContain('height="1000"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('sizes="(min-width: 768px) 720px, 100vw"');
  });

  it("renders nothing when the file is missing and warns in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const html = renderToStaticMarkup(
      <MdxImage src="/work/nope.webp" alt="x" width={10} height={10} />
    );
    expect(html).toBe("");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("/work/nope.webp")
    );
  });
});
