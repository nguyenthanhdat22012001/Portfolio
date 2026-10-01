export type Vec3 = [number, number, number];

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Frame-rate independent exponential smoothing; the same formula as
// THREE.MathUtils.damp, kept here so pure code needn't import three.
export function damp(
  current: number,
  target: number,
  lambda: number,
  dt: number
): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function damp3(
  current: Vec3,
  target: Readonly<Vec3>,
  lambda: number,
  dt: number
): void {
  const t = 1 - Math.exp(-lambda * dt);
  current[0] += (target[0] - current[0]) * t;
  current[1] += (target[1] - current[1]) * t;
  current[2] += (target[2] - current[2]) * t;
}
