// Mirrors the custom properties in src/app/globals.css; tokens.test.ts
// fails if the two drift apart or a text pair drops below WCAG AA.
export const themes = ["dark", "light"] as const;

export type Theme = (typeof themes)[number];

export type ColorToken =
  | "bg"
  | "bg-elevated"
  | "bg-muted"
  | "fg"
  | "fg-muted"
  | "accent"
  | "accent-fg"
  | "earth"
  | "silver"
  | "border";

export const colorTokens: Record<Theme, Record<ColorToken, string>> = {
  dark: {
    bg: "#1A1A1C",
    "bg-elevated": "#242427",
    "bg-muted": "#3A3A40",
    fg: "#E6E6E3",
    "fg-muted": "#9A9A9A",
    accent: "#C9A227",
    "accent-fg": "#1A1A1C",
    earth: "#8B5E3C",
    silver: "#A8ACB2",
    border: "#34343A"
  },
  light: {
    bg: "#F5F4F0",
    "bg-elevated": "#FFFFFF",
    "bg-muted": "#E6E3DA",
    fg: "#1F1F21",
    "fg-muted": "#5E5E5E",
    accent: "#8A6A10",
    "accent-fg": "#FFFFFF",
    earth: "#6E4A2F",
    silver: "#868A90",
    border: "#DDDAD2"
  }
};
