import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AboutAvatarSlot } from "./AboutAvatarSlot";

describe("AboutAvatarSlot", () => {
  it("is a decorative, fixed-size slot holding the fallback images", () => {
    const host = document.createElement("div");
    host.innerHTML = renderToStaticMarkup(<AboutAvatarSlot />);
    const slot = host.querySelector<HTMLElement>("#about-avatar-slot")!;
    expect(slot.getAttribute("aria-hidden")).toBe("true");
    expect(slot.hasAttribute("data-avatar-slot")).toBe(true);
    expect(slot.className).toContain("h-80");
    expect(slot.className).toContain("md:aspect-[4/5]");
    expect(slot.querySelectorAll(".about-avatar-fallback img")).toHaveLength(2);
    expect(host.textContent).toBe(""); // no visible copy, no alt text
  });
});
