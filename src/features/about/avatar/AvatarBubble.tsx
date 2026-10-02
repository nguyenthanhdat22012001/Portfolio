import { Html } from "@react-three/drei/web/Html";
import { useRef, type Ref } from "react";
import { AVATAR } from "./avatar.config";

// DOM bubble (not canvas text); the name is already the h1, so it is
// aria-hidden. Avatar toggles data-visible each frame from the intro pose.
export function AvatarBubble({
  text,
  slot,
  ref
}: {
  text: string;
  /** Html's host. Without a fixed portal, Html mounts before the canvas
   * connects its events to the slot, moves when they do and loses its
   * content (the GLB is preloaded, so the bubble is in the first commit). */
  slot: HTMLElement;
  ref?: Ref<HTMLDivElement>;
}) {
  const portal = useRef(slot);
  return (
    <Html
      portal={portal}
      position={[0, AVATAR.height + AVATAR.bubbleOffset, 0]}
      zIndexRange={[20, 10]}
      style={{ pointerEvents: "none" }}
    >
      <div ref={ref} className="about-avatar-bubble" aria-hidden="true">
        {text}
      </div>
    </Html>
  );
}
