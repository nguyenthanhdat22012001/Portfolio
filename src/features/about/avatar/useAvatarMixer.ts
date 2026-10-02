import { useEffect, useMemo } from "react";
import {
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  type AnimationAction,
  type Object3D
} from "three";
import { AVATAR } from "./avatar.config";
import type { ClipName } from "./choreography";

export type AvatarActions = Partial<Record<ClipName, AnimationAction>>;

const NAMES = Object.keys(AVATAR.CLIPS) as ClipName[];

export function createActions(
  mixer: AnimationMixer,
  clips: readonly AnimationClip[]
): AvatarActions {
  const actions: AvatarActions = {};
  for (const name of NAMES) {
    const clip = AnimationClip.findByName(
      clips as AnimationClip[],
      AVATAR.CLIPS[name]
    );
    if (!clip) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[about-avatar] clip "${AVATAR.CLIPS[name]}" missing; static pose`
        );
      }
      continue;
    }
    actions[name] = mixer.clipAction(clip);
  }
  if (actions.wave) {
    actions.wave.setLoop(LoopOnce, 1);
    actions.wave.clampWhenFinished = true;
  }
  return actions;
}

export function playClip(
  actions: AvatarActions,
  from: ClipName | null,
  to: ClipName,
  fade: number
) {
  const next = actions[to];
  if (!next) return;
  next.reset().setEffectiveWeight(1).play();
  const previous = from ? actions[from] : undefined;
  if (!previous || previous === next) return;
  if (fade > 0) previous.crossFadeTo(next, fade, false);
  else previous.stop();
}

export function setWalkSpeed(actions: AvatarActions, timeScale: number) {
  if (actions.walk) actions.walk.timeScale = timeScale;
}

export function useAvatarMixer(root: Object3D, clips: AnimationClip[]) {
  const mixer = useMemo(() => new AnimationMixer(root), [root]);
  const actions = useMemo(() => createActions(mixer, clips), [mixer, clips]);
  // Stop only. uncacheRoot would leave the memoized actions unusable after
  // StrictMode's dev unmount/remount (three throws on _cacheIndex), and it
  // frees nothing here: the mixer and the cloned root are per mount and
  // become unreachable together.
  useEffect(
    () => () => {
      mixer.stopAllAction();
    },
    [mixer]
  );
  return { mixer, actions };
}
