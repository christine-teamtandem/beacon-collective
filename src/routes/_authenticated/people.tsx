import { createFileRoute, Link } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Shield, Heart, Search, UserPlus, Trash2, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/people")({
  component: People,
});

type Program = "vanguard" | "flow";
type Status = "active" | "pending" | "inactive";

function People() {
  const { role } = useUserContext();
  if (role && role !== "admin") {
    return <p className="text-muted-foreground">Admin only.</p>;
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-program font-semibold">Admin Console</p>
        <h1 className="font-display text-3xl font-bold mt-1">Students &amp; People</h1>
        <p className="text-muted-foreground text-sm mt-1">Assign programs, pair mentors, link families.</p>
      </div>
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="pairings">Mentor Pairings</TabsTrigger>
          <TabsTrigger value="families">Family Links</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4"><StudentsTab /></TabsContent>
        <TabsContent value="pairings" className="mt-4"><PairingsTab /></TabsContent>
        <TabsContent value="families" className="mt-4"><FamiliesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data: p } = await supabase.from("profiles").select("id, full_name, program, status, age, created_at");
      const { data: r } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string[]>();
      r?.forEach((row) => {
        const arr = roleMap.get(row.user_id) ?? [];
        arr.push(row.role); roleMap.set(row.user_id, arr);
      });
      return (p ?? []).map((prof) => ({ ...prof, roles: roleMap.get(prof.id) ?? [] }));
    },
  });
}

function StudentsTab() {
  const qc = useQueryClient();
  const { data: profiles = [] } = useAllProfiles();
  const [search, setSearch] = useState("");
  const [progFilter, setProgFilter] = useState<"all" | Program | "none">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const students = useMemo(() => profiles.filter((p) => p.roles.includes("mentee")), [profiles]);
  const filtered = students.filter((s) => {
    if (search && !(s.full_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (progFilter === "none" && s.program) return false;
    if (progFilter !== "all" && progFilter !== "none" && s.program !== progFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const setProgram = useMutation({
    mutationFn: async ({ id, program }: { id: string; program: Program | null }) => {
      const { error } = await supabase.from("profiles").update({ program }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Program updated."); qc.invalidateQueries({ queryKey: ["all-profiles"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated."); qc.invalidateQueries({ queryKey: ["all-profiles"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const counts = {
    total: students.length,
    vanguard: students.filter((s) => s.program === "vanguard").length,
    flow: students.filter((s) => s.program === "flow").length,
    unassigned: students.filter((s) => !s.program).length,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="All students" value={counts.total} icon={<Users className="h-4 w-4" />} />
        <StatTile label="Vanguard" value={counts.vanguard} icon={<Shield className="h-4 w-4" />} />
        <StatTile label="Flow" value={counts.flow} icon={<Heart className="h-4 w-4" />} />
        <StatTile label="Unassigned" value={counts.unassigned} tone="warn" />
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." className="pl-9" />
            </div>
            <Select value={progFilter} onValueChange={(v) => setProgFilter(v as typeof progFilter)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All programs</SelectItem>
                <SelectItem value="vanguard">Vanguard</SelectItem>
                <SelectItem value="flow">Flow</SelectItem>
                <SelectItem value="none">Unassigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No students match.</p>}
          {filtered.map((s) => (
            <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.full_name || "Unnamed"}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {s.program ? (
                    <Badge variant="outline" className="gap-1">
                      {s.program === "vanguard" ? <Shield className="h-3 w-3" /> : <Heart className="h-3 w-3" />}
                      {s.program}
                    </Badge>
                  ) : <Badge variant="outline" className="border-destructive/40 text-destructive">unassigned</Badge>}
                  <Badge variant="outline" className="capitalize">{s.status}</Badge>
                  {s.age && <span className="text-[10px] text-muted-foreground">age {s.age}</span>}
                </div>
              </div>
              <Select value={s.program ?? ""} onValueChange={(v) => setProgram.mutate({ id: s.id, program: (v || null) as Program | null })}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Assign" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vanguard">Vanguard</SelectItem>
                  <SelectItem value="flow">Flow</SelectItem>
                </SelectContent>
              </Select>
              <Select value={s.status} onValueChange={(v) => setStatus.mutate({ id: s.id, status: v as Status })}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button asChild size="sm" variant="ghost">
                <Link to="/people" className="flex items-center">View <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PairingsTab() {
  const qc = useQueryClient();
  const { data: profiles = [] } = useAllProfiles();
  const { data: assignments = [] } = useQuery({
    queryKey: ["all-assignments"],
    queryFn: async () => (await supabase.from("mentor_assignments").select("*")).data ?? [],
  });
  const [mentor, setMentor] = useState("");
  const [mentee, setMentee] = useState("");
  const mentorList = profiles.filter((p) => p.roles.includes("mentor"));
  const menteeList = profiles.filter((p) => p.roles.includes("mentee"));
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? id.slice(0, 8);
  const programOf = (id: string) => profiles.find((p) => p.id === id)?.program ?? "—";

  const assign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mentor_assignments").insert({ mentor_id: mentor, mentee_id: mentee });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Paired."); setMentor(""); setMentee(""); qc.invalidateQueries({ queryKey: ["all-assignments"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const unassign = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("mentor_assignments").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removed."); qc.invalidateQueries({ queryKey: ["all-assignments"] }); },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pair mentor → mentee</CardTitle>
        <CardDescription>Mentors only see and review mentees they're paired with.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1"><Label>Mentor</Label>
            <Select value={mentor} onValueChange={setMentor}>
              <SelectTrigger><SelectValue placeholder="Pick mentor" /></SelectTrigger>
              <SelectContent>{mentorList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Mentee</Label>
            <Select value={mentee} onValueChange={setMentee}>
              <SelectTrigger><SelectValue placeholder="Pick mentee" /></SelectTrigger>
              <SelectContent>{menteeList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.program ?? "no program"})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button onClick={() => assign.mutate()} disabled={!mentor || !mentee}><UserPlus className="mr-1 h-4 w-4" /> Pair</Button></div>
        </div>

        <div className="space-y-1.5">
          {assignments.length === 0 && <p className="text-xs text-muted-foreground">No pairs yet.</p>}
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
              <span><strong>{nameOf(a.mentor_id)}</strong> → {nameOf(a.mentee_id)} <Badge variant="outline" className="ml-2 capitalize">{programOf(a.mentee_id)}</Badge></span>
              <Button size="icon" variant="ghost" onClick={() => unassign.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FamiliesTab() {
  const qc = useQueryClient();
  const { data: profiles = [] } = useAllProfiles();
  const { data: links = [] } = useQuery({
    queryKey: ["all-parent-links"],
    queryFn: async () => (await supabase.from("parent_links").select("*")).data ?? [],
  });
  const [parent, setParent] = useState("");
  const [child, setChild] = useState("");
  const parentList = profiles.filter((p) => p.roles.includes("parent"));
  const menteeList = profiles.filter((p) => p.roles.includes("mentee"));
  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? id.slice(0, 8);

  const linkM = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("parent_links").insert({ parent_id: parent, child_id: child }); if (error) throw error; },
    onSuccess: () => { toast.success("Linked."); setParent(""); setChild(""); qc.invalidateQueries({ queryKey: ["all-parent-links"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const unlink = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("parent_links").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Unlinked."); qc.invalidateQueries({ queryKey: ["all-parent-links"] }); },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Link parent → child</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1"><Label>Parent / Family</Label>
            <Select value={parent} onValueChange={setParent}>
              <SelectTrigger><SelectValue placeholder="Pick parent" /></SelectTrigger>
              <SelectContent>{parentList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Child</Label>
            <Select value={child} onValueChange={setChild}>
              <SelectTrigger><SelectValue placeholder="Pick child" /></SelectTrigger>
              <SelectContent>{menteeList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end"><Button onClick={() => linkM.mutate()} disabled={!parent || !child}>Link</Button></div>
        </div>
        <div className="space-y-1.5">
          {links.length === 0 && <p className="text-xs text-muted-foreground">No family links yet.</p>}
          {links.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded border border-border p-2 text-sm">
              <span><strong>{nameOf(l.parent_id)}</strong> → {nameOf(l.child_id)}</span>
              <Button size="icon" variant="ghost" onClick={() => unlink.mutate(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatTile({ label, value, icon, tone }: { label: string; value: number; icon?: React.ReactNode; tone?: "warn" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "warn" && value > 0 ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
