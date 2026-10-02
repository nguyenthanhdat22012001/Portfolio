const IDLE_TIMEOUT_MS = 2000;
const NO_IDLE_DELAY_MS = 1500;

// Runs callback once the page has loaded and the main thread is idle.
export function afterLoadIdle(
  callback: () => void,
  win: Window = window
): () => void {
  let done = false;
  let idleId: number | undefined;
  let timeoutId: number | undefined;

  const run = () => {
    if (done) return;
    done = true;
    callback();
  };
  const scheduleIdle = () => {
    if (done) return;
    if (typeof win.requestIdleCallback === "function") {
      idleId = win.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
    } else {
      timeoutId = win.setTimeout(run, NO_IDLE_DELAY_MS);
    }
  };

  if (win.document.readyState === "complete") scheduleIdle();
  else win.addEventListener("load", scheduleIdle, { once: true });

  return () => {
    done = true;
    win.removeEventListener("load", scheduleIdle);
    if (idleId !== undefined) win.cancelIdleCallback(idleId);
    if (timeoutId !== undefined) win.clearTimeout(timeoutId);
  };
}

const INPUT_EVENTS = [
  "scroll",
  "wheel",
  "touchstart",
  "keydown",
  "pointerdown",
  "pointermove"
] as const;

/** "idle", or the type of the input event that came first. */
export type IdleOrInputCause = "idle" | (typeof INPUT_EVENTS)[number];

// afterLoadIdle, or sooner if the visitor scrolls or interacts first: work
// kept off the hydration path that must still be in place before a scroll
// reaches it. The cause says which event came first.
export function afterLoadIdleOrInput(
  callback: (cause: IdleOrInputCause) => void,
  win: Window = window
): () => void {
  let done = false;
  const stopListening = () => {
    for (const type of INPUT_EVENTS) win.removeEventListener(type, onInput);
  };
  const run = (cause: IdleOrInputCause) => {
    if (done) return;
    done = true;
    cancelIdle();
    stopListening();
    callback(cause);
  };
  function onInput(event: Event) {
    run(event.type as IdleOrInputCause);
  }
  for (const type of INPUT_EVENTS) {
    win.addEventListener(type, onInput, { passive: true });
  }
  const cancelIdle = afterLoadIdle(() => run("idle"), win);

  return () => {
    done = true;
    cancelIdle();
    stopListening();
  };
}
