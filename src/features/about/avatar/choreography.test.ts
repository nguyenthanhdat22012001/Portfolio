import { describe, expect, it } from "vitest";
import { AVATAR } from "./avatar.config";
import {
  CRUISE_SPEED,
  FULL_IDLE_AT,
  aboutFrame,
  clampLook,
  createIntro,
  lookTarget,
  poseAt,
  startMode
} from "./choreography";

const deg = (d: number) => (d * Math.PI) / 180;

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
    expect(intro.step(0.016).phase).toBe("enter"); // first step is t = 0
    expect(intro.step(1).phase).toBe("walk");
    expect(intro.step(2).phase).toBe("wave");
    expect(intro.step(2).phase).toBe("idle");
  });

  it("starts the repeat path at wave", () => {
    expect(createIntro("repeat").step(0).phase).toBe("wave");
  });

  it("rewaves only from idle", () => {
    const intro = createIntro("full");
    intro.step(0);
    expect(intro.rewave()).toBe(false); // still entering
    intro.step(5);
    expect(intro.rewave()).toBe(true);
    expect(intro.step(0.016).phase).toBe("wave");
    expect(intro.rewave()).toBe(false); // already waving
    expect(intro.step(AVATAR.timings.wave).phase).toBe("idle");
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

describe("startMode", () => {
  it("already past About → skip (straight to idle)", () => {
    expect(startMode({ alreadyPast: true, greeted: false })).toBe("skip");
    expect(startMode({ alreadyPast: true, greeted: true })).toBe("skip");
    expect(
      poseAt(0, startMode({ alreadyPast: true, greeted: false })).phase
    ).toBe("idle");
  });

  it("greeted this session → repeat, else full", () => {
    expect(startMode({ alreadyPast: false, greeted: true })).toBe("repeat");
    expect(startMode({ alreadyPast: false, greeted: false })).toBe("full");
  });
});

describe("createIntro (start modes)", () => {
  it("skip starts in idle and never walks", () => {
    const intro = createIntro("skip");
    expect(intro.step(0).phase).toBe("idle");
    expect(intro.step(1).phase).toBe("idle");
  });

  it("time only moves forward: idle stays idle", () => {
    const intro = createIntro("full");
    intro.step(0);
    intro.step(FULL_IDLE_AT + 0.1);
    for (let i = 0; i < 100; i += 1) expect(intro.step(0.1).phase).toBe("idle");
  });
});

describe("counters", () => {
  it("full intro: due at timings.countersStart (2.5 s), right after the wave starts", () => {
    expect(AVATAR.timings.countersStart).toBe(2.5);
    expect(poseAt(2.49, "full").counters).toBe(false);
    expect(poseAt(2.5, "full").counters).toBe(true);
  });

  it("repeat and skip: due at once", () => {
    expect(poseAt(0, "repeat").counters).toBe(true);
    expect(poseAt(0, "skip").counters).toBe(true);
  });
});

describe("aboutFrame", () => {
  // Hand-computed: visible height = 1.70 / 0.8 = 2.125 m; tan(15°) = 0.267949.
  it("fits the avatar at end.z to 80 % of the slot height, feet 6 % up", () => {
    const frame = aboutFrame(30);
    expect(frame.cameraZ).toBeCloseTo(1.6 + 2.125 / (2 * 0.267949), 4); // 5.5653
    expect(frame.cameraY).toBeCloseTo(2.125 * (0.5 - 0.06), 4); // 0.935
  });
});
