import { describe, expect, it } from "vitest";
import { linkTarget, trackAttrs } from "./events";

describe("trackAttrs", () => {
  it("marks a prop-less event", () => {
    expect(trackAttrs("cta_view_work")).toEqual({
      "data-track": "cta_view_work"
    });
  });

  it("adds one data-track-<key> attribute per prop", () => {
    expect(trackAttrs("cv_download", { location: "hero" })).toEqual({
      "data-track": "cv_download",
      "data-track-location": "hero"
    });
    expect(trackAttrs("outbound_click", { target: "appStore" })).toEqual({
      "data-track": "outbound_click",
      "data-track-target": "appStore"
    });
  });
});

describe("linkTarget", () => {
  it("names a case study's source link apart from the GitHub profile", () => {
    expect(linkTarget).toEqual({
      appStore: "appStore",
      live: "live",
      github: "source",
      demo: "demo"
    });
  });
});
