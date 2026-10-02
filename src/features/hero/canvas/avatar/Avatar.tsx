import { ContactShadows } from "@react-three/drei/core/ContactShadows";
import { useFrame, useLoader } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type ReactNode
} from "react";
import type { DirectionalLight, Group, PerspectiveCamera } from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { RenderTier } from "../../quality/detect-tier";
import type { GraphPalette } from "../useGraphColors";
import { AVATAR } from "./avatar.config";
import { disposeAvatar, prepareAvatar } from "./avatar-model";
import { avatarFrame } from "./choreography";
import { playClip, useAvatarMixer } from "./useAvatarMixer";

// three's own loader + meshopt; drei's useGLTF would bundle DRACOLoader too.
function withMeshopt(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder);
}

export interface AvatarProps {
  tier: RenderTier;
  slot: HTMLElement;
  bubble: string;
  /** Theme colors from the canvas chunk (rim light = --accent). */
  palette: GraphPalette;
}

function AvatarScene({ tier, palette }: AvatarProps) {
  const gltf = useLoader(GLTFLoader, AVATAR.url, withMeshopt);
  const model = useMemo(() => prepareAvatar(gltf), [gltf]);
  const { mixer, actions } = useAvatarMixer(model.root, gltf.animations);
  const rootRef = useRef<Group>(null);
  const rimRef = useRef<DirectionalLight>(null);
  const paletteVersion = useRef(-1);

  useEffect(() => () => disposeAvatar(model), [model]);
  useEffect(() => playClip(actions, null, "idle", 0), [actions]);

  useFrame(({ camera, size }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    // CameraRig fits camera z to the slot each frame; follow it (resize).
    const frame = avatarFrame(
      size.width / Math.max(1, size.height),
      camera.position.z,
      (camera as PerspectiveCamera).fov
    );
    root.scale.setScalar(frame.scale);
    root.position.set(AVATAR.end.x, frame.feetY, AVATAR.end.z);
    const rim = rimRef.current;
    if (rim && paletteVersion.current !== palette.version) {
      rim.color.copy(palette.app); // --accent, follows the theme
      paletteVersion.current = palette.version;
    }
    mixer.update(Math.min(delta, 0.1));
  });

  return (
    <group ref={rootRef}>
      <primitive object={model.root} />
      <directionalLight
        ref={rimRef}
        position={[...AVATAR.rim.position]}
        intensity={AVATAR.rim.intensity}
      />
      {tier === "high" && <ContactShadows {...AVATAR.contactShadows} />}
    </group>
  );
}

function markFailed(slot: HTMLElement, failed: boolean) {
  slot.toggleAttribute("data-avatar-failed", failed);
}

// A failed GLB must not take the graph down with it: the gate's
// CanvasBoundary would switch the whole canvas off. CSS then shows the
// static idle image (data-avatar-failed). (If this chunk itself fails to
// load, the gate's boundary does take over: static graph + idle image.)
class AvatarBoundary extends Component<
  { slot: HTMLElement; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    markFailed(this.props.slot, true);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[hero-avatar] failed, showing the static image", error);
    }
  }

  componentWillUnmount() {
    markFailed(this.props.slot, false);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Entry of the hero-avatar chunk.
export default function Avatar(props: AvatarProps) {
  return (
    <AvatarBoundary slot={props.slot}>
      <Suspense fallback={null}>
        <AvatarScene {...props} />
      </Suspense>
    </AvatarBoundary>
  );
}
