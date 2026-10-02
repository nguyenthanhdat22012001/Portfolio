import { createStore } from "zustand/vanilla";
import {
  detectTier,
  downgradeTier,
  type RenderTier,
  type TierEnv
} from "./detect-tier";

interface QualityState {
  /** Device tier for this session; null until a canvas gate asks. */
  level: RenderTier | null;
  /** Detects once; later calls return the current (maybe downgraded) level. */
  init(env: TierEnv): RenderTier;
  /** One step down (High → Medium → Low). Nothing ever steps up. */
  downgrade(): void;
}

// One store for both canvases (Hero graph, About avatar): a decline in either
// lowers both. Vanilla so the About gate in the initial bundle can read it
// without React bindings; canvases subscribe with zustand's useStore.
export const qualityStore = createStore<QualityState>((set, get) => ({
  level: null,
  init(env) {
    const current = get().level;
    if (current) return current;
    const level = detectTier(env);
    set({ level });
    return level;
  },
  downgrade() {
    const { level } = get();
    if (level) set({ level: downgradeTier(level) });
  }
}));
