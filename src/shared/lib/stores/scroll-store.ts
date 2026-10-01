import { create } from "zustand";

interface ScrollState {
  /** Hero scroll progress 0–1; written by the hero effect, read in useFrame. */
  heroMorph: number;
  setHeroMorph: (heroMorph: number) => void;
}

export const useScrollStore = create<ScrollState>((set) => ({
  heroMorph: 0,
  setHeroMorph: (heroMorph) => set({ heroMorph })
}));
