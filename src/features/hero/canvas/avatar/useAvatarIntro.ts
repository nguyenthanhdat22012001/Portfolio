import { useEffect, useMemo, useRef, useState } from "react";
import {
  createIntro,
  type AvatarPhase,
  type ClipName,
  type IntroPose
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

// Exposed for e2e (spec B.10) and CSS, like data-gate.
function setPhase(slot: HTMLElement, phase: AvatarPhase | null) {
  if (phase) slot.dataset.avatarPhase = phase;
  else delete slot.dataset.avatarPhase;
}

export interface IntroController {
  advance(dt: number, morph: number): IntroPose;
  rewave(): boolean;
}

// Drives the mixer from the pure intro clock: clips change only on the
// clock's phase edges, never on the mixer's "finished" event.
export function useAvatarIntro(
  slot: HTMLElement,
  actions: AvatarActions
): IntroController {
  const [intro] = useState(() => createIntro(readMode()));
  const clip = useRef<ClipName | null>(null);
  const phase = useRef<AvatarPhase | null>(null);

  useEffect(() => () => setPhase(slot, null), [slot]);

  return useMemo(
    () => ({
      advance(dt, morph) {
        const pose = intro.step(dt, morph);
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
      rewave: () => intro.rewave()
    }),
    [intro, actions, slot]
  );
}
