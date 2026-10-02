import { AboutAvatarGate } from "./AboutAvatarGate";
import { AvatarFallback } from "./AvatarFallback";

// Server shell in the portrait's place (spec §2): fixed size from SSR so
// nothing shifts; decorative, since the About heading and text carry the
// meaning. The gate adds the 3D canvas near About.
export function AboutAvatarSlot({ bubble }: { bubble: string }) {
  return (
    <div
      id="about-avatar-slot"
      data-avatar-slot=""
      aria-hidden="true"
      className="about-avatar-slot bg-bg-elevated rounded-card relative h-80 w-full md:col-span-4 md:aspect-[4/5] md:h-auto md:max-h-[560px] md:self-start"
    >
      <AvatarFallback />
      <AboutAvatarGate bubble={bubble} />
    </div>
  );
}
