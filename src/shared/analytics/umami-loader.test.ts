import { afterEach, describe, expect, it, vi } from "vitest";
import { UMAMI_SCRIPT_SRC } from "./config";
import { umamiLoaderScript } from "./umami-loader";

const config = { websiteId: "abc-123", domains: "example.com" };
const EVENTS = [
  "scroll",
  "pointermove",
  "pointerdown",
  "keydown",
  "touchstart",
  "click"
];

function umamiScripts() {
  return document.querySelectorAll(`script[src="${UMAMI_SCRIPT_SRC}"]`);
}

describe("umamiLoaderScript", () => {
  afterEach(() => {
    // Fire any leftover listener so none leaks into the next test.
    for (const type of EVENTS) window.dispatchEvent(new Event(type));
    document.body.innerHTML = "";
    delete window.umami;
    delete window.__umamiQueue;
  });

  it("adds nothing before an input, then one script on the first", () => {
    new Function(umamiLoaderScript(config))();
    expect(umamiScripts()).toHaveLength(0);
    window.dispatchEvent(new Event("scroll"));
    const scripts = umamiScripts();
    expect(scripts).toHaveLength(1);
    const script = scripts[0] as HTMLScriptElement;
    expect(script.defer).toBe(true);
    expect(script.getAttribute("data-website-id")).toBe("abc-123");
    expect(script.getAttribute("data-domains")).toBe("example.com");
    expect(script.getAttribute("data-do-not-track")).toBe("true");
    // In-page anchors pushState their hash; Umami must not count them.
    expect(script.getAttribute("data-exclude-hash")).toBe("true");
    window.dispatchEvent(new Event("keydown"));
    expect(umamiScripts()).toHaveLength(1);
  });

  it.each(EVENTS)("loads on a first %s", (type) => {
    new Function(umamiLoaderScript(config))();
    expect(umamiScripts()).toHaveLength(0);
    window.dispatchEvent(new Event(type));
    expect(umamiScripts()).toHaveLength(1);
  });

  it("flushes the queued clicks on load and empties the queue", () => {
    new Function(umamiLoaderScript(config))();
    window.dispatchEvent(new Event("pointermove"));
    const track = vi.fn();
    window.umami = { track };
    window.__umamiQueue = [
      ["cv_download", { location: "hero" }],
      ["cta_view_work", undefined]
    ];
    umamiScripts()[0]!.dispatchEvent(new Event("load"));
    expect(track).toHaveBeenCalledWith("cv_download", { location: "hero" });
    expect(track).toHaveBeenCalledWith("cta_view_work");
    expect(track.mock.calls[1]).toHaveLength(1);
    expect(window.__umamiQueue).toEqual([]);
  });
});
