const EVENTS = ["scroll", "pointermove", "keydown", "touchstart"] as const;

// No idle trigger on purpose: Lighthouse keeps tracing after load, so an
// idle-time import would count the motion chunk as initial JS.
export function onFirstInteraction(
  callback: () => void,
  target: Window = window
): () => void {
  const stop = () => {
    for (const type of EVENTS) target.removeEventListener(type, fire);
  };
  function fire() {
    stop();
    callback();
  }
  for (const type of EVENTS) {
    target.addEventListener(type, fire, { passive: true });
  }
  return stop;
}
