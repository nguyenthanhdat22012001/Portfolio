/** Mount the canvas and fetch the GLB this far before About (spec §4). */
export const MOUNT_MARGIN = "400px 0px";
/** Equivalent of ScrollTrigger "top 70%": the slot's top crossed 70 % of the viewport. */
export const START_MARGIN = "0px 0px -30% 0px";
/** Counters stop waiting if the intro hasn't started this long after the trigger (spec §6). */
export const GLB_GRACE_MS = 1500;

const HOLD = "data-count-hold";

// The gate (initial bundle) and the about-avatar chunk talk through this
// object, not React state: the canvas reads the flags per frame and calls back
// on events. It owns the attributes CSS and the count effect react to.
export interface AvatarSignals {
  /** The slot crossed the 70 % line (or was already above the viewport). */
  readonly triggered: boolean;
  /** The slot intersects the viewport right now. */
  readonly inView: boolean;
  /** The model is mounted. alreadyPast: the visitor went past About meanwhile. */
  ready(): { alreadyPast: boolean };
  /** First frame of the intro. */
  started(): void;
  /** timings.countersStart reached, or a short start path began. */
  counters(): void;
  /** The 3D avatar is gone (error, context loss, perf Off, drop to Low). */
  lost(): void;
}

export interface GateSignals extends AvatarSignals {
  /** 3D path chosen: About's counters wait for the avatar. */
  hold(): void;
  setTriggered(): void;
  setInView(inView: boolean): void;
  dispose(): void;
}

type Clock = Pick<Window, "setTimeout" | "clearTimeout">;

export function createAvatarSignals(
  slot: HTMLElement,
  section: HTMLElement | null,
  clock: Clock = window
): GateSignals {
  let triggered = false;
  let inView = false;
  let started = false;
  let lost = false;
  let grace: number | undefined;

  const stopGrace = () => {
    if (grace !== undefined) clock.clearTimeout(grace);
    grace = undefined;
  };
  const release = () => {
    stopGrace();
    section?.removeAttribute(HOLD);
  };
  const setStage = (on: boolean) => {
    if (on) slot.dataset.avatarStage = "3d";
    else delete slot.dataset.avatarStage;
  };

  return {
    get triggered() {
      return triggered;
    },
    get inView() {
      return inView;
    },
    hold() {
      if (!lost) section?.setAttribute(HOLD, "");
    },
    setTriggered() {
      if (triggered) return;
      triggered = true;
      slot.setAttribute("data-avatar-inview", "");
      if (section?.hasAttribute(HOLD) && !started) {
        grace = clock.setTimeout(release, GLB_GRACE_MS);
      }
    },
    setInView(next) {
      inView = next;
    },
    ready() {
      // Off screen nobody sees the swap; on screen it waits for the intro.
      if (!inView) setStage(true);
      return { alreadyPast: triggered && !inView };
    },
    started() {
      started = true;
      stopGrace();
      setStage(true);
    },
    counters: release,
    lost() {
      lost = true;
      setStage(false);
      release();
    },
    dispose() {
      release();
      setStage(false);
      slot.removeAttribute("data-avatar-inview");
    }
  };
}
