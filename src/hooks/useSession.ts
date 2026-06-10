import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export type AppRole = "mentee" | "mentor" | "admin" | "parent";
export type Program = "vanguard" | "flow";

export interface UserContext {
  user: User | null;
  role: AppRole | null;
  program: Program | null;
  fullName: string;
  loading: boolean;
}

export function useUserContext(): UserContext {
  const { user, loading: sLoading } = useSession();
  const [role, setRole] = useState<AppRole | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sLoading) return;
    if (!user) { setRole(null); setProgram(null); setLoading(false); return; }
    let active = true;
    (async () => {
      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase.rpc("get_user_role", { _user_id: user.id }),
        supabase.from("profiles").select("program, full_name").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setRole((roleData as AppRole) ?? "mentee");
      setProgram((profileData?.program as Program) ?? null);
      setFullName(profileData?.full_name ?? "");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user, sLoading]);

  return { user, role, program, fullName, loading: sLoading || loading };
}
