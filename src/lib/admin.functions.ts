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

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = u?.user?.email;
    if (!email) throw new Error("No email on file for current admin.");

    const messageId = `test-${context.userId}-${Date.now()}`;
    // Render via the public send route would require JWT; we shortcut by
    // enqueuing through the registry-rendered HTML directly.
    const { render } = await import("@react-email/components");
    const React = await import("react");
    const { TEMPLATES } = await import("@/lib/email-templates/registry");
    const entry = TEMPLATES["test-email"];
    const element = React.createElement(entry.component, {
      recipient: email,
      triggeredBy: email,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });

    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "test-email",
      recipient_email: email,
      status: "pending",
    });

    const { error } = await supabaseAdmin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: email,
        from: "Vanguard & Flow <noreply@mentorship.freebleeders.org>",
        sender_domain: "notify.mentorship.freebleeders.org",
        subject: "[Test] Vanguard & Flow email pipeline",
        html,
        text,
        purpose: "transactional",
        label: "test-email",
        idempotency_key: messageId,
        queued_at: new Date().toISOString(),
      },
    });
    if (error) throw new Error(error.message);
    return { ok: true, email, messageId };
  });

export const hubSmokeTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

    const tableCount = async (t: string) => {
      const { count, error } = await supabaseAdmin
        .from(t)
        .select("*", { count: "exact", head: true });
      return { count: count ?? 0, error: error?.message };
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
