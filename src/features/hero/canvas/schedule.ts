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
