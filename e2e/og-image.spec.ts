import { expect, test } from "@playwright/test";

const images = [
  "/en/opengraph-image",
  "/vi/opengraph-image",
  "/en/work/swift-performance/opengraph-image",
  "/vi/work/swift-performance/opengraph-image",
  "/en/work/oneloyalty-layered-architecture/opengraph-image",
  "/en/work/safebulk-bulk-editor/opengraph-image"
];

for (const path of images) {
  test(`${path} is a 1200×630 PNG`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    const body = await response.body();
    // PNG IHDR: width at byte 16, height at byte 20 (big-endian).
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });
}

for (const path of [
  "/en/work/does-not-exist/opengraph-image",
  "/en/blog/does-not-exist/opengraph-image"
]) {
  test(`${path} is a 404`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
  });
}
