import { createFileRoute } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/people")({
  component: People,
});

function People() {
  const { role } = useUserContext();
  const qc = useQueryClient();

  if (role && role !== "admin") {
    return <p className="text-muted-foreground">Admin only.</p>;
  }

  const { data: profiles = [] } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data: p } = await supabase.from("profiles").select("id, full_name, program");
      const { data: r } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string[]>();
      r?.forEach((row) => {
        const arr = roleMap.get(row.user_id) ?? [];
        arr.push(row.role);
        roleMap.set(row.user_id, arr);
      });
      return (p ?? []).map((prof) => ({ ...prof, roles: roleMap.get(prof.id) ?? [] }));
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["all-assignments"],
    queryFn: async () => {
      const { data } = await supabase.from("mentor_assignments").select("*");
      return data ?? [];
    },
  });

  const { data: parents = [] } = useQuery({
    queryKey: ["all-parent-links"],
    queryFn: async () => {
      const { data } = await supabase.from("parent_links").select("*");
      return data ?? [];
    },
  });

  const [mentor, setMentor] = useState("");
  const [mentee, setMentee] = useState("");
  const [parent, setParent] = useState("");
  const [child, setChild] = useState("");

  const mentorList = profiles.filter((p) => p.roles.includes("mentor"));
  const menteeList = profiles.filter((p) => p.roles.includes("mentee"));
  const parentList = profiles.filter((p) => p.roles.includes("parent"));

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
  const linkParent = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("parent_links").insert({ parent_id: parent, child_id: child }); if (error) throw error; },
    onSuccess: () => { toast.success("Linked."); setParent(""); setChild(""); qc.invalidateQueries({ queryKey: ["all-parent-links"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const unlinkParent = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("parent_links").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Unlinked."); qc.invalidateQueries({ queryKey: ["all-parent-links"] }); },
  });

  const nameOf = (id: string) => profiles.find((p) => p.id === id)?.full_name ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold font-semibold">Admin</p>
        <h1 className="font-display text-4xl font-bold mt-1">People & Assignments</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Pair mentor → mentee</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Mentor</Label>
              <Select value={mentor} onValueChange={setMentor}><SelectTrigger><SelectValue placeholder="Pick mentor" /></SelectTrigger>
                <SelectContent>{mentorList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Mentee</Label>
              <Select value={mentee} onValueChange={setMentee}><SelectTrigger><SelectValue placeholder="Pick mentee" /></SelectTrigger>
                <SelectContent>{menteeList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.program})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => assign.mutate()} disabled={!mentor || !mentee} className="w-full">Create pairing</Button>

            <div className="pt-4 border-t border-border">
              <p className="text-xs uppercase text-muted-foreground mb-2">Existing pairs</p>
              <ul className="space-y-1">
                {assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm p-2 rounded border border-border">
                    <span>{nameOf(a.mentor_id)} → {nameOf(a.mentee_id)}</span>
                    <Button size="sm" variant="ghost" onClick={() => unassign.mutate(a.id)}><Trash2 className="h-3 w-3" /></Button>
                  </li>
                ))}
                {assignments.length === 0 && <p className="text-xs text-muted-foreground">No pairs yet.</p>}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Link parent → child</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Parent</Label>
              <Select value={parent} onValueChange={setParent}><SelectTrigger><SelectValue placeholder="Pick parent" /></SelectTrigger>
                <SelectContent>{parentList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Child (mentee)</Label>
              <Select value={child} onValueChange={setChild}><SelectTrigger><SelectValue placeholder="Pick child" /></SelectTrigger>
                <SelectContent>{menteeList.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={() => linkParent.mutate()} disabled={!parent || !child} className="w-full">Link family</Button>

            <div className="pt-4 border-t border-border">
              <p className="text-xs uppercase text-muted-foreground mb-2">Existing links</p>
              <ul className="space-y-1">
                {parents.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm p-2 rounded border border-border">
                    <span>{nameOf(a.parent_id)} → {nameOf(a.child_id)}</span>
                    <Button size="sm" variant="ghost" onClick={() => unlinkParent.mutate(a.id)}><Trash2 className="h-3 w-3" /></Button>
                  </li>
                ))}
                {parents.length === 0 && <p className="text-xs text-muted-foreground">No links yet.</p>}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All members</CardTitle><CardDescription>{profiles.length} total</CardDescription></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {profiles.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 rounded border border-border">
                <div>
                  <p className="font-semibold">{p.full_name || "Unnamed"}</p>
                  <p className="text-xs text-muted-foreground">{p.program ?? "no program"}</p>
                </div>
                <div className="flex gap-1">
                  {p.roles.map((r) => <Badge key={r} variant="outline" className="capitalize">{r}</Badge>)}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
