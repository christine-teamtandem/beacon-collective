import { createFileRoute } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { Trophy, Activity, Heart, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tracking")({
  component: Tracking,
});

const CATEGORIES = [
  { id: "mentee_wins", label: "Mentee Wins", icon: Trophy, desc: "Milestones, new skills, confidence growth." },
  { id: "engagement", label: "Engagement", icon: Activity, desc: "Attendance, check-in frequency, completion." },
  { id: "family_liaison", label: "Family Liaison", icon: Heart, desc: "Family communication, parent feedback." },
] as const;

function Tracking() {
  const { user, role } = useUserContext();
  const qc = useQueryClient();
  const [menteeId, setMenteeId] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]["id"]>("mentee_wins");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [weekNumber, setWeekNumber] = useState("");

  const { data: mentees = [] } = useQuery({
    queryKey: ["mentees-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (role === "admin") {
        const { data } = await supabase.from("profiles").select("id, full_name");
        return data ?? [];
      }
      const { data: assignments } = await supabase.from("mentor_assignments").select("mentee_id").eq("mentor_id", user!.id);
      const ids = (assignments ?? []).map((a) => a.mentee_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      return data ?? [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["tracking-logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("tracking_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (role !== "admin") q = q.eq("mentor_id", user!.id);
      const { data } = await q;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user || !menteeId || !title) throw new Error("Mentee and title required");
      const { error } = await supabase.from("tracking_logs").insert({
        mentor_id: user.id, mentee_id: menteeId, category, title, note,
        week_number: weekNumber ? Number(weekNumber) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Log saved.");
      setTitle(""); setNote(""); setWeekNumber("");
      qc.invalidateQueries({ queryKey: ["tracking-logs"] });
      qc.invalidateQueries({ queryKey: ["mentor-logs-count"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tracking_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted.");
      qc.invalidateQueries({ queryKey: ["tracking-logs"] });
    },
  });

  const nameOf = (id: string) => mentees.find((m) => m.id === id)?.full_name ?? "Unknown";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold font-semibold">Tracking</p>
        <h1 className="font-display text-4xl font-bold mt-1">Mentee Tracking Logs</h1>
        <p className="text-muted-foreground mt-1">Log Mentee Wins, Engagement, and Family Liaison notes for sponsorship reports.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>New log entry</CardTitle>
            <CardDescription>Capture progress for one of your mentees.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mentee</Label>
              <Select value={menteeId} onValueChange={setMenteeId}>
                <SelectTrigger><SelectValue placeholder="Pick mentee" /></SelectTrigger>
                <SelectContent>
                  {mentees.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.id.slice(0,8)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{CATEGORIES.find((c) => c.id === category)?.desc}</p>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Led week 5 group warm-up" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Week number (optional)</Label>
              <Input type="number" min="1" max="12" value={weekNumber} onChange={(e) => setWeekNumber(e.target.value)} />
            </div>
            <Button onClick={() => create.mutate()} disabled={create.isPending} className="bg-gradient-gold text-primary-foreground font-semibold w-full">
              {create.isPending ? "Saving..." : "Save log"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent logs</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                {CATEGORIES.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.label.split(" ")[0]}</TabsTrigger>)}
              </TabsList>
              {["all", ...CATEGORIES.map(c => c.id)].map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <ul className="space-y-2 max-h-[500px] overflow-y-auto">
                    {logs.filter(l => tab === "all" || l.category === tab).map((log) => {
                      const cat = CATEGORIES.find((c) => c.id === log.category);
                      const Icon = cat?.icon ?? Trophy;
                      return (
                        <li key={log.id} className="rounded-md border border-border p-3 bg-surface/40">
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold/10 text-gold"><Icon className="h-4 w-4" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-semibold text-sm truncate">{log.title}</p>
                                <Button size="sm" variant="ghost" onClick={() => remove.mutate(log.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                              <p className="text-xs text-muted-foreground">{nameOf(log.mentee_id)} · {cat?.label}{log.week_number ? ` · W${log.week_number}` : ""}</p>
                              {log.note && <p className="text-sm mt-2 whitespace-pre-wrap">{log.note}</p>}
                              <p className="text-xs text-muted-foreground mt-1">{new Date(log.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                    {logs.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No logs yet.</p>}
                  </ul>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
