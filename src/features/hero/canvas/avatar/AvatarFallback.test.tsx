import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AVATAR } from "./avatar.config";
import { AvatarFallback } from "./AvatarFallback";
import { avatarFrame } from "./choreography";

function render() {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<AvatarFallback />);
  return host.querySelector<HTMLElement>(".hero-avatar-fallback")!;
}

describe("AvatarFallback", () => {
  it("renders a decorative wave/idle image pair with fixed sizes", () => {
    const root = render();
    const images = [...root.querySelectorAll("img")];
    expect(images.map((img) => img.dataset.avatarPose)).toEqual([
      "wave",
      "idle"
    ]);
    for (const img of images) {
      const pose = img.dataset.avatarPose as "wave" | "idle";
      expect(img.getAttribute("alt")).toBe("");
      expect(img.getAttribute("src")).toBe(AVATAR.fallback[pose].src);
      expect(img.getAttribute("width")).toBe(
        String(AVATAR.fallback[pose].width)
      );
      expect(img.getAttribute("height")).toBe(
        String(AVATAR.fallback[pose].height)
      );
      expect(img.getAttribute("decoding")).toBe("async");
      expect(img.getAttribute("fetchpriority")).toBe("low");
    }
  });

  it("stands where the 3D avatar would, using the shared placement math", () => {
    const style = render().style;
    const left = (aspect: number) =>
      `${avatarFrame(aspect).leftPct.toFixed(2)}%`;
    expect(style.getPropertyValue("--avatar-left-sm")).toBe(
      left(AVATAR.slotAspect.sm)
    );
    expect(style.getPropertyValue("--avatar-left-md")).toBe(
      left(AVATAR.slotAspect.md)
    );
    expect(style.getPropertyValue("--avatar-bottom")).toBe("15.00%");
    expect(style.getPropertyValue("--avatar-h-md")).toBe("70.00%");
    expect(style.getPropertyValue("--avatar-h-sm")).toBe("55.00%");
    expect(style.getPropertyValue("--avatar-swap")).toBe("2s");
  });
});
