import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { trackingScript } from "./tracking-script";

function click(el: Element) {
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event;
}

describe("trackingScript", () => {
  // The listener lives on document, so install it once.
  beforeAll(() => {
    new Function(trackingScript)();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete window.umami;
    delete window.__umamiQueue;
  });

  it("sends a click inside a data-track element with its props", () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    document.body.innerHTML =
      '<a href="#cv" data-track="cv_download" data-track-location="hero"><span>CV</span></a>';
    click(document.querySelector("span")!);
    expect(spy).toHaveBeenCalledWith("cv_download", { location: "hero" });
  });

  it("sends a prop-less event with the name only", () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    document.body.innerHTML =
      '<a href="#work" data-track="cta_view_work">Work</a>';
    click(document.querySelector("a")!);
    expect(spy).toHaveBeenCalledWith("cta_view_work");
    expect(spy.mock.calls[0]).toHaveLength(1);
  });

  it("ignores clicks outside data-track elements", () => {
    const spy = vi.fn();
    window.umami = { track: spy };
    document.body.innerHTML = '<a href="#x">Plain</a>';
    click(document.querySelector("a")!);
    expect(spy).not.toHaveBeenCalled();
  });

  it("never cancels the click", () => {
    window.umami = { track: vi.fn() };
    document.body.innerHTML =
      '<a href="/cv.pdf" download data-track="cv_download" data-track-location="hero">CV</a>';
    expect(click(document.querySelector("a")!).defaultPrevented).toBe(false);
  });

  it("queues the click without Umami and survives a throwing track", () => {
    document.body.innerHTML =
      '<button data-track="email_copy">Copy</button><a href="#c" data-track="cv_download" data-track-location="hero">CV</a>';
    expect(() => click(document.querySelector("button")!)).not.toThrow();
    click(document.querySelector("a")!);
    expect(window.__umamiQueue).toEqual([
      ["email_copy", undefined],
      ["cv_download", { location: "hero" }]
    ]);
    const spy = vi.fn(() => {
      throw new Error("blocked");
    });
    window.umami = { track: spy };
    expect(() => click(document.querySelector("button")!)).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});
