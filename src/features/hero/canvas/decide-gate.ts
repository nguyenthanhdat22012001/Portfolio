import { DESKTOP_QUERY, REDUCE_QUERY } from "@/shared/animation/media";

export interface GateEnv {
  reduceMotion: boolean;
  hasWebGL: boolean;
  saveData: boolean;
  /** DESKTOP_QUERY: ≥ 768px, hover, fine pointer. Lighthouse mobile never is. */
  isDesktop: boolean;
}

export type GateDecision = "fallback" | "wait-idle" | "wait-interaction";

export function decideGate(env: GateEnv): GateDecision {
  if (env.reduceMotion || !env.hasWebGL || env.saveData) return "fallback";
  return env.isDesktop ? "wait-idle" : "wait-interaction";
}

// Creates a throwaway context and releases it at once, so the probe never
// counts as a second live WebGL context next to the canvas.
export function probeWebGL(doc: Document = document): boolean {
  try {
    const canvas = doc.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function readGateEnv(win: Window = window): GateEnv {
  const nav = win.navigator as Navigator & {
    connection?: { saveData?: boolean };
  };
  const reduceMotion = win.matchMedia(REDUCE_QUERY).matches;
  return {
    reduceMotion,
    // Skip the probe when the answer is already "fallback".
    hasWebGL: reduceMotion ? false : probeWebGL(win.document),
    saveData: nav.connection?.saveData === true,
    isDesktop: win.matchMedia(DESKTOP_QUERY).matches
  };
}
