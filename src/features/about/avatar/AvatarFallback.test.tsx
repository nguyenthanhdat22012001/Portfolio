import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AVATAR } from "./avatar.config";
import { AvatarFallback } from "./AvatarFallback";

function render() {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<AvatarFallback />);
  return host.querySelector<HTMLElement>(".about-avatar-fallback")!;
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
      expect(img.getAttribute("loading")).toBe("lazy");
      expect(img.getAttribute("decoding")).toBe("async");
      expect(img.getAttribute("fetchpriority")).toBe("low");
    }
  });

  it("stands where the 3D avatar's feet land (same config as aboutFrame)", () => {
    const style = render().style;
    expect(style.getPropertyValue("--avatar-bottom")).toBe("6.00%");
    expect(style.getPropertyValue("--avatar-h")).toBe("80.00%");
    expect(style.getPropertyValue("--avatar-swap")).toBe("2s");
    expect(style.getPropertyValue("--avatar-idle-anchor")).toBe("0.5");
  });
});
