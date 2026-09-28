// The old Swift load time the timer runs up to before the rebuild lands.
const BEFORE_SECONDS = 12;

export function formatSwiftTimer(
  progress: number,
  totalSeconds = BEFORE_SECONDS
): string {
  const clamped = Math.min(1, Math.max(0, progress));
  return `${(clamped * totalSeconds).toFixed(1)}s`;
}
