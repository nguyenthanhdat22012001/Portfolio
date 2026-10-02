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
/** Places the slot: bottom < 0 is above the viewport. */
const placeSlot = (top: number, bottom: number) => {
  slot.getBoundingClientRect = () => ({ top, bottom }) as DOMRect;
};
const stage = () => slot.dataset.avatarStage;

describe("AvatarSignals", () => {
  it("marks the 70 % crossing on the slot", () => {
    const s = createAvatarSignals(slot, section);
    expect(s.triggered).toBe(false);
    s.setTriggered();
    expect(s.triggered).toBe(true);
    expect(slot.hasAttribute("data-avatar-inview")).toBe(true);
  });

  it("ready while off screen: swap to 3D at once; already past if triggered and above", () => {
    const s = createAvatarSignals(slot, section);
    s.setTriggered();
    s.setInView(false);
    placeSlot(-900, -400);
    expect(s.ready()).toEqual({ alreadyPast: true });
    expect(stage()).toBe("3d");
  });

  // M3 (spec §5.3): past means the slot is above the viewport. Scrolling back
  // up over About after the trigger leaves it below: the intro still plays.
  it("triggered but scrolled back up above About: not past", () => {
    const s = createAvatarSignals(slot, section);
    s.setTriggered();
    s.setInView(false);
    placeSlot(1200, 1700);
    expect(s.ready()).toEqual({ alreadyPast: false });
    expect(stage()).toBe("3d"); // off screen: the swap is still invisible
  });

  it("above the viewport but never triggered: not past", () => {
    const s = createAvatarSignals(slot, section);
    s.setInView(false);
    placeSlot(-900, -400);
    expect(s.ready()).toEqual({ alreadyPast: false });
  });

  it("ready while on screen: keep the image until the intro starts", () => {
    const s = createAvatarSignals(slot, section);
    s.setTriggered();
    s.setInView(true);
    placeSlot(200, 700);
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

  it("arms the grace timer when hold() is called after setTriggered()", () => {
    const s = createAvatarSignals(slot, section);
    s.setTriggered();
    s.hold();
    expect(holding()).toBe(true);
    vi.advanceTimersByTime(GLB_GRACE_MS - 1);
    expect(holding()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(holding()).toBe(false);
  });

  it("lost then started leaves no stage", () => {
    const s = createAvatarSignals(slot, section);
    s.lost();
    s.started();
    expect(stage()).toBeUndefined();
  });

  it("lost then ready while off screen leaves no stage", () => {
    const s = createAvatarSignals(slot, section);
    s.setTriggered();
    s.setInView(false);
    s.lost();
    s.ready();
    expect(stage()).toBeUndefined();
  });

  it("dispose then setTriggered leaves no timer firing", () => {
    const s = createAvatarSignals(slot, section);
    s.hold();
    s.dispose();
    s.setTriggered();
    vi.advanceTimersByTime(GLB_GRACE_MS);
    expect(holding()).toBe(false);
  });

  it("dispose then hold does nothing", () => {
    const s = createAvatarSignals(slot, section);
    s.dispose();
    s.hold();
    expect(holding()).toBe(false);
  });
});
