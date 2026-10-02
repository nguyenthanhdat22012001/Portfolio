import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GLB_GRACE_MS, createAvatarSignals } from "./avatar-signals";

let section: HTMLElement;
let slot: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  section = document.createElement("section");
  slot = document.createElement("div");
  section.append(slot);
  document.body.append(section);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

const holding = () => section.hasAttribute("data-count-hold");
const stage = () => slot.dataset.avatarStage;

describe("AvatarSignals", () => {
  it("marks the 70 % crossing on the slot", () => {
    const s = createAvatarSignals(slot, section);
    expect(s.triggered).toBe(false);
    s.setTriggered();
    expect(s.triggered).toBe(true);
    expect(slot.hasAttribute("data-avatar-inview")).toBe(true);
  });

  it("ready while off screen: swap to 3D at once; already past if triggered", () => {
    const s = createAvatarSignals(slot, section);
    s.setTriggered();
    s.setInView(false);
    expect(s.ready()).toEqual({ alreadyPast: true });
    expect(stage()).toBe("3d");
  });

  it("ready while on screen: keep the image until the intro starts", () => {
    const s = createAvatarSignals(slot, section);
    s.setInView(true);
    expect(s.ready()).toEqual({ alreadyPast: false });
    expect(stage()).toBeUndefined();
    s.started();
    expect(stage()).toBe("3d");
  });

  it("holds the counters until the avatar says so", () => {
    const s = createAvatarSignals(slot, section);
    s.hold();
    expect(holding()).toBe(true);
    s.setTriggered();
    s.started();
    vi.advanceTimersByTime(GLB_GRACE_MS * 2);
    expect(holding()).toBe(true); // intro running: the grace timer is off
    s.counters();
    expect(holding()).toBe(false);
  });

  it("releases the counters 1.5 s after the trigger if the intro hasn't started", () => {
    const s = createAvatarSignals(slot, section);
    s.hold();
    s.setTriggered();
    vi.advanceTimersByTime(GLB_GRACE_MS - 1);
    expect(holding()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(holding()).toBe(false);
  });

  it("lost: image back, counters free, and no new hold afterwards", () => {
    const s = createAvatarSignals(slot, section);
    s.hold();
    s.setInView(false);
    s.ready();
    s.lost();
    expect(stage()).toBeUndefined();
    expect(holding()).toBe(false);
    s.hold();
    expect(holding()).toBe(false);
  });

  it("dispose clears its attributes and timers", () => {
    const s = createAvatarSignals(slot, section);
    s.hold();
    s.setTriggered();
    s.started();
    s.dispose();
    expect(holding()).toBe(false);
    expect(stage()).toBeUndefined();
    expect(slot.hasAttribute("data-avatar-inview")).toBe(false);
  });
});
