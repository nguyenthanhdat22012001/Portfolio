import type { AnalyticsEvent, EventArgs } from "./events";

declare global {
  interface Window {
    __umamiQueue?: [string, Record<string, string> | undefined][];
    umami?: { track(name: string, data?: Record<string, string>): unknown };
  }
}

// For events with no DOM element to mark (the canvas avatar). Its own file
// so the about-avatar chunk shares no module with the initial bundle.
export function track<N extends AnalyticsEvent>(
  name: N,
  ...args: EventArgs<N>
): void {
  try {
    const props = args[0] as Record<string, string> | undefined;
    if (props) window.umami?.track(name, props);
    else window.umami?.track(name);
  } catch {
    // Analytics must never break the page.
  }
}
