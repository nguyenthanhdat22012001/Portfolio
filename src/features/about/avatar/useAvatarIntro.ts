import { useEffect, useMemo, useRef } from "react";
import {
  createIntro,
  startMode,
  type AvatarPhase,
  type ClipName,
  type Intro,
  type IntroPose,
  type StartMode
} from "./choreography";
import { playClip, setWalkSpeed, type AvatarActions } from "./useAvatarMixer";

const GREETED_KEY = "avatar-greeted";

// Storage can throw (blocked site data, some private modes): then every
// visit gets the full intro.
function readMode(): "full" | "repeat" {
  try {
    return window.sessionStorage.getItem(GREETED_KEY) ? "repeat" : "full";
  } catch {
    return "full";
  }
}

function markGreeted() {
  try {
    window.sessionStorage.setItem(GREETED_KEY, "1");
  } catch {
    // Not remembered; the next visit replays the full intro.
  }
}

// Exposed on the About slot for e2e and CSS (spec §5.3).
function setPhase(slot: HTMLElement, phase: AvatarPhase | null) {
  if (phase) slot.dataset.avatarPhase = phase;
  else delete slot.dataset.avatarPhase;
}

export interface IntroController {
  /** Starts the clock (first visible frame). alreadyPast → skip to idle. */
  start(alreadyPast: boolean): StartMode;
  started(): boolean;
  advance(dt: number): IntroPose;
  rewave(): boolean;
}

// Drives the mixer from the pure intro clock: clips change only on the
// clock's phase edges, never on the mixer's "finished" event.
export function useAvatarIntro(
  slot: HTMLElement,
  actions: AvatarActions
): IntroController {
  const intro = useRef<Intro | null>(null);
  const clip = useRef<ClipName | null>(null);
  const phase = useRef<AvatarPhase | null>(null);

  useEffect(() => () => setPhase(slot, null), [slot]);

  return useMemo(
    () => ({
      start(alreadyPast) {
        const mode = startMode({
          alreadyPast,
          greeted: readMode() === "repeat"
        });
        intro.current = createIntro(mode);
        return mode;
      },
      started: () => intro.current !== null,
      advance(dt) {
        const pose = intro.current!.step(dt);
        if (pose.clip !== clip.current) {
          playClip(actions, clip.current, pose.clip, pose.fade);
          clip.current = pose.clip;
        }
        setWalkSpeed(actions, pose.walkTimeScale);
        if (pose.phase !== phase.current) {
          phase.current = pose.phase;
          setPhase(slot, pose.phase);
          if (pose.phase === "wave") markGreeted();
        }
        return pose;
      },
      rewave: () => intro.current?.rewave() ?? false
    }),
    [actions, slot]
  );
}
