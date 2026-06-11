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

    // handle_new_user trigger seeds profiles + user_roles with role from metadata.
    // Ensure role row matches the requested role (in case trigger defaulted to mentee).
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
