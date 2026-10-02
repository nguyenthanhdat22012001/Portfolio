import {
  AnimationClip,
  Bone,
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  QuaternionKeyframeTrack
} from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AVATAR } from "./avatar.config";
import { disposeAvatar, prepareAvatar, setOpacity } from "./avatar-model";

function fakeGltf({ head = true, headTrack = true } = {}) {
  const shared = new MeshStandardMaterial();
  const scene = new Group();
  scene.add(
    new Mesh(new BoxGeometry(), shared),
    new Mesh(new BoxGeometry(), shared)
  );
  if (head) {
    const bone = new Bone();
    bone.name = AVATAR.HEAD_BONE;
    scene.add(bone);
  }
  const tracks = headTrack
    ? [
        new QuaternionKeyframeTrack(
          `${AVATAR.HEAD_BONE}.quaternion`,
          [0],
          [0, 0, 0, 1]
        )
      ]
    : [];
  return { scene, animations: [new AnimationClip("idle", 1, tracks)], shared };
}

afterEach(() => vi.restoreAllMocks());

describe("prepareAvatar", () => {
  it("clones the scene and gives the clone its own materials (one per shared original)", () => {
    const gltf = fakeGltf();
    const model = prepareAvatar(gltf);
    expect(model.root).not.toBe(gltf.scene);
    expect(model.materials).toHaveLength(1);
    expect(model.materials[0]).not.toBe(gltf.shared);
    const meshes = model.root.children.filter(
      (c): c is Mesh => (c as Mesh).isMesh
    );
    expect(meshes.every((m) => m.material === model.materials[0])).toBe(true);
  });

  it("finds the head bone and whether the clips animate it", () => {
    expect(prepareAvatar(fakeGltf()).head?.name).toBe(AVATAR.HEAD_BONE);
    expect(prepareAvatar(fakeGltf()).headAnimated).toBe(true);
    expect(prepareAvatar(fakeGltf({ headTrack: false })).headAnimated).toBe(
      false
    );
  });

  it("tolerates a model without the head bone", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(prepareAvatar(fakeGltf({ head: false })).head).toBeNull();
  });
});

describe("setOpacity", () => {
  it("is transparent only below 1 and flags a recompile only on change", () => {
    const { materials } = prepareAvatar(fakeGltf());
    const material = materials[0]!;
    const v0 = material.version;
    setOpacity(materials, 0.5);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBe(0.5);
    const v1 = material.version;
    expect(v1).toBeGreaterThan(v0);
    setOpacity(materials, 0.6);
    expect(material.version).toBe(v1);
    setOpacity(materials, 1);
    expect(material.transparent).toBe(false);
  });
});

describe("disposeAvatar", () => {
  it("disposes the cloned materials only", () => {
    const gltf = fakeGltf();
    const model = prepareAvatar(gltf);
    const own = vi.spyOn(model.materials[0]!, "dispose");
    const shared = vi.spyOn(gltf.shared, "dispose");
    disposeAvatar(model);
    expect(own).toHaveBeenCalled();
    expect(shared).not.toHaveBeenCalled();
  });
});
