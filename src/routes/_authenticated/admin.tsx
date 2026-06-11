import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useUserContext } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { deleteAccount } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CreateAccountDialog } from "@/components/CreateAccountDialog";
import { toast } from "sonner";
import {
  UserPlus, Users, Shield, Heart, Trash2, Search, ShieldCheck, GraduationCap, UserCog, Baby,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPortal,
});

type Role = "admin" | "mentor" | "mentee" | "parent";

function AdminPortal() {
  const { role } = useUserContext();
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultRole, setDefaultRole] = useState<Role>("mentee");

  if (role && role !== "admin") {
    return <p className="text-sm text-muted-foreground">Admin only.</p>;
  }

  const openCreate = (r: Role) => {
    setDefaultRole(r);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-program font-semibold">Super Admin</p>
          <h1 className="font-display text-3xl font-bold mt-1">Admin Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage accounts, assignments, and program activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openCreate("admin")}><ShieldCheck className="mr-1.5 h-4 w-4" /> New admin</Button>
          <Button variant="outline" onClick={() => openCreate("mentor")}><UserCog className="mr-1.5 h-4 w-4" /> New mentor</Button>
          <Button variant="outline" onClick={() => openCreate("parent")}><Users className="mr-1.5 h-4 w-4" /> New parent</Button>
          <Button onClick={() => openCreate("mentee")}><UserPlus className="mr-1.5 h-4 w-4" /> New mentee</Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="quick-links">Shortcuts</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><Overview /></TabsContent>
        <TabsContent value="accounts" className="mt-4"><Accounts /></TabsContent>
        <TabsContent value="quick-links" className="mt-4"><Shortcuts /></TabsContent>
      </Tabs>

      <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} defaultRole={defaultRole} />
    </div>
  );
}

function useAllAccounts() {
  return useQuery({
    queryKey: ["all-accounts"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, program, status, managed_by_parent, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const map = new Map<string, Role[]>();
      roles?.forEach((r) => {
        const a = map.get(r.user_id) ?? [];
        a.push(r.role as Role);
        map.set(r.user_id, a);
      });
      return (profiles ?? []).map((p) => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
  });
}

function Overview() {
  const { data: accounts = [] } = useAllAccounts();
  const by = (r: Role) => accounts.filter((a) => a.roles.includes(r));
  const tiles = [
    { label: "Mentees", value: by("mentee").length, icon: <GraduationCap className="h-4 w-4" /> },
    { label: "Mentors", value: by("mentor").length, icon: <UserCog className="h-4 w-4" /> },
    { label: "Parents", value: by("parent").length, icon: <Users className="h-4 w-4" /> },
    { label: "Admins", value: by("admin").length, icon: <ShieldCheck className="h-4 w-4" /> },
  ];
  const programs = [
    { label: "Vanguard Brotherhood", count: accounts.filter((a) => a.program === "vanguard").length, icon: <Shield className="h-5 w-5 text-gold" /> },
    { label: "Flow Collective", count: accounts.filter((a) => a.program === "flow").length, icon: <Heart className="h-5 w-5 text-rose" /> },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{t.icon}{t.label}</div>
            <div className="mt-1 font-display text-2xl font-bold">{t.value}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {programs.map((p) => (
          <Card key={p.label}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">{p.icon}{p.label}</CardTitle>
              <CardDescription>{p.count} members assigned</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Accounts() {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteAccount);
  const { data: accounts = [] } = useAllAccounts();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");

  const filtered = accounts.filter((a) => {
    if (search && !(a.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "all" && !a.roles.includes(roleFilter)) return false;
    return true;
  });

  const del = useMutation({
    mutationFn: async (userId: string) => delFn({ data: { userId } }),
    onSuccess: () => { toast.success("Account deleted."); qc.invalidateQueries({ queryKey: ["all-accounts"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1">
            {(["all", "mentee", "mentor", "parent", "admin"] as const).map((r) => (
              <Button key={r} size="sm" variant={roleFilter === r ? "default" : "outline"} onClick={() => setRoleFilter(r as Role | "all")}>
                {r}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No accounts match.</p>}
        {filtered.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{a.full_name || "Unnamed"}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {a.roles.map((r) => <Badge key={r} variant="outline" className="capitalize">{r}</Badge>)}
                {a.program && (
                  <Badge variant="outline" className="gap-1 capitalize">
                    {a.program === "vanguard" ? <Shield className="h-3 w-3" /> : <Heart className="h-3 w-3" />} {a.program}
                  </Badge>
                )}
                {a.managed_by_parent && <Badge variant="outline" className="gap-1"><Baby className="h-3 w-3" /> parent-managed</Badge>}
                <Badge variant="outline" className="capitalize">{a.status}</Badge>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete ${a.full_name}? This cannot be undone.`)) del.mutate(a.id);
              }}
              aria-label="Delete account"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Shortcuts() {
  const links = [
    { label: "Student management & pairings", href: "/people" },
    { label: "Sponsor reports", href: "/reports" },
    { label: "Curriculum", href: "/curriculum" },
    { label: "Resources library", href: "/resources" },
    { label: "Announcements", href: "/announcements" },
    { label: "Calendar / sessions", href: "/calendar" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((l) => (
        <Link
          key={l.href}
          to={l.href}
          className="rounded-xl border border-border bg-card p-4 transition hover:border-program hover:shadow-elegant"
        >
          <p className="font-semibold">{l.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{l.href}</p>
        </Link>
      ))}
    </div>
  );
}
