import {
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  NumberKeyframeTrack,
  Object3D
} from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createActions, playClip, setWalkSpeed } from "./useAvatarMixer";

const clip = (name: string, duration: number) =>
  new AnimationClip(name, duration, [
    new NumberKeyframeTrack(".position[x]", [0, duration], [0, 1])
  ]);

function setup() {
  const mixer = new AnimationMixer(new Object3D());
  const actions = createActions(mixer, [
    clip("walk", 1),
    clip("wave", 2),
    clip("idle", 2)
  ]);
  return { mixer, actions };
}

afterEach(() => vi.restoreAllMocks());

describe("createActions", () => {
  it("plays the wave once and holds its last frame", () => {
    const { actions } = setup();
    expect(actions.wave?.loop).toBe(LoopOnce);
    expect(actions.wave?.clampWhenFinished).toBe(true);
  });

  it("leaves out missing clips and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const actions = createActions(new AnimationMixer(new Object3D()), [
      clip("walk", 1)
    ]);
    expect(actions.wave).toBeUndefined();
    expect(actions.idle).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});

describe("playClip", () => {
  it("crossfades from the current clip", () => {
    const { mixer, actions } = setup();
    playClip(actions, null, "walk", 0);
    mixer.update(0.1);
    expect(actions.walk!.getEffectiveWeight()).toBe(1);
    playClip(actions, "walk", "wave", 0.3);
    mixer.update(0.5);
    expect(actions.walk!.getEffectiveWeight()).toBe(0);
    expect(actions.wave!.getEffectiveWeight()).toBe(1);
  });

  it("is a no-op for a missing clip", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const mixer = new AnimationMixer(new Object3D());
    const actions = createActions(mixer, [clip("walk", 1)]);
    expect(() => playClip(actions, "walk", "wave", 0.3)).not.toThrow();
  });
});

describe("setWalkSpeed", () => {
  it("sets the walk clip's time scale", () => {
    const { actions } = setup();
    setWalkSpeed(actions, 0.7);
    expect(actions.walk!.timeScale).toBe(0.7);
  });
});
