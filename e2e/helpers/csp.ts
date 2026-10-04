import type { Page } from "@playwright/test";

// securitypolicyviolation fires in every engine; console wording does not.
const COLLECT = `window.__csp=[];document.addEventListener("securitypolicyviolation",function(e){window.__csp.push(e.violatedDirective+" "+e.blockedURI)})`;

export async function watchCsp(page: Page) {
  await page.addInitScript(COLLECT);
}

// Throws when the collector never ran, so a missing watchCsp (or a blocked
// init script) can't pass as "no violations".
export async function cspViolations(page: Page): Promise<string[]> {
  const violations = await page.evaluate(
    () => (window as { __csp?: string[] }).__csp
  );
  if (!violations) {
    throw new Error("CSP collector missing: call watchCsp(page) before goto");
  }
  return violations;
}

// Hosts other than the page's own that the page requested, for the CSP
// host review on a real deployment.
export function thirdPartyHosts(page: Page, baseURL: string): () => string[] {
  const own = new URL(baseURL).host;
  const hosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.host !== own)
      hosts.add(url.host);
  });
  return () => [...hosts].sort();
}
