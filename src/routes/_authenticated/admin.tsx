import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useState } from "react";
import { useUserContext } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { deleteAccount, sendPasswordReset, unlockAccount, resendLoginEmail, sendTestEmail, runApiDiagnostics, triggerWeeklyZoomCheckin } from "@/lib/admin.functions";
import type { DiagCheck } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { CreateAccountDialog } from "@/components/CreateAccountDialog";
import { ViewAsPicker } from "@/components/ViewAsBar";
import { toast } from "sonner";
import {
  UserPlus, Users, Shield, Heart, Trash2, Search, ShieldCheck, GraduationCap, UserCog, Baby,
  MoreVertical, KeyRound, Unlock, Mail, Activity, RefreshCw, CheckCircle2, XCircle, Eye,
  AlertTriangle, HelpCircle, Send, Zap, Database, Bot, Clock, Compass, RotateCcw,
} from "lucide-react";
import { useHubTour } from "@/contexts/HubTourContext";
import type { AppRole, Program } from "@/hooks/useSession";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPortal,
});

type Role = "admin" | "mentor" | "mentee" | "parent";

function AdminPortal() {
  const { realRole } = useUserContext();
  const [createOpen, setCreateOpen] = useState(false);
  const [defaultRole, setDefaultRole] = useState<Role>("mentee");

  if (realRole && realRole !== "admin") {
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
          <TabsTrigger value="preview">Preview as</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="quick-links">Shortcuts</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><Overview /></TabsContent>
        <TabsContent value="accounts" className="mt-4"><Accounts /></TabsContent>
        <TabsContent value="preview" className="mt-4"><PreviewAs /></TabsContent>
        <TabsContent value="diagnostics" className="mt-4"><Diagnostics /></TabsContent>
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
      <OnboardingPreview />
    </div>
  );
}

function OnboardingPreview() {
  const { replayTour, previewTourAs, resetTourCompletion } = useHubTour();
  const { viewAs } = useUserContext();

  const previews: { role: AppRole; program: Program | null; label: string }[] = [
    { role: "admin", program: null, label: "Admin" },
    { role: "mentor", program: "vanguard", label: "Mentor · Vanguard" },
    { role: "mentor", program: "flow", label: "Mentor · Flow" },
    { role: "mentee", program: "vanguard", label: "Mentee · Vanguard" },
    { role: "mentee", program: "flow", label: "Mentee · Flow" },
    { role: "parent", program: null, label: "Parent" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Compass className="h-5 w-5 text-gold" />
          Onboarding tour preview
        </CardTitle>
        <CardDescription>
          Replay the first-time hub walkthrough to review copy, spotlight targets, and step flow.
          Role previews switch the sidebar so highlights match what each member sees.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={replayTour}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Replay admin tour
          </Button>
          <Button variant="outline" onClick={resetTourCompletion}>
            Reset auto-start flag
          </Button>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Preview as role
          </p>
          <div className="flex flex-wrap gap-2">
            {previews.map((p) => (
              <Button
                key={`${p.role}-${p.program ?? "none"}`}
                size="sm"
                variant="outline"
                onClick={() => previewTourAs(p.role, p.program)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        {viewAs && (
          <p className="text-xs text-muted-foreground">
            Currently previewing as <span className="font-semibold capitalize">{viewAs.role}</span>
            {viewAs.program ? <> · {viewAs.program}</> : null}. Exit preview from the banner above when done.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Accounts() {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteAccount);
  const resetFn = useServerFn(sendPasswordReset);
  const unlockFn = useServerFn(unlockAccount);
  const resendFn = useServerFn(resendLoginEmail);
  const { data: accounts = [] } = useAllAccounts();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [actingOn, setActingOn] = useState<string | null>(null);

  const filtered = accounts.filter((a) => {
    if (search && !(a.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "all" && !a.roles.includes(roleFilter)) return false;
    return true;
  });

  const del = useMutation({
    mutationFn: async (userId: string) => delFn({ data: { userId } }),
    onMutate: (userId) => setActingOn(userId),
    onSettled: () => setActingOn(null),
    onSuccess: () => { toast.success("Account deleted."); qc.invalidateQueries({ queryKey: ["all-accounts"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const reset = useMutation({
    mutationFn: async (userId: string) => resetFn({ data: { userId } }),
    onMutate: (userId) => setActingOn(userId),
    onSettled: () => setActingOn(null),
    onSuccess: (r: any) => toast.success(`Password reset email sent to ${r.email}`),
    onError: (e) => toast.error((e as Error).message),
  });
  const unlock = useMutation({
    mutationFn: async (userId: string) => unlockFn({ data: { userId } }),
    onMutate: (userId) => setActingOn(userId),
    onSettled: () => setActingOn(null),
    onSuccess: () => {
      toast.success("Account unlocked and marked active.");
      qc.invalidateQueries({ queryKey: ["all-accounts"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const resend = useMutation({
    mutationFn: async (userId: string) => resendFn({ data: { userId } }),
    onMutate: (userId) => setActingOn(userId),
    onSettled: () => setActingOn(null),
    onSuccess: (r: any) => toast.success(`Login link sent to ${r.email}`),
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" aria-label="Account actions"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={actingOn === a.id}
                  onSelect={(e) => { e.preventDefault(); reset.mutate(a.id); }}
                >
                  <KeyRound className="mr-2 h-4 w-4" /> Send password reset
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={actingOn === a.id}
                  onSelect={(e) => { e.preventDefault(); resend.mutate(a.id); }}
                >
                  <Mail className="mr-2 h-4 w-4" /> Resend login link
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={actingOn === a.id}
                  onSelect={(e) => { e.preventDefault(); unlock.mutate(a.id); }}
                >
                  <Unlock className="mr-2 h-4 w-4" /> Unlock account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  disabled={actingOn === a.id}
                  onSelect={(e) => {
                    e.preventDefault();
                    if (confirm(`Delete ${a.full_name}? This cannot be undone.`)) del.mutate(a.id);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

const STATUS_ICON: Record<string, React.ReactNode> = {
  ok:              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />,
  error:           <XCircle      className="h-4 w-4 text-destructive shrink-0" />,
  warning:         <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />,
  not_configured:  <HelpCircle   className="h-4 w-4 text-muted-foreground shrink-0" />,
};
const STATUS_BADGE: Record<string, string> = {
  ok:             "border-green-500/40 text-green-500",
  error:          "border-destructive/40 text-destructive",
  warning:        "border-amber-400/40 text-amber-400",
  not_configured: "border-muted-foreground/40 text-muted-foreground",
};
const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Email:    <Mail     className="h-4 w-4" />,
  Zoom:     <Zap      className="h-4 w-4" />,
  AI:       <Bot      className="h-4 w-4" />,
  Database: <Database className="h-4 w-4" />,
};

function CheckRow({ c }: { c: DiagCheck }) {
  return (
    <div className="flex flex-wrap items-start gap-2 rounded-lg border border-border bg-card/50 p-3 text-sm">
      <div className="mt-0.5">{STATUS_ICON[c.status]}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold">{c.name}</span>
          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[c.status]}`}>
            {c.status.replace("_", " ")}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-foreground/80">{c.message}</p>
        {c.detail && <p className="mt-0.5 text-[11px] text-muted-foreground">{c.detail}</p>}
      </div>
    </div>
  );
}

function Diagnostics() {
  const testFn  = useServerFn(sendTestEmail);
  const diagFn  = useServerFn(runApiDiagnostics);
  const [testTo, setTestTo] = useState("");

  const diag = useMutation({
    mutationFn: async () => (diagFn as any)({}),
    onError: (e) => toast.error((e as Error).message),
  });
  const test = useMutation({
    mutationFn: async (to?: string) => (testFn as any)({ data: { to: to || undefined } }),
    onSuccess: (r: any) => toast.success(`✅ Test email sent to ${r.email}. Check your inbox.`),
    onError: (e) => toast.error((e as Error).message),
  });

  const data = diag.data as any;
  const checks: DiagCheck[] = data?.checks ?? [];
  const categories = Array.from(new Set(checks.map((c) => c.category)));
  const okCount  = checks.filter((c) => c.status === "ok").length;
  const errCount = checks.filter((c) => c.status === "error").length;

  return (
    <div className="space-y-5">
      {/* Action bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-program" /> API &amp; Integration Health
          </CardTitle>
          <CardDescription>
            Test every connected service — Resend, Zoom, AI, and your database — from one place.
            Admin only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => diag.mutate()} disabled={diag.isPending}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${diag.isPending ? "animate-spin" : ""}`} />
              {diag.isPending ? "Running checks…" : "Run all diagnostics"}
            </Button>
            <RunWeeklyCheckinButton />
          </div>

          {/* Test email sender */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Send className="h-4 w-4 text-program" /> Send test email
            </p>
            <div className="flex flex-wrap gap-2">
              <Input
                type="email"
                placeholder="Recipient email (leave blank for your own)"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                className="max-w-xs"
              />
              <Button
                onClick={() => test.mutate(testTo || undefined)}
                disabled={test.isPending}
                variant="outline"
              >
                <Mail className="mr-1.5 h-4 w-4" />
                {test.isPending ? "Sending…" : "Send now"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Sends via the Lovable email connector (LOVABLE_API_KEY) or direct Resend if configured.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results summary */}
      {checks.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm font-semibold text-green-500">
            <CheckCircle2 className="h-4 w-4" /> {okCount} passing
          </div>
          {errCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive">
              <XCircle className="h-4 w-4" /> {errCount} failed
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "—"}
          </div>
        </div>
      )}

      {/* Per-category check cards */}
      {categories.map((cat) => (
        <Card key={cat}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {CATEGORY_ICON[cat] ?? <Activity className="h-4 w-4" />}
              {cat}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {checks.filter((c) => c.category === cat).map((c) => (
              <CheckRow key={c.name} c={c} />
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Recent email log */}
      {data?.recentEmails?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent email log</CardTitle>
            <CardDescription>Last 10 entries from email_send_log</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {data.recentEmails.map((e: any, i: number) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded border border-border p-2 text-xs">
                <Badge
                  variant="outline"
                  className={`capitalize ${e.status === "sent" ? "border-green-500/40 text-green-500" : e.status === "failed" ? "border-destructive/40 text-destructive" : ""}`}
                >
                  {e.status}
                </Badge>
                <span className="font-mono">{e.template_name}</span>
                <span className="truncate text-muted-foreground">{e.recipient_email}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </span>
                {e.error_message && (
                  <p className="w-full text-destructive">{e.error_message}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RunWeeklyCheckinButton() {
  const trigger = useServerFn(triggerWeeklyZoomCheckin);
  const run = useMutation({
    mutationFn: async () => trigger({}),
    onSuccess: (r: any) => {
      toast.success(
        `Weekly check-ins: ${r.queued ?? 0} queued, ${r.skipped ?? 0} skipped, ${r.sessions ?? 0} session(s) scanned`,
      );
      if (r.errors?.length) {
        toast.error(r.errors.slice(0, 3).join(" · "), { duration: 12000 });
      }
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Button variant="outline" onClick={() => run.mutate()} disabled={run.isPending}>
      <Zap className={`mr-1.5 h-4 w-4 ${run.isPending ? "animate-pulse" : ""}`} />
      {run.isPending ? "Running…" : "Run Zoom weekly check-ins"}
    </Button>
  );
}

function PreviewAs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-program" /> Preview as another role</CardTitle>
        <CardDescription>See exactly what mentors, mentees, or parents see. A banner stays at the top so you can exit anytime.</CardDescription>
      </CardHeader>
      <CardContent>
        <ViewAsPicker />
      </CardContent>
    </Card>
  );
}
