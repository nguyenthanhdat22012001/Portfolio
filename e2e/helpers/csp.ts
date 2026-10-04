import type { Page } from "@playwright/test";

// securitypolicyviolation fires in every engine; console wording does not.
const COLLECT = `window.__csp=[];document.addEventListener("securitypolicyviolation",function(e){window.__csp.push(e.violatedDirective+" "+e.blockedURI)})`;

export async function watchCsp(page: Page) {
  await page.addInitScript(COLLECT);
}

export function cspViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as { __csp?: string[] }).__csp ?? []);
}

// Hosts other than the page's own that the page requested, for the CSP
// host review on a real deployment.
export function thirdPartyHosts(page: Page, baseURL: string): () => string[] {
  const own = new URL(baseURL).host;
  const hosts = new Set<string>();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.host !== own) hosts.add(url.host);
  });
  return () => [...hosts].sort();
}
