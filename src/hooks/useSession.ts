import { useEffect, useState, useCallback, useSyncExternalStore } from "react";
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

export interface ViewAs {
  role: AppRole;
  program: Program | null;
}

const VIEW_AS_KEY = "lovable.viewAs";
const VIEW_AS_EVENT = "lovable:viewAs";

// useSyncExternalStore compares snapshots with Object.is. JSON.parse returns a
// new object every call, which makes React think the store changed on every
// render → "Maximum update depth exceeded". Cache by the raw string so we hand
// back a STABLE reference unless the underlying localStorage value changes.
let _viewAsRawCache: string | null = null;
let _viewAsValueCache: ViewAs | null = null;

function readViewAs(): ViewAs | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(VIEW_AS_KEY);
  } catch {
    return null;
  }
  if (raw === _viewAsRawCache) return _viewAsValueCache;
  _viewAsRawCache = raw;
  if (!raw) {
    _viewAsValueCache = null;
    return null;
  }
  try {
    const v = JSON.parse(raw) as ViewAs;
    _viewAsValueCache = v && v.role ? v : null;
  } catch {
    _viewAsValueCache = null;
  }
  return _viewAsValueCache;
}

function subscribeViewAs(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(VIEW_AS_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(VIEW_AS_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function setViewAs(v: ViewAs | null) {
  if (typeof window === "undefined") return;
  if (v) localStorage.setItem(VIEW_AS_KEY, JSON.stringify(v));
  else localStorage.removeItem(VIEW_AS_KEY);
  window.dispatchEvent(new Event(VIEW_AS_EVENT));
}

export function useViewAs(): ViewAs | null {
  return useSyncExternalStore(subscribeViewAs, readViewAs, () => null);
}

export interface UserContext {
  user: User | null;
  role: AppRole | null;
  program: Program | null;
  fullName: string;
  loading: boolean;
  realRole: AppRole | null;
  realProgram: Program | null;
  viewAs: ViewAs | null;
}

export function useUserContext(): UserContext {
  const { user, loading: sLoading } = useSession();
  const [realRole, setRealRole] = useState<AppRole | null>(null);
  const [realProgram, setRealProgram] = useState<Program | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const viewAs = useViewAs();

  useEffect(() => {
    if (sLoading) return;
    if (!user) { setRealRole(null); setRealProgram(null); setLoading(false); return; }
    let active = true;
    (async () => {
      const [{ data: roleData }, { data: profileData }] = await Promise.all([
        supabase.rpc("get_user_role", { _user_id: user.id }),
        supabase.from("profiles").select("program, full_name").eq("id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      setRealRole((roleData as AppRole) ?? "mentee");
      setRealProgram((profileData?.program as Program) ?? null);
      setFullName(profileData?.full_name ?? "");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user, sLoading]);

  const isAdmin = realRole === "admin";
  const effectiveRole = isAdmin && viewAs ? viewAs.role : realRole;
  const effectiveProgram = isAdmin && viewAs ? viewAs.program : realProgram;

  return {
    user,
    role: effectiveRole,
    program: effectiveProgram,
    fullName,
    loading: sLoading || loading,
    realRole,
    realProgram,
    viewAs: isAdmin ? viewAs : null,
  };
}
