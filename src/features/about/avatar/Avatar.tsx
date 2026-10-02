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
import type { DirectionalLight, Group } from "three";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { RenderTier } from "@/shared/three/detect-tier";
import { AVATAR } from "./avatar.config";
import { disposeAvatar, prepareAvatar, setOpacity } from "./avatar-model";
import { AvatarBubble } from "./AvatarBubble";
import { AvatarHitProxy } from "./AvatarHitProxy";
import { useAvatarIntro } from "./useAvatarIntro";
import { useAvatarMixer } from "./useAvatarMixer";
import type { AccentColor } from "./useAccentColor";
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
  /** Theme accent (rim light). */
  accent: AccentColor;
}

// Per frame this writes three objects and data-* attributes directly; no React state changes after mount.
function AvatarScene({ tier, slot, bubble, accent }: AvatarProps) {
  const gltf = useLoader(GLTFLoader, AVATAR.url, withMeshopt);
  const model = useMemo(() => prepareAvatar(gltf), [gltf]);
  const { mixer, actions } = useAvatarMixer(model.root, gltf.animations);
  const intro = useAvatarIntro(slot, actions);
  const lookAt = useHeadLook(model, slot);
  const rootRef = useRef<Group>(null);
  const rimRef = useRef<DirectionalLight>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const accentVersion = useRef(-1);
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

  useFrame(({ pointer }, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const dt = Math.min(delta, 0.1); // no jump after a background tab
    const rim = rimRef.current;
    if (rim && accentVersion.current !== accent.version) {
      rim.color.copy(accent.color); // follows the theme
      accentVersion.current = accent.version;
    }

    if (!intro.started()) intro.start(false); // Task 5 gates this on the 70 % trigger
    const pose = intro.advance(dt);
    // Runtime drop to Low (PerformanceMonitor): fade out.
    if (tierRef.current === "low") {
      tierOpacity.current = Math.max(
        0,
        tierOpacity.current - dt / AVATAR.tierFadeOut
      );
    }
    const opacity = pose.opacity * tierOpacity.current;
    const visible = opacity > 0;
    if (visible !== root.visible) {
      root.visible = visible;
      setHidden(slot, !visible);
    }
    bubbleRef.current?.toggleAttribute("data-visible", visible && pose.bubble);
    if (!visible) return;

    root.position.set(AVATAR.end.x, 0, pose.z);
    setOpacity(model.materials, opacity);
    mixer.update(dt);
    // pointer: slot-relative NDC (eventSource is the slot).
    lookAt(dt, pose.phase === "idle", pointer);
  });

  return (
    <>
      {/* Outside the visibility-toggled group so hiding the avatar never changes the scene's light count (a recompile would flash). */}
      <directionalLight
        ref={rimRef}
        position={[...AVATAR.rim.position]}
        intensity={AVATAR.rim.intensity}
      />
      <group ref={rootRef} visible={false}>
        <primitive object={model.root} />
        {tier === "high" && <ContactShadows {...AVATAR.contactShadows} />}
        <AvatarHitProxy
          slot={slot}
          active={() => rootRef.current?.visible === true}
          onWave={intro.rewave}
        />
        <AvatarBubble ref={bubbleRef} text={bubble} />
      </group>
    </>
  );
}

function markFailed(slot: HTMLElement, failed: boolean) {
  slot.toggleAttribute("data-avatar-failed", failed);
}

// A failed GLB shows the static idle image (data-avatar-failed).
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
      console.warn("[about-avatar] failed, showing the static image", error);
    }
  }

  componentWillUnmount() {
    markFailed(this.props.slot, false);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Rendered inside AboutAvatarCanvas (about-avatar chunk).
export default function Avatar(props: AvatarProps) {
  return (
    <AvatarBoundary slot={props.slot}>
      <Suspense fallback={null}>
        <AvatarScene {...props} />
      </Suspense>
    </AvatarBoundary>
  );
}
