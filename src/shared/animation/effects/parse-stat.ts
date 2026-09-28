export interface ParsedStat {
  value: number;
  decimals: number;
  suffix: string;
}

// A leading number plus a digit-free suffix ("40+", "12.6k"). Ranges such as
// "1–3s" have digits in the suffix and are left alone.
export function parseStat(text: string): ParsedStat | null {
  const match = /^(\d+)(?:\.(\d+))?(\D*)$/.exec(text.trim());
  if (!match) return null;
  const [, whole = "0", fraction = "", suffix = ""] = match;
  return {
    value: Number(fraction ? `${whole}.${fraction}` : whole),
    decimals: fraction.length,
    suffix
  };
}
