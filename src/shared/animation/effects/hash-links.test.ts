import { afterEach, describe, expect, it, vi } from "vitest";
import type Lenis from "lenis";
import { startHashLinks } from "./hash-links";

let stop: (() => void) | undefined;

function setup(href: string) {
  document.body.innerHTML = `<a href="${href}">About</a><section id="about"></section>`;
  const lenis = { scrollTo: vi.fn() };
  stop = startHashLinks({
    gsap: {} as never,
    lenis: lenis as unknown as Lenis
  });
  return {
    link: document.querySelector("a") as HTMLAnchorElement,
    target: document.getElementById("about"),
    lenis
  };
}

function click(link: HTMLElement, init: MouseEventInit = {}) {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    detail: 1,
    ...init
  });
  link.dispatchEvent(event);
  return event;
}

// The "other pages" case below lets jsdom attempt a real navigation, which
// logs "Not implemented: navigation" noise. This bubble-phase listener runs
// after the capture-phase handler under test, so it does not change what is
// being tested; it just swallows the resulting navigation attempt.
function suppressNavigation(event: Event) {
  event.preventDefault();
}

afterEach(() => {
  stop?.();
  stop = undefined;
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
});

describe("startHashLinks", () => {
  it("smooth-scrolls same-page hash links clicked with a mouse", () => {
    const { link, target, lenis } = setup("#about");
    const event = click(link);
    expect(event.defaultPrevented).toBe(true);
    expect(lenis.scrollTo).toHaveBeenCalledWith(target, expect.any(Object));
    expect(location.hash).toBe("#about");
  });

  it("leaves keyboard activation to the browser so focus moves", () => {
    const { link, lenis } = setup("#about");
    const event = click(link, { detail: 0 });
    expect(event.defaultPrevented).toBe(false);
    expect(lenis.scrollTo).not.toHaveBeenCalled();
  });

  it("ignores modified clicks", () => {
    const { link, lenis } = setup("#about");
    click(link, { metaKey: true });
    expect(lenis.scrollTo).not.toHaveBeenCalled();
  });

  it("ignores links to other pages", () => {
    document.addEventListener("click", suppressNavigation);
    const { link, lenis } = setup("/elsewhere#about");
    click(link);
    expect(lenis.scrollTo).not.toHaveBeenCalled();
    document.removeEventListener("click", suppressNavigation);
  });

  it("ignores hashes with no matching element", () => {
    const { link, lenis } = setup("#missing");
    click(link);
    expect(lenis.scrollTo).not.toHaveBeenCalled();
  });

  it("does not grow history length when clicking the same hash link twice", () => {
    const { link } = setup("#about");
    click(link);
    expect(location.hash).toBe("#about");
    const lengthAfterFirst = history.length;

    click(link);

    expect(history.length).toBe(lengthAfterFirst);
  });
});
