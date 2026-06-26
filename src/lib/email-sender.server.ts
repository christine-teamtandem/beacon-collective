/**
 * Server-only unified email sender.
 *
 * This app's primary delivery path is the **Lovable email connector**
 * (`@lovable.dev/email-js` → sendLovableEmail), authenticated with
 * LOVABLE_API_KEY. Lovable connector keys start with `lovc_`.
 *
 * Common misconfiguration: pasting the `lovc_` connector key into
 * RESEND_API_KEY and sending it straight to api.resend.com — Resend only
 * accepts keys that start with `re_`, so it returns "API key is invalid".
 *
 * This helper is format-aware and picks the right transport automatically:
 *   1. A Lovable key (LOVABLE_API_KEY, or a `lovc_` value mistakenly placed in
 *      RESEND_API_KEY) → send via the Lovable connector.
 *   2. A real Resend key (`re_…` in RESEND_API_KEY) → send direct to Resend.
 *   3. Neither → return a clear, actionable error.
 */
import { sanitizeEnv } from "@/lib/config.server";
import { BRAND_FROM_EMAIL, BRAND_NAME } from "@/lib/brand";

// Verified sender identity (must match the domain delegated to Lovable / Resend).
export const SITE_NAME = BRAND_NAME;
export const FROM_DOMAIN = "mentorship.freebleeders.org";
export const SENDER_DOMAIN = "notify.mentorship.freebleeders.org";
export const DEFAULT_FROM = BRAND_FROM_EMAIL;

export type EmailCredentialKind = "lovable" | "resend" | "none";

export function resolveEmailCredential(): { kind: EmailCredentialKind; key: string } {
  const lovableExplicit = sanitizeEnv(process.env.LOVABLE_API_KEY);
  if (lovableExplicit) return { kind: "lovable", key: lovableExplicit };

  // A lovc_ key wrongly stored in RESEND_API_KEY is still a Lovable key.
  const resendVar = sanitizeEnv(process.env.RESEND_API_KEY);
  if (resendVar.startsWith("lovc_")) return { kind: "lovable", key: resendVar };
  if (resendVar.startsWith("re_")) return { kind: "resend", key: resendVar };

  return { kind: "none", key: "" };
}

export interface SendBrandedEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  messageId: string;
  from?: string;
  label?: string;
  unsubscribeToken?: string;
}

export type SendResult = { ok: boolean; error?: string; transport: EmailCredentialKind };

export async function sendBrandedEmail(input: SendBrandedEmailInput): Promise<SendResult> {
  const { kind, key } = resolveEmailCredential();
  const from = input.from || DEFAULT_FROM;

  if (kind === "lovable") {
    try {
      const { sendLovableEmail } = await import("@lovable.dev/email-js");
      await sendLovableEmail(
        {
          to: input.to,
          from,
          sender_domain: SENDER_DOMAIN,
          subject: input.subject,
          html: input.html,
          text: input.text,
          purpose: "transactional",
          label: input.label ?? "composed-message",
          idempotency_key: input.messageId,
          unsubscribe_token: input.unsubscribeToken,
          message_id: input.messageId,
        },
        { apiKey: key, sendUrl: process.env.LOVABLE_SEND_URL },
      );
      return { ok: true, transport: "lovable" };
    } catch (e) {
      return { ok: false, transport: "lovable", error: e instanceof Error ? e.message : String(e) };
    }
  }

  if (kind === "resend") {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [input.to],
          subject: input.subject,
          html: input.html,
          text: input.text,
          headers: { "X-Message-ID": input.messageId },
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        let msg = (body.message as string) || (body.error as string) || `Resend HTTP ${res.status}`;
        if (res.status === 403 || /domain is not verified/i.test(msg)) {
          msg = `${msg} — verify ${FROM_DOMAIN} at resend.com/domains.`;
        }
        return { ok: false, transport: "resend", error: msg };
      }
      return { ok: true, transport: "resend" };
    } catch (e) {
      return { ok: false, transport: "resend", error: e instanceof Error ? e.message : String(e) };
    }
  }

  return {
    ok: false,
    transport: "none",
    error:
      "No email credentials configured. Set LOVABLE_API_KEY (your lovc_… connector key) in Lovable settings — this app sends through the Lovable email connector. A raw Resend re_ key in RESEND_API_KEY also works.",
  };
}
