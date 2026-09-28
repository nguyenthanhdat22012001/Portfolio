import { afterEach, describe, expect, it } from "vitest";
import { createFakeContext, placeBelowFold } from "../testing/fake-libs";
import { reveal } from "./reveal";

function mount() {
  const el = document.createElement("p");
  el.textContent = "Front-End Engineer";
  document.body.append(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("reveal", () => {
  it("leaves on-screen text alone", () => {
    const el = mount();
    const { ctx, SplitText } = createFakeContext();
    reveal.run(el, ctx);
    expect(SplitText.create).not.toHaveBeenCalled();
  });

  it("splits below-the-fold text into accessible lines and reveals them once", () => {
    const el = mount();
    placeBelowFold(el);
    const { ctx, SplitText, gsap } = createFakeContext();
    reveal.run(el, ctx);

    expect(SplitText.create).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ type: "lines", mask: "lines", aria: "auto" })
    );
    const { onSplit } = SplitText.create.mock.calls[0]?.[1] as {
      onSplit: (self: { lines: Element[] }) => unknown;
    };
    const line = document.createElement("span");
    onSplit({ lines: [line] });
    expect(gsap.from).toHaveBeenCalledWith(
      [line],
      expect.objectContaining({
        scrollTrigger: expect.objectContaining({ trigger: el, once: true })
      })
    );
  });
});
