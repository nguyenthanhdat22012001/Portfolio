// Claims that must never reappear: CV v1 numbers, and the untrue Oneloyalty
// "replaced Formik + Redux Toolkit, −14 kB (~55%)" story (Phase 6 §6.0.2).
export const BANNED = [
  // (?<![\d.]) avoids false positives on CSS such as "0.12s"
  /(?<![\d.])1[23](?:[–-]13)?\s?s\b/, // 12s, 13s, 12–13s
  /(?<![\d.])1\.8\s?s\b/,
  /(?<![\d.])1–3\s?s\b/,
  /(?<![\d.])8–9\s?s\b/,
  /\b40\+/,
  /\b12\.6k\b/,
  /\b520\+/,
  /\b8 (languages|ngôn ngữ)\b/i,
  /\b2 teams?\b/i,
  /\b5–10 (min|phút)/i,
  /\b4 tiers\b/i,
  /loom\.com/i,
  /(?<![\d.])55\s?%/,
  /~\s?55\b/,
  /(?<![\d.])14\s?kB\b/,
  // Unicode minus only: an ASCII "-14" is everywhere in Tailwind (h-14, mt-14).
  /−14\b/,
  /-14\s?kB\b/,
  /Formik \+ Redux Toolkit →/,
  /replaced Formik/i
];

export function findStale(text) {
  return BANNED.flatMap((pattern) => {
    const match = pattern.exec(text);
    return match ? [match[0]] : [];
  });
}
