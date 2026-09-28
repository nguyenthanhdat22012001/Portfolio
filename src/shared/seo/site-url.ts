type Env = Record<string, string | undefined>;

// The one place the site origin is decided. A live deploy must never emit
// localhost canonicals, so production without an explicit URL is an error.
export function getSiteUrl(env: Env = process.env): string {
  const explicit = env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  if (env.VERCEL_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must be set for production deployments"
    );
  }

  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;

  return "http://localhost:3000";
}
