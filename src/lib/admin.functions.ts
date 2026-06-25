import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AccountInput = z.object({
  email: z.string().email().max(255),
  fullName: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "mentor", "mentee", "parent"]),
  program: z.enum(["vanguard", "flow"]).nullable().optional(),
  password: z.string().min(8).max(128).optional(),
  assignedMentorId: z.string().uuid().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

function genPassword() {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 14; i++) s += a[Math.floor(Math.random() * a.length)];
  return s + "!";
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("is_admin", { _user_id: userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

function getSiteUrl() {
  return (
    process.env.PUBLIC_SITE_URL ||
    process.env.VITE_PUBLIC_SITE_URL ||
    "https://mentorship.freebleeders.org"
  );
}

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AccountInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const password = data.password || genPassword();

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        program: data.program ?? null,
        role: data.role,
      },
    });
    if (cErr || !created.user) throw new Error(cErr?.message || "Failed to create user");
    const newId = created.user.id;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: data.role });

    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        program: data.program ?? null,
        status: "active",
      })
      .eq("id", newId);

    if (data.role === "mentee" && data.assignedMentorId) {
      await supabaseAdmin.from("mentor_assignments").insert({
        mentor_id: data.assignedMentorId,
        mentee_id: newId,
      });
    }
    if (data.role === "mentee" && data.parentId) {
      await supabaseAdmin.from("parent_links").insert({
        parent_id: data.parentId,
        child_id: newId,
      });
    }

    return { id: newId, email: data.email, tempPassword: password };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const UserIdInput = z.object({ userId: z.string().uuid() });

export const sendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UserIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error: gErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (gErr || !u.user?.email) throw new Error(gErr?.message || "User not found");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(u.user.email, {
      redirectTo: `${getSiteUrl()}/auth?reset=1`,
    });
    if (error) throw new Error(error.message);
    return { ok: true, email: u.user.email };
  });

export const unlockAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UserIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: "none",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resendLoginEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UserIdInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u, error: gErr } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (gErr || !u.user?.email) throw new Error(gErr?.message || "User not found");
    // Generate magiclink — Supabase fires the auth hook → branded email
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: u.user.email,
      options: { redirectTo: `${getSiteUrl()}/dashboard` },
    });
    if (error) throw new Error(error.message);
    return { ok: true, email: u.user.email };
  });

async function sendViaResend(
  to: string,
  subject: string,
  html: string,
  text: string,
  messageId: string,
) {
  const { getResendApiKey, getResendFrom } = await import("@/lib/config.server");
  const resendKey = getResendApiKey();
  if (!resendKey) throw new Error("RESEND_API_KEY not set — add it in Lovable project settings.");
  const from = getResendFrom();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text, headers: { "X-Message-ID": messageId } }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    let msg = (body.message as string) || (body.error as string) || `Resend HTTP ${res.status}`;
    if (res.status === 401 || /api key is invalid/i.test(msg)) {
      msg = `API key is invalid — the RESEND_API_KEY in Lovable settings is wrong or stale (key starts "${resendKey.slice(0, 5)}…", length ${resendKey.length}). Create a fresh full-access key at resend.com/api-keys, paste the FULL value, and redeploy.`;
    } else if (res.status === 403 || /domain is not verified/i.test(msg)) {
      msg = `${msg} — verify the sending domain for "${from}" at resend.com/domains.`;
    }
    throw new Error(msg);
  }
  return await res.json() as { id?: string };
}

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ to: z.string().email().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const adminEmail = u?.user?.email;
    if (!adminEmail) throw new Error("No email on file for current admin.");
    const to = data.to || adminEmail;

    const messageId = `test-${context.userId}-${Date.now()}`;
    const { render } = await import("@react-email/components");
    const React = await import("react");
    const { TEMPLATES } = await import("@/lib/email-templates/registry");
    const entry = TEMPLATES["test-email"];
    const element = React.createElement(entry.component, { recipient: to, triggeredBy: adminEmail });
    const html = await render(element);
    const text = await render(element, { plainText: true });

    let status: "sent" | "failed" = "sent";
    let errorMessage: string | null = null;
    try {
      await sendViaResend(to, "[Test] Freebleeders Mentorship Hub — Email Pipeline", html, text, messageId);
    } catch (e) {
      status = "failed";
      errorMessage = e instanceof Error ? e.message : String(e);
    }

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "test-email",
      recipient_email: to,
      status,
      error_message: errorMessage,
    });

    if (status === "failed") throw new Error(errorMessage ?? "Send failed");
    return { ok: true, email: to, messageId };
  });

// ── API diagnostics ──────────────────────────────────────────────────────────

export type DiagCheck = {
  name: string;
  category: string;
  status: "ok" | "error" | "warning" | "not_configured";
  message: string;
  detail?: string;
};

export const runApiDiagnostics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const checks: DiagCheck[] = [];

    // ── 1. Resend ────────────────────────────────────────────────────────────
    const { getResendApiKey, getResendFrom } = await import("@/lib/config.server");
    const resendKey = getResendApiKey();
    const rawResendKey = process.env.RESEND_API_KEY ?? "";
    if (!resendKey) {
      checks.push({
        name: "RESEND_API_KEY", category: "Email",
        status: "not_configured", message: "Not set",
        detail: "Add RESEND_API_KEY in Lovable → Project Settings → Environment Variables",
      });
    } else {
      // Surface common formatting problems before even hitting Resend.
      const formatNotes: string[] = [];
      if (rawResendKey !== resendKey) formatNotes.push("had surrounding quotes/whitespace (auto-trimmed)");
      if (!resendKey.startsWith("re_")) formatNotes.push('does not start with "re_" — likely not a valid Resend key');
      try {
        const res = await fetch("https://api.resend.com/domains", {
          headers: { Authorization: `Bearer ${resendKey}` },
        });
        if (res.ok) {
          const d = await res.json() as { data?: Array<{ name: string; status: string }> };
          const domains = d.data ?? [];
          const verified = domains.filter((x) => x.status === "verified");
          checks.push({
            name: "RESEND_API_KEY", category: "Email",
            status: verified.length > 0 ? "ok" : "warning",
            message: `Valid key · ${domains.length} domain(s) · ${verified.length} verified`,
            detail: domains.length
              ? domains.map((x) => `${x.name} (${x.status})`).join(", ")
              : "Key works, but NO domains added — add & verify mentorship.freebleeders.org at resend.com/domains",
          });
        } else {
          const err = await res.json().catch(() => ({})) as Record<string, unknown>;
          checks.push({
            name: "RESEND_API_KEY", category: "Email",
            status: "error",
            message: (err.message as string) || `HTTP ${res.status}`,
            detail: `Key is set (starts "${resendKey.slice(0, 5)}…", length ${resendKey.length}) but Resend rejected it. ${formatNotes.length ? "Notes: " + formatNotes.join("; ") + ". " : ""}Create a NEW full-access key at resend.com/api-keys, paste the FULL value into Lovable settings, then redeploy.`,
          });
        }
      } catch (e) {
        checks.push({
          name: "RESEND_API_KEY", category: "Email",
          status: "error", message: e instanceof Error ? e.message : "Network error",
        });
      }
    }

    // ── From address ─────────────────────────────────────────────────────────
    const fromAddr = getResendFrom();
    checks.push({
      name: "RESEND_FROM_EMAIL", category: "Email",
      status: process.env.RESEND_FROM_EMAIL ? "ok" : "warning",
      message: fromAddr,
      detail: process.env.RESEND_FROM_EMAIL
        ? "Custom from address configured — its domain must be verified in Resend"
        : "Using default — the domain mentorship.freebleeders.org must be verified in Resend",
    });

    // ── 2. Zoom ──────────────────────────────────────────────────────────────
    const zoomId = process.env.ZOOM_CLIENT_ID;
    const zoomSecret = process.env.ZOOM_CLIENT_SECRET;
    const missing = [!zoomId && "ZOOM_CLIENT_ID", !zoomSecret && "ZOOM_CLIENT_SECRET"].filter(Boolean);
    if (missing.length) {
      checks.push({
        name: "Zoom OAuth", category: "Zoom",
        status: "not_configured",
        message: `Missing: ${missing.join(", ")}`,
        detail: "Set both vars in Lovable settings — needed for calendar Zoom sessions",
      });
    } else {
      checks.push({
        name: "Zoom OAuth", category: "Zoom",
        status: "ok",
        message: "ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET configured",
        detail: `Client ID: ${zoomId!.slice(0, 8)}...`,
      });
    }

    const siteUrl = process.env.PUBLIC_SITE_URL || process.env.VITE_PUBLIC_SITE_URL;
    checks.push({
      name: "PUBLIC_SITE_URL", category: "Zoom",
      status: siteUrl ? "ok" : "warning",
      message: siteUrl || "Not set (using hardcoded default)",
      detail: siteUrl
        ? "Zoom OAuth redirect URI will use this value"
        : "Set PUBLIC_SITE_URL=https://mentorship.freebleeders.org in Lovable settings",
    });

    // ── 3. Lovable AI Gateway ────────────────────────────────────────────────
    const aiKey = process.env.LOVABLE_API_KEY;
    checks.push({
      name: "LOVABLE_API_KEY", category: "AI",
      status: aiKey ? "ok" : "not_configured",
      message: aiKey ? "Configured" : "Not set — AI email drafting unavailable",
      detail: aiKey
        ? "Used for AI-powered email draft generation"
        : "Set LOVABLE_API_KEY in Lovable settings to enable AI drafts",
    });

    // ── 4. Supabase / database ───────────────────────────────────────────────
    for (const t of ["profiles", "user_roles", "email_send_log", "sessions", "mentor_assignments"]) {
      const { count, error } = await (supabaseAdmin as any)
        .from(t).select("*", { count: "exact", head: true });
      checks.push({
        name: `Table: ${t}`, category: "Database",
        status: error ? "error" : "ok",
        message: error ? error.message : `${count ?? 0} rows`,
      });
    }

    // Recent email log entries
    const { data: logs } = await supabaseAdmin
      .from("email_send_log")
      .select("template_name, recipient_email, status, created_at, error_message")
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      checks,
      recentEmails: logs ?? [],
      timestamp: new Date().toISOString(),
    };
  });

export const hubSmokeTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

    const tableCount = async (t: string) => {
      const { count, error } = await (supabaseAdmin as any)
        .from(t)
        .select("*", { count: "exact", head: true });
      return { count: (count as number) ?? 0, error: (error as { message?: string } | null)?.message };
    };

    for (const t of ["profiles", "user_roles", "mentor_assignments", "parent_links", "sessions"]) {
      const { count, error } = await tableCount(t);
      checks.push({ name: `Table ${t}`, ok: !error, detail: error ?? `${count} rows` });
    }

    // pgmq queues (via read with batch_size 0 won't work; just probe via rpc on small batch)
    const probeQueue = async (q: string) => {
      const { error } = await supabaseAdmin.rpc("read_email_batch", {
        queue_name: q, batch_size: 0, vt: 1,
      });
      return error?.message;
    };
    for (const q of ["auth_emails", "transactional_emails"]) {
      const err = await probeQueue(q);
      checks.push({ name: `Queue ${q}`, ok: !err, detail: err ?? "reachable" });
    }

    // Recent email log
    const { data: logs } = await supabaseAdmin
      .from("email_send_log")
      .select("template_name, recipient_email, status, created_at, error_message")
      .order("created_at", { ascending: false })
      .limit(5);

    return { checks, recentEmails: logs ?? [] };
  });
