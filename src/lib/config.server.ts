import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// When to use which env-access pattern:
//   - .server.ts module (this file): server-only helpers reused across
//     handlers. Wrap reads in a function so they run per-request.
//   - inline process.env inside a createServerFn handler: one-off reads
//     not reused elsewhere.
//   - import.meta.env.VITE_FOO: PUBLIC config readable from both client
//     and server (analytics IDs, public URLs). Define in .env with the
//     VITE_ prefix. Never put secrets here — they ship to the browser.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    // Add server-only values here, e.g.:
    //   databaseUrl: process.env.DATABASE_URL,
    //   stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  };
}

/**
 * Strip the junk that commonly sneaks into env-var values pasted through a
 * dashboard UI: surrounding single/double quotes, backticks, leading/trailing
 * whitespace, and stray newlines/carriage-returns. A trailing newline or a
 * pair of quotes is enough to make Resend reject a perfectly good key with
 * "API key is invalid".
 */
export function sanitizeEnv(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^['"`]+/, "")
    .replace(/['"`]+$/, "")
    .replace(/[\r\n\t]/g, "")
    .trim();
}

/** Sanitized Resend API key (read per-request — never at module scope). */
export function getResendApiKey(): string {
  return sanitizeEnv(process.env.RESEND_API_KEY);
}

/** Sanitized Resend "from" envelope, with a safe branded default. */
export function getResendFrom(): string {
  return (
    sanitizeEnv(process.env.RESEND_FROM_EMAIL) ||
    "Freebleeders Mentorship Hub <noreply@mentorship.freebleeders.org>"
  );
}

/** Public site URL, sanitized and without a trailing slash. */
export function getSiteUrl(): string {
  const raw =
    sanitizeEnv(process.env.PUBLIC_SITE_URL) ||
    sanitizeEnv(process.env.VITE_PUBLIC_SITE_URL) ||
    "https://mentorship.freebleeders.org";
  return raw.replace(/\/+$/, "");
}

/** The exact Zoom OAuth redirect URI — must match the Zoom app config byte-for-byte. */
export function getZoomRedirectUri(): string {
  return `${getSiteUrl()}/api/public/zoom/callback`;
}

/** Sanitized Zoom OAuth credentials. */
export function getZoomCredentials(): { clientId: string; clientSecret: string } {
  return {
    clientId: sanitizeEnv(process.env.ZOOM_CLIENT_ID),
    clientSecret: sanitizeEnv(process.env.ZOOM_CLIENT_SECRET),
  };
}
