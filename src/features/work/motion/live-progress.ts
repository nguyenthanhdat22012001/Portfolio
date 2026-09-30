export type StepState = "pending" | "running" | "failed" | "done";

// 4 steps × 0.2 = 0.8; 0.8 → 1 is reserved for the result counting up.
export const STEP_SPAN = 0.2;
export const RESULT_START = 0.8;
export const RESULT_PERCENT = 20;

// Pure, so scrubbing backwards simply recomputes the earlier state — no
// timeline callbacks that fail to reverse.
export function stateAt(p: number, i: number, failOnce: boolean): StepState {
  const t = p / STEP_SPAN - i; // 0 → 1 across step i's segment
  if (t <= 0) return "pending";
  if (t >= 1) return "done";
  if (failOnce && t > 0.35 && t < 0.6) return "failed";
  return "running";
}

export function resultAt(p: number): number {
  const t = (p - RESULT_START) / (1 - RESULT_START);
  return Math.round(Math.min(Math.max(t, 0), 1) * RESULT_PERCENT);
}
