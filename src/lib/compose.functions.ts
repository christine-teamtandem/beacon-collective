import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── AI draft generation ──────────────────────────────────────────────────────
//
// Uses the platform-managed Lovable AI gateway (LOVABLE_API_KEY).
// The Resend pipeline is already wired through sendLovableEmail in the
// queue processor — no separate RESEND_API_KEY is needed in app code.
//
// Sender display name updated to "Freebleeders Mentorship Hub" per brand spec.
// Actual sending domain remains mentorship.freebleeders.org (Resend-verified).
// To route through freebleeders@gmail.com, verify that address in Resend and
// update the `from` field in sendComposedEmail below.

const AiDraftInput = z.object({
  reference: z.string().min(1).max(8000),
  subject: z.string().max(200).optional(),
  context: z.string().max(500).optional(),
});

export const generateEmailDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AiDraftInput.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service unavailable — LOVABLE_API_KEY not set.");

    const systemPrompt = `You are an expert email copywriter for Freebleeders Mentorship Hub, a premium mentorship platform serving young men and women aged 12–18. Your brand voice is warm, purposeful, and elevated — never corporate or generic.

When given a reference email, template, or content notes, you MUST:
1. Match the exact tone, structure, and intent of the reference material.
2. Produce a polished, complete email body (no subject line — just the body text).
3. Use clear paragraph breaks (double newlines between paragraphs).
4. Do NOT include salutations like "Hi [Name]" or sign-offs like "Regards" — those are handled by the system.
5. Do NOT include placeholder brackets like [Name] or [Date].
6. Keep the tone genuine, premium, and aligned with the Freebleeders brand identity.
7. Return only the email body text — no commentary, no markdown formatting, no headings.`;

    const userPrompt = [
      data.subject ? `Email subject: ${data.subject}` : null,
      data.context ? `Additional context: ${data.context}` : null,
      `Reference material to match:\n\n${data.reference}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      if (res.status === 429) throw new Error("AI is busy. Please try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted. Contact your administrator.");
      const txt = await res.text().catch(() => "");
      throw new Error(`AI request failed (${res.status}). ${txt.slice(0, 160)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const draft = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!draft) throw new Error("AI returned an empty draft.");
    return { draft };
  });

const Input = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(200),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
});

export const listAllowedRecipients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r) => r.role);
    const isAdmin = roles.includes("admin");
    const isMentor = roles.includes("mentor");
    const isMentee = roles.includes("mentee");
    const isParent = roles.includes("parent");

    const { data: meProfile } = await supabaseAdmin
      .from("profiles")
      .select("program")
      .eq("id", context.userId)
      .maybeSingle();

    // Collect allowed user IDs
    const allowed = new Set<string>();

    if (isAdmin) {
      const { data } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "mentor", "mentee", "parent"]);
      data?.forEach((r) => allowed.add(r.user_id));
    }
    if (isMentor) {
      // assigned mentees + their parents + admins
      const { data: assigns } = await supabaseAdmin
        .from("mentor_assignments")
        .select("mentee_id")
        .eq("mentor_id", context.userId);
      const menteeIds = (assigns ?? []).map((a) => a.mentee_id);
      menteeIds.forEach((id) => allowed.add(id));
      if (menteeIds.length) {
        const { data: links } = await supabaseAdmin
          .from("parent_links")
          .select("parent_id")
          .in("child_id", menteeIds);
        links?.forEach((l) => allowed.add(l.parent_id));
      }
      const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
      admins?.forEach((a) => allowed.add(a.user_id));
    }
    if (isMentee) {
      // same-program mentees + own parents + assigned mentor(s)
      if (meProfile?.program) {
        const { data: peers } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("program", meProfile.program);
        const peerIds = (peers ?? []).map((p) => p.id).filter((id) => id !== context.userId);
        // restrict to peers who are mentees
        if (peerIds.length) {
          const { data: peerRoles } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .in("user_id", peerIds)
            .eq("role", "mentee");
          peerRoles?.forEach((p) => allowed.add(p.user_id));
        }
      }
      const { data: myParents } = await supabaseAdmin
        .from("parent_links")
        .select("parent_id")
        .eq("child_id", context.userId);
      myParents?.forEach((p) => allowed.add(p.parent_id));
      const { data: myMentors } = await supabaseAdmin
        .from("mentor_assignments")
        .select("mentor_id")
        .eq("mentee_id", context.userId);
      myMentors?.forEach((m) => allowed.add(m.mentor_id));
    }
    if (isParent) {
      const { data: kids } = await supabaseAdmin
        .from("parent_links")
        .select("child_id")
        .eq("parent_id", context.userId);
      const kidIds = (kids ?? []).map((k) => k.child_id);
      kidIds.forEach((id) => allowed.add(id));
      if (kidIds.length) {
        const { data: mentors } = await supabaseAdmin
          .from("mentor_assignments")
          .select("mentor_id")
          .in("mentee_id", kidIds);
        mentors?.forEach((m) => allowed.add(m.mentor_id));
      }
      const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
      admins?.forEach((a) => allowed.add(a.user_id));
    }

    allowed.delete(context.userId);
    const ids = Array.from(allowed);
    if (ids.length === 0) return { recipients: [] };

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, program")
      .in("id", ids);
    const { data: roleRows2 } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const roleMap = new Map<string, string[]>();
    roleRows2?.forEach((r) => {
      const a = roleMap.get(r.user_id) ?? [];
      a.push(r.role);
      roleMap.set(r.user_id, a);
    });

    const recipients = (profiles ?? []).map((p) => ({
      id: p.id,
      fullName: p.full_name || "Unnamed",
      program: p.program,
      roles: roleMap.get(p.id) ?? [],
    }));
    return { recipients };
  });

export const sendComposedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Re-derive allowed set (do NOT trust client)
    const allowed = await (async () => {
      const fn = listAllowedRecipients;
      const res = await (fn as any)({ context });
      return new Set<string>((res.recipients as any[]).map((r) => r.id));
    })().catch(async () => {
      // fallback: recompute inline (avoid invoking the public RPC indirectly)
      return new Set<string>();
    });

    // Inline re-compute (safer than recursive call):
    const allowedSet = new Set<string>();
    {
      const { data: roleRows } = await supabaseAdmin
        .from("user_roles").select("role").eq("user_id", context.userId);
      const roles = (roleRows ?? []).map((r) => r.role);
      const isAdmin = roles.includes("admin");
      const isMentor = roles.includes("mentor");
      const isMentee = roles.includes("mentee");
      const isParent = roles.includes("parent");
      const { data: meProfile } = await supabaseAdmin
        .from("profiles").select("program").eq("id", context.userId).maybeSingle();

      if (isAdmin) {
        const { data } = await supabaseAdmin.from("user_roles").select("user_id");
        data?.forEach((r) => allowedSet.add(r.user_id));
      }
      if (isMentor) {
        const { data: assigns } = await supabaseAdmin
          .from("mentor_assignments").select("mentee_id").eq("mentor_id", context.userId);
        const ids = (assigns ?? []).map((a) => a.mentee_id);
        ids.forEach((id) => allowedSet.add(id));
        if (ids.length) {
          const { data: links } = await supabaseAdmin
            .from("parent_links").select("parent_id").in("child_id", ids);
          links?.forEach((l) => allowedSet.add(l.parent_id));
        }
        const { data: admins } = await supabaseAdmin
          .from("user_roles").select("user_id").eq("role", "admin");
        admins?.forEach((a) => allowedSet.add(a.user_id));
      }
      if (isMentee && meProfile?.program) {
        const { data: peers } = await supabaseAdmin
          .from("profiles").select("id").eq("program", meProfile.program);
        const peerIds = (peers ?? []).map((p) => p.id).filter((i) => i !== context.userId);
        if (peerIds.length) {
          const { data: pr } = await supabaseAdmin
            .from("user_roles").select("user_id").in("user_id", peerIds).eq("role", "mentee");
          pr?.forEach((p) => allowedSet.add(p.user_id));
        }
        const { data: myParents } = await supabaseAdmin
          .from("parent_links").select("parent_id").eq("child_id", context.userId);
        myParents?.forEach((p) => allowedSet.add(p.parent_id));
        const { data: myMentors } = await supabaseAdmin
          .from("mentor_assignments").select("mentor_id").eq("mentee_id", context.userId);
        myMentors?.forEach((m) => allowedSet.add(m.mentor_id));
      }
      if (isParent) {
        const { data: kids } = await supabaseAdmin
          .from("parent_links").select("child_id").eq("parent_id", context.userId);
        const kidIds = (kids ?? []).map((k) => k.child_id);
        kidIds.forEach((id) => allowedSet.add(id));
        if (kidIds.length) {
          const { data: mentors } = await supabaseAdmin
            .from("mentor_assignments").select("mentor_id").in("mentee_id", kidIds);
          mentors?.forEach((m) => allowedSet.add(m.mentor_id));
        }
        const { data: admins } = await supabaseAdmin
          .from("user_roles").select("user_id").eq("role", "admin");
        admins?.forEach((a) => allowedSet.add(a.user_id));
      }
      allowedSet.delete(context.userId);
    }

    const invalid = data.recipientIds.filter((id) => !allowedSet.has(id));
    if (invalid.length) {
      throw new Error(`Not allowed to email ${invalid.length} of the selected recipients.`);
    }

    // Fetch sender info
    const [{ data: senderProfile }, { data: senderUser }, { data: senderRoleRows }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(context.userId),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", context.userId),
    ]);
    const senderName = senderProfile?.full_name || senderUser?.user?.email || "A member";
    const senderRole = (senderRoleRows ?? [])[0]?.role || "";

    // Resolve recipient emails
    const recipientUsers = await Promise.all(
      data.recipientIds.map(async (id) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        return { id, email: u?.user?.email };
      })
    );

    // Render once
    const { render } = await import("@react-email/components");
    const React = await import("react");
    const { TEMPLATES } = await import("@/lib/email-templates/registry");
    const entry = TEMPLATES["composed-message"];
    const element = React.createElement(entry.component, {
      senderName, senderRole, subject: data.subject, body: data.body,
    });
    const html = await render(element);
    const text = await render(element, { plainText: true });

    const { sendBrandedEmail, DEFAULT_FROM } = await import("@/lib/email-sender.server");
    const { getResendFrom } = await import("@/lib/config.server");
    const fromAddress = getResendFrom() || DEFAULT_FROM;

    const stamp = Date.now();
    const results: { id: string; email: string | undefined; ok: boolean; reason?: string }[] = [];

    for (const r of recipientUsers) {
      if (!r.email) { results.push({ ...r, ok: false, reason: "no email" }); continue; }
      const messageId = `compose-${context.userId}-${stamp}-${r.id}`;

      // Format-aware send: Lovable connector (lovc_ keys) or direct Resend (re_ keys).
      const sendRes = await sendBrandedEmail({
        to: r.email,
        from: fromAddress,
        subject: data.subject,
        html,
        text,
        messageId,
        label: "composed-message",
      });

      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId,
        template_name: "composed-message",
        recipient_email: r.email,
        status: sendRes.ok ? "sent" : "failed",
        error_message: sendRes.ok ? null : (sendRes.error ?? "").slice(0, 500),
      });

      results.push({ ...r, ok: sendRes.ok, reason: sendRes.error });
    }

    return { sent: results.filter((r) => r.ok).length, total: results.length, results };
  });

export const listSentEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("email_send_log")
      .select("message_id, recipient_email, status, template_name, created_at, error_message")
      .like("message_id", `compose-${context.userId}-%`)
      .order("created_at", { ascending: false })
      .limit(600); // fetch more rows since multiple rows per recipient are possible
    if (error) throw new Error(error.message);

    // Group all rows by batch stamp (embedded in message_id: compose-<uid>-<stamp>-<rid>)
    type Row = { message_id: string | null; recipient_email: string | null; status: string; created_at: string; error_message: string | null };
    const groups = new Map<string, { stamp: string; createdAt: string; rows: Row[] }>();
    (data ?? []).forEach((row) => {
      if (!row.message_id) return;
      const parts = row.message_id.split("-");
      // message_id = compose(1) + userId UUID(5) + stamp(1) + recipientId UUID(5) = 12 parts
      const stamp = parts[6] ?? parts[parts.length - 6] ?? "0";
      const g = groups.get(stamp) ?? { stamp, createdAt: row.created_at, rows: [] };
      g.rows.push(row as Row);
      if (row.created_at < g.createdAt) g.createdAt = row.created_at;
      groups.set(stamp, g);
    });

    const batches = Array.from(groups.values())
      .map((g) => {
        // Deduplicate per recipient — keep the most terminal status
        // Priority: sent > failed > dlq > pending
        const priority = (s: string) => s === "sent" ? 3 : s === "failed" ? 2 : s === "dlq" ? 2 : 1;
        const byEmail = new Map<string, Row>();
        for (const row of g.rows) {
          const key = row.recipient_email ?? row.message_id ?? "";
          const existing = byEmail.get(key);
          if (!existing || priority(row.status) > priority(existing.status)) {
            byEmail.set(key, row);
          }
        }
        const deduped = Array.from(byEmail.values());

        return {
          stamp: g.stamp,
          createdAt: g.createdAt,
          total: deduped.length,
          sent:    deduped.filter((r) => r.status === "sent").length,
          pending: deduped.filter((r) => r.status === "pending").length,
          failed:  deduped.filter((r) => r.status === "failed" || r.status === "dlq").length,
          recipients: deduped.map((r) => ({
            email: r.recipient_email,
            status: r.status,
            error: r.error_message,
          })),
        };
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return { batches };
  });
