import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ChildInput = z.object({
  fullName: z.string().trim().min(1).max(120),
  program: z.enum(["vanguard", "flow"]).nullable().optional(),
  mode: z.enum(["invite", "managed"]),
  email: z.string().email().max(255).optional(),
});

function genPassword() {
  const a = "ABCDEFGHJKMNPQRSTUVWXYZ23456789abcdefghjkmnpqrstuvwxyz";
  let s = "";
  for (let i = 0; i < 14; i++) s += a[Math.floor(Math.random() * a.length)];
  return s + "!";
}

export const parentCreateChild = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChildInput.parse(d))
  .handler(async ({ data, context }) => {
    // Verify caller is parent
    const { data: isParent } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "parent",
    });
    if (!isParent) throw new Error("Forbidden: parent only");

    if (data.mode === "invite" && !data.email) {
      throw new Error("Email is required when inviting your child.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email =
      data.mode === "invite"
        ? data.email!
        : `child-${crypto.randomUUID()}@managed.local`;

    const tempPassword = genPassword();

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        program: data.program ?? null,
        role: "mentee",
      },
    });
    if (cErr || !created.user) throw new Error(cErr?.message || "Failed to create child");
    const newId = created.user.id;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: "mentee" });

    await supabaseAdmin
      .from("profiles")
      .update({
        full_name: data.fullName,
        program: data.program ?? null,
        status: "active",
        managed_by_parent: data.mode === "managed",
      })
      .eq("id", newId);

    await supabaseAdmin.from("parent_links").insert({
      parent_id: context.userId,
      child_id: newId,
    });

    return {
      id: newId,
      email: data.mode === "invite" ? email : null,
      tempPassword: data.mode === "invite" ? tempPassword : null,
    };
  });
