import type { Page } from "@playwright/test";

// Counts live WebGL contexts (created and not lost). The gates' support
// probes lose theirs at once; R3F force-loses on unmount, so a leaked
// renderer stays live and shows up here.
export async function trackLiveGl(page: Page): Promise<() => Promise<number>> {
  await page.addInitScript(() => {
    const contexts = new Set<WebGLRenderingContext | WebGL2RenderingContext>();
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...rest: unknown[]
    ) {
      const ctx = (original as (...args: unknown[]) => unknown).call(
        this,
        type,
        ...rest
      );
      if (
        ctx &&
        (type === "webgl" || type === "webgl2" || type === "experimental-webgl")
      ) {
        contexts.add(ctx as WebGLRenderingContext);
      }
      return ctx;
    } as typeof original;
    (window as unknown as { __liveGl: () => number }).__liveGl = () =>
      [...contexts].filter((c) => !c.isContextLost()).length;
  });
  return () =>
    page.evaluate(() =>
      (window as unknown as { __liveGl: () => number }).__liveGl()
    );
}
