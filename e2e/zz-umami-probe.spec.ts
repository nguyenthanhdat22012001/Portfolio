// TEMPORARY diagnostic (delete after one CI run): records which event makes
// the Umami loader inject its script before any input on mobile emulation.
// Results go to stdout and the GitHub job summary.
import { appendFileSync } from "node:fs";
import { test } from "@playwright/test";

const SRC = "https://cloud.umami.is/script.js";

test("UMAMI-PROBE: events before the first input", async ({
  page
}, testInfo) => {
  test.setTimeout(120_000);
  await page.route(SRC, (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" })
  );
  await page.addInitScript(() => {
    const log: string[] = [];
    (window as unknown as { __probe: string[] }).__probe = log;
    const t0 = performance.now();
    const stamp = () =>
      `t=${Math.round(performance.now() - t0)} ready=${document.readyState} y=${scrollY} x=${scrollX} inner=${innerWidth}x${innerHeight} vv=${visualViewport ? `${Math.round(visualViewport.width)}x${Math.round(visualViewport.height)}@${visualViewport.scale}` : "-"}`;
    const types = [
      "scroll",
      "pointermove",
      "pointerdown",
      "keydown",
      "touchstart",
      "click",
      "resize",
      "wheel"
    ];
    for (const type of types) {
      window.addEventListener(
        type,
        (event) => {
          const target =
            event.target === window
              ? "window"
              : event.target === document
                ? "document"
                : (event.target as Element)?.nodeName ?? "?";
          const stack = event.isTrusted
            ? ""
            : ` stack=${(new Error().stack ?? "").split("\n").slice(2, 6).join(" | ")}`;
          log.push(
            `${type} target=${target} trusted=${event.isTrusted} ${stamp()}${stack}`
          );
        },
        { capture: true, passive: true }
      );
    }
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (
            node instanceof HTMLScriptElement &&
            node.src.includes("umami")
          ) {
            log.push(`UMAMI SCRIPT INJECTED ${stamp()}`);
          }
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });

  const lines: string[] = [];
  let early = 0;
  const runs = 10;
  for (let run = 0; run < runs; run += 1) {
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
    const log = await page.evaluate(
      () => (window as unknown as { __probe: string[] }).__probe
    );
    const injected = log.some((line) => line.startsWith("UMAMI SCRIPT"));
    if (injected) early += 1;
    lines.push(`run ${run} injected=${injected}`, ...log.map((l) => `  ${l}`));
  }

  const report = [
    `### UMAMI-PROBE [${testInfo.project.name}]: injected before input in ${early}/${runs} runs`,
    "```",
    ...lines,
    "```",
    ""
  ].join("\n");
  console.log(report);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  }
});
