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
import { useScrollStore } from "@/shared/lib/stores/scroll-store";
import type { RenderTier } from "../../quality/detect-tier";
import type { GraphPalette } from "../useGraphColors";
import { AVATAR } from "./avatar.config";
import { disposeAvatar, prepareAvatar, setOpacity } from "./avatar-model";
import { AvatarBubble } from "./AvatarBubble";
import { avatarFrame, scrollPose } from "./choreography";
import { useAvatarIntro } from "./useAvatarIntro";
import { useAvatarMixer } from "./useAvatarMixer";
import { useHeadLook } from "./useHeadLook";

// three's own loader + meshopt; drei's useGLTF would bundle DRACOLoader too.
function withMeshopt(loader: GLTFLoader) {
  loader.setMeshoptDecoder(MeshoptDecoder);
}

// Exposed for e2e: present while the 3D avatar is hidden.
function setHidden(slot: HTMLElement, hidden: boolean) {
  slot.toggleAttribute("data-avatar-hidden", hidden);
}

export interface AvatarProps {
  tier: RenderTier;
  slot: HTMLElement;
  bubble: string;
  /** Theme colors from the canvas chunk (rim light = --accent). */
  palette: GraphPalette;
}

// Per frame this reads the scroll store with getState() and writes three
// objects and data-* attributes directly; no React state changes after mount.
function AvatarScene({ tier, slot, bubble, palette }: AvatarProps) {
  const gltf = useLoader(GLTFLoader, AVATAR.url, withMeshopt);
  const model = useMemo(() => prepareAvatar(gltf), [gltf]);
  const { mixer, actions } = useAvatarMixer(model.root, gltf.animations);
  const intro = useAvatarIntro(slot, actions);
  const lookAt = useHeadLook(model, slot);
  const rootRef = useRef<Group>(null);
  const rimRef = useRef<DirectionalLight>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const paletteVersion = useRef(-1);
  const tierRef = useRef(tier);
  const tierOpacity = useRef(1);

  useEffect(() => {
    tierRef.current = tier;
  }, [tier]);

  useEffect(
    () => () => {
      disposeAvatar(model);
      setHidden(slot, false);
    },
    [model, slot]
  );

  useFrame(({ camera, size, pointer }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const dt = Math.min(delta, 0.1); // no jump after a background tab
    const rim = rimRef.current;
    if (rim && paletteVersion.current !== palette.version) {
      rim.color.copy(palette.app); // --accent, follows the theme
      paletteVersion.current = palette.version;
    }

    const morph = useScrollStore.getState().heroMorph;
    const scroll = scrollPose(morph);
    const pose = intro.advance(dt, morph);
    // Runtime drop to Low (PerformanceMonitor): fade out; CSS shows the image.
    if (tierRef.current === "low") {
      tierOpacity.current = Math.max(
        0,
        tierOpacity.current - dt / AVATAR.tierFadeOut
      );
    }
    const opacity = pose.opacity * scroll.opacity * tierOpacity.current;
    const visible = scroll.visible && opacity > 0;
    if (visible !== root.visible) {
      root.visible = visible;
      setHidden(slot, !visible);
    }
    bubbleRef.current?.toggleAttribute("data-visible", visible && pose.bubble);
    if (!visible) return; // hidden: the mixer is paused too (spec B.7)

    // CameraRig fits camera z to the slot each frame; follow it (resize).
    const frame = avatarFrame(
      size.width / Math.max(1, size.height),
      camera.position.z,
      (camera as PerspectiveCamera).fov
    );
    root.scale.setScalar(frame.scale);
    root.position.set(AVATAR.end.x, frame.feetY, pose.z + scroll.zOffset);
    setOpacity(model.materials, opacity);
    mixer.update(dt);
    // pointer: slot-relative NDC (eventSource is the slot). Touch never gets
    // here: a coarse pointer is always tier Low.
    lookAt(dt, pose.phase === "idle" && scroll.lookAt, pointer);
  });

  return (
    <group ref={rootRef} visible={false}>
      <primitive object={model.root} />
      <directionalLight
        ref={rimRef}
        position={[...AVATAR.rim.position]}
        intensity={AVATAR.rim.intensity}
      />
      {tier === "high" && <ContactShadows {...AVATAR.contactShadows} />}
      <AvatarBubble ref={bubbleRef} text={bubble} />
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
