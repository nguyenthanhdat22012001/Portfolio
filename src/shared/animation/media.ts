// Shared media queries. Kept apart from engine.ts so code in the initial
// bundle (the hero canvas gate) can use them without pulling in the engine.
export const DESKTOP_QUERY =
  "(min-width: 768px) and (hover: hover) and (pointer: fine)";
export const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";
