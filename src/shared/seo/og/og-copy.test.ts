import { describe, expect, it } from "vitest";
import { getWork } from "@/shared/content";

// The OG font (OpenSans-Bold) has "−", "≤", "~", and "·" but no arrow
// glyphs; an arrow in OG copy would render as a blank box.
const MISSING_GLYPHS = /[→↗←↓]/;

describe("OG card copy", () => {
  it.each(getWork("en").map(({ doc }) => [doc.slug, doc] as const))(
    "%s uses only glyphs the OG font has",
    (_slug, doc) => {
      const headline = doc.metrics[0];
      expect(`${doc.title} ${headline?.value} ${headline?.label}`).not.toMatch(
        MISSING_GLYPHS
      );
    }
  );
});
