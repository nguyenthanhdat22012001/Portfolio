import { Html } from "@react-three/drei/web/Html";
import type { Ref } from "react";
import { AVATAR } from "./avatar.config";

// DOM bubble (not canvas text); the name is already the h1, so it is
// aria-hidden. Avatar toggles data-visible each frame from the intro pose.
export function AvatarBubble({
  text,
  ref
}: {
  text: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <Html
      position={[0, AVATAR.height + AVATAR.bubbleOffset, 0]}
      zIndexRange={[20, 10]}
      style={{ pointerEvents: "none" }}
    >
      <div ref={ref} className="hero-avatar-bubble" aria-hidden="true">
        {text}
      </div>
    </Html>
  );
}
