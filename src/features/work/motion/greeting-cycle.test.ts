import { describe, expect, it } from "vitest";
import { greetingAt } from "./greeting-cycle";

const greetings = [
  { text: "Hello", lang: "en" },
  { text: "Xin chào", lang: "vi" },
  { text: "Bonjour", lang: "fr" }
];

describe("greetingAt", () => {
  it("returns the greeting and a filled-in counter", () => {
    expect(greetingAt(greetings, 1, "{current} / {total}")).toEqual({
      text: "Xin chào",
      lang: "vi",
      counter: "2 / 3"
    });
  });

  it("wraps past the end", () => {
    expect(greetingAt(greetings, 3, "{current} / {total}").text).toBe("Hello");
  });

  it("wraps below zero", () => {
    expect(greetingAt(greetings, -1, "{current} / {total}").text).toBe(
      "Bonjour"
    );
  });

  it("follows the locale's template", () => {
    expect(greetingAt(greetings, 0, "{current}/{total}").counter).toBe("1/3");
  });
});
