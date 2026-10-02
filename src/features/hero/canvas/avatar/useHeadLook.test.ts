import { Bone, Euler, Object3D, Quaternion } from "three";
import { describe, expect, it } from "vitest";
import type { AvatarModel } from "./avatar-model";
import { lookTarget } from "./choreography";
import { createHeadLook } from "./useHeadLook";

function model(headAnimated: boolean): AvatarModel {
  return {
    root: new Object3D(),
    materials: [],
    head: new Bone(),
    headAnimated
  };
}

const yawOf = (q: Quaternion) => new Euler().setFromQuaternion(q).y;

describe("createHeadLook", () => {
  it("turns the head towards the pointer, within the clamp", () => {
    const m = model(false);
    const look = createHeadLook(m);
    for (let i = 0; i < 60; i++) look(0.1, true, { x: 1, y: 0 });
    expect(yawOf(m.head!.quaternion)).toBeCloseTo(lookTarget(1, 0).yaw, 3);
  });

  it("eases back to straight ahead when inactive", () => {
    const m = model(false);
    const look = createHeadLook(m);
    for (let i = 0; i < 60; i++) look(0.1, true, { x: 1, y: 0 });
    for (let i = 0; i < 60; i++) look(0.1, false, { x: 1, y: 0 });
    expect(yawOf(m.head!.quaternion)).toBeCloseTo(0, 3);
  });

  it("does not accumulate when no clip writes the head", () => {
    const m = model(false);
    const look = createHeadLook(m);
    look(10, true, { x: 1, y: 0 });
    const once = yawOf(m.head!.quaternion);
    look(0, true, { x: 1, y: 0 });
    expect(yawOf(m.head!.quaternion)).toBeCloseTo(once, 6);
  });

  it("is a no-op without a head bone", () => {
    const look = createHeadLook({ ...model(false), head: null });
    expect(() => look(0.1, true, { x: 1, y: 1 })).not.toThrow();
  });
});
