import { tierFeatures, type RenderTier } from "../quality/detect-tier";
import { AvatarMount } from "./avatar/AvatarMount";
import { CameraRig } from "./CameraRig";
import { Graph } from "./Graph";

export function HeroScene({
  tier,
  slot,
  avatarBubble
}: {
  tier: RenderTier;
  slot: HTMLElement;
  avatarBubble: string;
}) {
  return (
    <>
      <CameraRig parallax={tierFeatures(tier).parallax} slot={slot} />
      <Graph tier={tier} slot={slot} />
      <AvatarMount tier={tier} slot={slot} bubble={avatarBubble} />
    </>
  );
}
