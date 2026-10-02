import type {
  AnimationClip,
  Material,
  Mesh,
  Object3D,
  SkinnedMesh
} from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AVATAR } from "./avatar.config";

export interface AvatarModel {
  root: Object3D;
  /** Cloned per mount, so opacity changes never leak into another mount. */
  materials: Material[];
  head: Object3D | null;
  /** False when no clip writes the head's rotation (look-at must reset it). */
  headAnimated: boolean;
}

// A view transition can show two Home pages at once and an Object3D has one
// parent, so every mount gets its own skeleton-aware clone. Geometries and
// textures stay shared with the loader cache.
export function prepareAvatar(gltf: {
  scene: Object3D;
  animations: AnimationClip[];
}): AvatarModel {
  const root = clone(gltf.scene);
  const copies = new Map<Material, Material>();
  const own = (material: Material) => {
    let copy = copies.get(material);
    if (!copy) {
      copy = material.clone();
      copies.set(material, copy);
    }
    return copy;
  };
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    // Bind-pose bounds go stale while animating.
    if ((mesh as SkinnedMesh).isSkinnedMesh) mesh.frustumCulled = false;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(own)
      : own(mesh.material);
  });

  const head = root.getObjectByName(AVATAR.HEAD_BONE) ?? null;
  if (!head && process.env.NODE_ENV !== "production") {
    console.warn(`[about-avatar] head bone "${AVATAR.HEAD_BONE}" not found`);
  }
  const headTrack = `${AVATAR.HEAD_BONE}.quaternion`;
  return {
    root,
    materials: [...copies.values()],
    head,
    headAnimated: gltf.animations.some((clip) =>
      clip.tracks.some((track) => track.name === headTrack)
    )
  };
}

export function setOpacity(materials: readonly Material[], opacity: number) {
  const transparent = opacity < 1;
  for (const material of materials) {
    if (material.transparent !== transparent) {
      material.transparent = transparent; // only while fading (sorting)
      material.needsUpdate = true;
    }
    material.opacity = opacity;
  }
}

export function disposeAvatar(model: AvatarModel) {
  for (const material of model.materials) material.dispose();
}
