import { gzipSync } from "node:zlib";
import type { Page, Response } from "@playwright/test";

const SCRIPT = /\/_next\/static\/[^"'\s)]+\.js/g;

// Records every Next script response. Scripts named in the document HTML
// are "initial"; anything else was loaded later (dynamic chunks).
export function trackScripts(page: Page) {
  const responses: Response[] = [];
  let initial = new Set<string>();
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "script" &&
      response.url().includes("/_next/static/")
    ) {
      responses.push(response);
    }
  });
  return {
    async goto(path: string) {
      const response = await page.goto(path);
      const html = (await response?.text()) ?? "";
      initial = new Set(html.match(SCRIPT) ?? []);
    },
    lazy: () =>
      responses.filter((r) => !initial.has(new URL(r.url()).pathname)),
    initial: () =>
      responses.filter((r) => initial.has(new URL(r.url()).pathname))
  };
}

export async function gzipBytes(responses: Response[]): Promise<number> {
  const bodies = await Promise.all(responses.map((r) => r.body()));
  return bodies.reduce((sum, body) => sum + gzipSync(body).length, 0);
}

// Known noise: software-GL driver perf hints (SwiftShader).
const IGNORED = [/GL Driver Message/];

export function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (
      (message.type() === "error" || message.type() === "warning") &&
      !IGNORED.some((pattern) => pattern.test(message.text()))
    ) {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

// The avatar's lazy chunk (webpackChunkName "hero-avatar") and any vendor
// chunk webpack split out of it, recognised by GLTFLoader's extension name.
export async function splitAvatarChunks(
  responses: Response[]
): Promise<{ avatar: Response[]; rest: Response[] }> {
  const avatar: Response[] = [];
  const rest: Response[] = [];
  for (const response of responses) {
    const named = /\/hero-avatar\.[^/]+\.js$/.test(
      new URL(response.url()).pathname
    );
    const isAvatar =
      named || (await response.text()).includes("KHR_mesh_quantization");
    (isAvatar ? avatar : rest).push(response);
  }
  return { avatar, rest };
}
