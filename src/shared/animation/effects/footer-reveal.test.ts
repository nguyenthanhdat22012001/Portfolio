import { afterEach, describe, expect, it } from "vitest";
import { createFakeContext, placeBelowFold } from "../testing/fake-libs";
import { footerReveal } from "./footer-reveal";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("footerReveal", () => {
  it("leaves an on-screen footer alone", () => {
    const el = document.createElement("footer");
    document.body.append(el);
    const { ctx, gsap } = createFakeContext();
    footerReveal.run(el, ctx);
    expect(gsap.from).not.toHaveBeenCalled();
  });

  it("slides a below-the-fold footer up", () => {
    const el = document.createElement("footer");
    document.body.append(el);
    placeBelowFold(el);
    const { ctx, gsap } = createFakeContext();
    footerReveal.run(el, ctx);
    expect(gsap.from).toHaveBeenCalledWith(
      el,
      expect.objectContaining({
        y: 40,
        opacity: 0,
        scrollTrigger: expect.objectContaining({ trigger: el, once: true })
      })
    );
  });
});
