import type { DesktopHandler } from "../types";

// Mouse clicks on same-page #hash links scroll through Lenis so the motion
// matches wheel scrolling. Keyboard activation (detail === 0) is left to the
// browser so focus moves to the target. Runs in the capture phase so it
// handles the click before Next's <Link>.
export const startHashLinks: DesktopHandler = ({ lenis }) => {
  const onClick = (event: MouseEvent) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.detail === 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    const link =
      event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!(link instanceof HTMLAnchorElement)) return;

    const url = new URL(link.href);
    if (
      url.origin !== location.origin ||
      url.pathname !== location.pathname ||
      !url.hash
    ) {
      return;
    }
    const target = document.getElementById(
      decodeURIComponent(url.hash.slice(1))
    );
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    lenis.scrollTo(target, { offset: -margin });
    history.pushState(null, "", url.hash);
  };

  window.addEventListener("click", onClick, { capture: true });
  return () => window.removeEventListener("click", onClick, { capture: true });
};
