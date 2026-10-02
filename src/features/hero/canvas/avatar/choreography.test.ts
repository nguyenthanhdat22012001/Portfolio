import { describe, expect, it } from "vitest";
import { CAMERA_FOV, fitCameraZ } from "../graph-frame";
import { AVATAR } from "./avatar.config";
import {
  CRUISE_SPEED,
  FULL_IDLE_AT,
  avatarFrame,
  clampLook,
  createIntro,
  lookTarget,
  poseAt,
  scrollPose
} from "./choreography";

const deg = (d: number) => (d * Math.PI) / 180;
const frameFor = (aspect: number) =>
  avatarFrame(aspect, fitCameraZ(aspect), CAMERA_FOV);

describe("poseAt (full intro)", () => {
  it("walks, waves, then idles", () => {
    expect(poseAt(0, "full").phase).toBe("enter");
    expect(poseAt(1, "full").phase).toBe("walk");
    expect(poseAt(3, "full").phase).toBe("wave");
    expect(poseAt(5, "full").phase).toBe("idle");
  });

  it("reaches idle inside the 4.5 s acceptance window", () => {
    expect(FULL_IDLE_AT).toBeCloseTo(4.15, 5);
    expect(poseAt(4.5, "full").phase).toBe("idle");
  });

  it("fades in over timings.fadeIn", () => {
    expect(poseAt(0, "full").opacity).toBe(0);
    expect(poseAt(0.2, "full").opacity).toBeCloseTo(0.5, 5);
    expect(poseAt(0.4, "full").opacity).toBe(1);
  });

  it("moves forward continuously from start to end", () => {
    let last = poseAt(0, "full").z;
    for (let t = 0; t <= AVATAR.timings.walk + 0.5; t += 0.01) {
      const { z } = poseAt(t, "full");
      expect(z).toBeGreaterThanOrEqual(last - 1e-9);
      expect(z - last).toBeLessThan(0.05); // no jumps
      last = z;
    }
    expect(poseAt(0, "full").z).toBe(AVATAR.start.z);
    expect(poseAt(AVATAR.timings.walk, "full").z).toBeCloseTo(AVATAR.end.z, 5);
    expect(poseAt(10, "full").z).toBe(AVATAR.end.z);
  });

  it("cruises near the walk clip's natural 1.36 m/s", () => {
    expect(CRUISE_SPEED).toBeGreaterThan(1.3);
    expect(CRUISE_SPEED).toBeLessThan(1.5);
  });

  it("slows the steps down with the body, never below 0.6", () => {
    expect(poseAt(1, "full").walkTimeScale).toBe(AVATAR.walkTimeScale);
    const late = poseAt(AVATAR.timings.walk - 0.01, "full").walkTimeScale;
    expect(late).toBeGreaterThanOrEqual(0.6 * AVATAR.walkTimeScale);
    expect(late).toBeLessThan(AVATAR.walkTimeScale);
  });

  it("shows the bubble from bubbleIn to bubbleOut", () => {
    expect(poseAt(2.1, "full").bubble).toBe(false);
    expect(poseAt(2.3, "full").bubble).toBe(true);
    expect(poseAt(4.3, "full").bubble).toBe(true);
    expect(poseAt(4.5, "full").bubble).toBe(false);
  });

  it("crossfades with the configured durations", () => {
    expect(poseAt(3, "full").fade).toBe(AVATAR.timings.walkToWave);
    expect(poseAt(5, "full").fade).toBe(AVATAR.timings.waveToIdle);
  });
});

describe("poseAt (other modes)", () => {
  it("repeat visit: starts at wave at the end position, fading in", () => {
    const first = poseAt(0, "repeat");
    expect(first.phase).toBe("wave");
    expect(first.z).toBe(AVATAR.end.z);
    expect(first.opacity).toBe(0);
    expect(poseAt(AVATAR.repeatFadeIn, "repeat").opacity).toBe(1);
    expect(poseAt(AVATAR.timings.wave, "repeat").phase).toBe("idle");
  });

  it("rewave: wave at full opacity, then idle", () => {
    expect(poseAt(0, "rewave")).toMatchObject({ phase: "wave", opacity: 1 });
    expect(poseAt(AVATAR.timings.wave, "rewave").phase).toBe("idle");
  });

  it("scrolled-past: idle straight away", () => {
    expect(poseAt(0, "skip")).toMatchObject({
      phase: "idle",
      clip: "idle",
      opacity: 1,
      z: AVATAR.end.z
    });
  });
});

describe("createIntro", () => {
  it("runs the full intro from the first step", () => {
    const intro = createIntro("full");
    expect(intro.step(0.016, 0).phase).toBe("enter"); // first step is t = 0
    expect(intro.step(1, 0).phase).toBe("walk");
    expect(intro.step(2, 0).phase).toBe("wave");
    expect(intro.step(2, 0).phase).toBe("idle");
  });

  it("starts in idle when the visitor has already scrolled", () => {
    expect(createIntro("full").step(0, 0.4).phase).toBe("idle");
  });

  it("jumps to idle when the visitor scrolls past during the walk", () => {
    const intro = createIntro("full");
    intro.step(0, 0);
    expect(intro.step(1, 0).phase).toBe("walk");
    expect(intro.step(0.016, 0.35).phase).toBe("idle");
    expect(intro.step(0.016, 0).phase).toBe("idle"); // never replays
  });

  it("starts the repeat path at wave", () => {
    expect(createIntro("repeat").step(0, 0).phase).toBe("wave");
  });

  it("rewaves only from idle", () => {
    const intro = createIntro("full");
    intro.step(0, 0);
    expect(intro.rewave()).toBe(false); // still entering
    intro.step(5, 0);
    expect(intro.rewave()).toBe(true);
    expect(intro.step(0.016, 0).phase).toBe("wave");
    expect(intro.rewave()).toBe(false); // already waving
    expect(intro.step(AVATAR.timings.wave, 0).phase).toBe("idle");
  });
});

describe("scrollPose", () => {
  it("is neutral at the top", () => {
    expect(scrollPose(0)).toEqual({
      zOffset: 0,
      opacity: 1,
      visible: true,
      lookAt: true
    });
  });

  it("recedes and fades halfway to the hide point", () => {
    const pose = scrollPose(0.25);
    expect(pose.zOffset).toBeCloseTo((AVATAR.receded.z - AVATAR.end.z) / 2, 5);
    expect(pose.opacity).toBeCloseTo(0.5, 5);
    expect(pose.visible).toBe(true);
    expect(pose.lookAt).toBe(false);
  });

  it("hides from morph 0.5", () => {
    expect(scrollPose(0.5).visible).toBe(false);
    expect(scrollPose(1)).toMatchObject({ visible: false, opacity: 0 });
  });
});

describe("look-at", () => {
  it("clamps to ±30° yaw and ±15° pitch", () => {
    expect(clampLook(10, -5)).toEqual({ yaw: deg(10), pitch: deg(-5) });
    expect(clampLook(90, 40)).toEqual({ yaw: deg(30), pitch: deg(15) });
    expect(clampLook(-90, -40)).toEqual({ yaw: deg(-30), pitch: deg(-15) });
  });

  it("looks straight ahead at the slot centre and saturates at the edges", () => {
    expect(lookTarget(0, 0)).toEqual({ yaw: 0, pitch: 0 });
    const edge = lookTarget(1, 1);
    expect(Math.abs(edge.yaw)).toBeCloseTo(deg(30), 5);
    expect(Math.abs(edge.pitch)).toBeCloseTo(deg(15), 5);
  });
});

describe("avatarFrame", () => {
  // Hand-computed: GRAPH_WIDTH = 7.17, tan(22.5°) = 0.414214, FIT_FRACTION 0.85.
  it("mobile slot (4/3)", () => {
    const frame = frameFor(4 / 3);
    expect(frame.scale).toBeCloseTo(2.0592, 3);
    expect(frame.feetY).toBeCloseTo(-1.7503, 3);
    expect(frame.leftPct).toBeCloseTo(59.0, 1);
  });

  it("desktop slot (7/8)", () => {
    const frame = frameFor(7 / 8);
    expect(frame.scale).toBeCloseTo(3.4238, 3);
    expect(frame.leftPct).toBeCloseTo(58.25, 1);
  });
});
