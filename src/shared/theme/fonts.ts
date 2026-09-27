import { Google_Sans_Code, Open_Sans } from "next/font/google";

export const fontSans = Open_Sans({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-open-sans"
});

export const fontMono = Google_Sans_Code({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-google-sans-code"
});
