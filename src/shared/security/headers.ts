// Static security headers for every route (Phase 6 §6.5), applied by
// next.config.ts. Static, not nonce-based: a nonce would force every page
// to render dynamically. Pure so each environment is unit-tested.
export type SecurityEnv = "development" | "preview" | "production";

type Env = Record<string, string | undefined>;

export function securityEnv(env: Env = process.env): SecurityEnv {
  if (env.NODE_ENV === "development") return "development";
  return env.VERCEL_ENV === "production" ? "production" : "preview";
}

// Third-party hosts. Remove one only when a network capture from a real
// deployment shows it unused; never add a wildcard.
const UMAMI = "https://cloud.umami.is";
const UMAMI_API = "https://api-gateway.umami.dev";
// Where the Cloud tracker posts events: `${data-host-url ||
// "https://gateway.umami.is"}/api/send` (e2e/fixtures/umami-script.js).
const UMAMI_GATEWAY = "https://gateway.umami.is";
const VERCEL_SCRIPTS = "https://va.vercel-scripts.com";
const VERCEL_VITALS = "https://vitals.vercel-insights.com";

export function contentSecurityPolicy(mode: SecurityEnv): string {
  const dev = mode === "development";
  const directives: string[][] = [
    ["default-src", "'self'"],
    [
      "script-src",
      "'self'",
      // Next's inline bootstrap and the theme script on static pages.
      "'unsafe-inline'",
      // The meshopt decoder for avatar.glb is WebAssembly.
      "'wasm-unsafe-eval'",
      // React dev tooling only; production never evals.
      ...(dev ? ["'unsafe-eval'"] : []),
      UMAMI,
      VERCEL_SCRIPTS
    ],
    ["style-src", "'self'", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:"],
    ["font-src", "'self'"],
    [
      "connect-src",
      "'self'",
      // GLTFLoader fetches embedded GLB textures from blob: URLs.
      "blob:",
      // HMR websocket; Safari doesn't treat ws: as 'self'.
      ...(dev ? ["ws:"] : []),
      UMAMI,
      UMAMI_GATEWAY,
      UMAMI_API,
      VERCEL_VITALS
    ],
    ["worker-src", "'self'", "blob:"],
    ["frame-ancestors", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["object-src", "'none'"],
    // Over http://localhost (e2e, local Lighthouse) this would break
    // subresources in some browsers.
    ...(mode === "production" ? [["upgrade-insecure-requests"]] : [])
  ];
  return directives.map((parts) => parts.join(" ")).join("; ");
}

export function securityHeaders(
  mode: SecurityEnv
): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(mode) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // No interest-cohort: Chrome logs it as an unrecognized feature, which
    // costs the Lighthouse Best Practices score.
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()"
    },
    { key: "X-Frame-Options", value: "DENY" },
    ...(mode === "production"
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          }
        ]
      : [])
  ];
}

// Lighthouse's resource-summary counts response headers in a script's
// transfer size, and CSP/frame/permissions headers do nothing on a JS file.
// Hashed assets under /_next/static/ therefore get only nosniff.
export function securityHeaderRules(
  mode: SecurityEnv
): { source: string; headers: { key: string; value: string }[] }[] {
  return [
    { source: "/:path((?!_next/static/).*)", headers: securityHeaders(mode) },
    {
      source: "/_next/static/:path*",
      headers: [{ key: "X-Content-Type-Options", value: "nosniff" }]
    }
  ];
}
