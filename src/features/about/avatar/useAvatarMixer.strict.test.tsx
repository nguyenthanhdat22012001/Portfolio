import { StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import {
  AnimationClip,
  AnimationMixer,
  NumberKeyframeTrack,
  Object3D
} from "three";
import { describe, expect, it } from "vitest";
import { playClip, useAvatarMixer, type AvatarActions } from "./useAvatarMixer";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const clip = (name: string) =>
  new AnimationClip(name, 1, [
    new NumberKeyframeTrack(".position[x]", [0, 1], [0, 1])
  ]);
const root = new Object3D();
const clips = [clip("walk"), clip("wave"), clip("idle")];

describe("useAvatarMixer under StrictMode (dev double effects)", () => {
  it("leaves the mixer usable after the simulated unmount/remount", async () => {
    let got: { mixer: AnimationMixer; actions: AvatarActions } | undefined;
    function Probe() {
      got = useAvatarMixer(root, clips);
      return null;
    }
    const host = document.createElement("div");
    const reactRoot = createRoot(host);
    await act(async () => {
      reactRoot.render(
        <StrictMode>
          <Probe />
        </StrictMode>
      );
    });
    expect(() => {
      playClip(got!.actions, null, "walk", 0);
      got!.mixer.update(0.1);
      playClip(got!.actions, "walk", "wave", 0.3);
      got!.mixer.update(0.1);
    }).not.toThrow();
    await act(async () => reactRoot.unmount());
  });
});
