import type { LighthouseScores } from "@/shared/lib/site";

export type { LighthouseScores };

const MAX_AGE_DAYS = 90;

// The footer is static, so `now` is build time: stale scores disappear on
// the next deploy.
export function lighthouseToShow(
  scores: LighthouseScores | null,
  now: Date
): LighthouseScores | null {
  if (!scores) return null;
  const ageDays =
    (now.getTime() - new Date(scores.measuredAt).getTime()) / 86_400_000;
  return ageDays <= MAX_AGE_DAYS ? scores : null;
}
