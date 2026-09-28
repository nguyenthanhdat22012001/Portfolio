// The anti-flash rule: effects only give a hidden/displaced starting state
// to elements the visitor has not seen yet.
export function isAtOrAboveViewport(el: Element): boolean {
  return el.getBoundingClientRect().top < window.innerHeight;
}
