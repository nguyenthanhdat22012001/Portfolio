import { describe, expect, it } from "vitest";
import {
  contentSecurityPolicy,
  securityEnv,
  securityHeaderRules,
  securityHeaders,
  type SecurityEnv
} from "./headers";

const header = (mode: SecurityEnv, key: string) =>
  securityHeaders(mode).find((h) => h.key === key)?.value;

describe("securityEnv", () => {
  it("is development under next dev", () => {
    expect(securityEnv({ NODE_ENV: "development" })).toBe("development");
  });
  it("is production only on a Vercel production build", () => {
    expect(
      securityEnv({ NODE_ENV: "production", VERCEL_ENV: "production" })
    ).toBe("production");
  });
  it("is preview for Vercel previews, CI and local next start", () => {
    expect(securityEnv({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(
      "preview"
    );
    expect(securityEnv({ NODE_ENV: "production" })).toBe("preview");
  });
});

describe("contentSecurityPolicy", () => {
  const modes: SecurityEnv[] = ["development", "preview", "production"];

  it.each(modes)("%s has every fixed directive", (mode) => {
    const csp = contentSecurityPolicy(mode);
    for (const directive of [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'"
    ]) {
      expect(csp).toContain(directive);
    }
    expect(csp).toMatch(
      /script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'.* https:\/\/cloud\.umami\.is https:\/\/va\.vercel-scripts\.com/
    );
    expect(csp).toContain("connect-src 'self' blob:");
    // The Cloud tracker sends to gateway.umami.is/api/send.
    expect(csp).toMatch(/connect-src [^;]*https:\/\/gateway\.umami\.is/);
    expect(csp).toContain("https://api-gateway.umami.dev");
    expect(csp).toContain("https://vitals.vercel-insights.com");
  });

  it("allows 'unsafe-eval' and ws: only in development", () => {
    expect(contentSecurityPolicy("development")).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy("development")).toContain(" ws:");
    for (const mode of ["preview", "production"] as const) {
      expect(contentSecurityPolicy(mode)).not.toContain("'unsafe-eval'");
      expect(contentSecurityPolicy(mode)).not.toContain(" ws:");
    }
  });

  it("upgrades insecure requests only in production", () => {
    expect(contentSecurityPolicy("production")).toContain(
      "upgrade-insecure-requests"
    );
    expect(contentSecurityPolicy("preview")).not.toContain("upgrade-insecure");
    expect(contentSecurityPolicy("development")).not.toContain(
      "upgrade-insecure"
    );
  });
});

describe("securityHeaders", () => {
  it("sets the fixed headers in every mode", () => {
    for (const mode of ["development", "preview", "production"] as const) {
      expect(header(mode, "X-Content-Type-Options")).toBe("nosniff");
      expect(header(mode, "Referrer-Policy")).toBe(
        "strict-origin-when-cross-origin"
      );
      expect(header(mode, "Permissions-Policy")).toBe(
        "camera=(), microphone=(), geolocation=()"
      );
      expect(header(mode, "X-Frame-Options")).toBe("DENY");
      expect(header(mode, "Content-Security-Policy")).toBe(
        contentSecurityPolicy(mode)
      );
    }
  });

  it("never lists interest-cohort (Chrome logs it as an error)", () => {
    expect(header("production", "Permissions-Policy")).not.toContain(
      "interest-cohort"
    );
  });

  it("sends HSTS only in production", () => {
    expect(header("production", "Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );
    expect(header("preview", "Strict-Transport-Security")).toBeUndefined();
    expect(header("development", "Strict-Transport-Security")).toBeUndefined();
  });
});

describe("securityHeaderRules", () => {
  it.each(["development", "preview", "production"] as SecurityEnv[])(
    "%s: full headers on documents, only nosniff on static assets",
    (mode) => {
      const rules = securityHeaderRules(mode);
      expect(rules).toHaveLength(2);
      expect(rules[0]!.headers).toEqual(securityHeaders(mode));
      expect(rules[1]!.source).toBe("/_next/static/:path*");
      expect(rules[1]!.headers).toEqual([
        { key: "X-Content-Type-Options", value: "nosniff" }
      ]);
    }
  );
});
