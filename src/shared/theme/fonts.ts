import { Google_Sans_Code, Open_Sans } from "next/font/google";

export const fontSans = Open_Sans({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-open-sans"
});

export const fontMono = Google_Sans_Code({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-google-sans-code",
  // Next has no precomputed metrics for this family yet, so it can't build an
  // adjusted fallback; say so explicitly and name a sensible system stack.
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
});
