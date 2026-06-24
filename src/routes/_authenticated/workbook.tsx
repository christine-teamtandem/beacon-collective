import { createFileRoute } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { getCurriculum, PROGRAMS, type Program } from "@/lib/curriculum";
import { draftWorkbook } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/workbook")({
  component: Workbook,
});


function Workbook() {
  const { user, role, program: viewProgram } = useUserContext();
  const qc = useQueryClient();
  const [menteeId, setMenteeId] = useState("");
  const [week, setWeek] = useState("1");
  const [content, setContent] = useState("");
  const [drafting, setDrafting] = useState(false);
  const draftFn = useServerFn(draftWorkbook);

  const isAdmin = role === "admin";

  const { data: mentees = [] } = useQuery({
    queryKey: ["mentees-workbook", user?.id, isAdmin ? viewProgram : "self"],
    enabled: !!user,
    queryFn: async () => {
      if (isAdmin) {
        // All mentees in the effective program cohort
        const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "mentee");
        const ids = (roles ?? []).map((r) => r.user_id);
        if (!ids.length) return [];
        let q = supabase.from("profiles").select("id, full_name, program").in("id", ids);
        if (viewProgram) q = q.eq("program", viewProgram);
        const { data } = await q.order("full_name");
        return data ?? [];
      }
      const { data: assignments } = await supabase.from("mentor_assignments").select("mentee_id").eq("mentor_id", user!.id);
      const ids = (assignments ?? []).map((a) => a.mentee_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, program").in("id", ids);
      return data ?? [];
    },
  });

  // Reset selection when cohort view changes for admin
  useEffect(() => {
    if (isAdmin) setMenteeId("");
  }, [viewProgram, isAdmin]);

  const currentMentee = mentees.find((m) => m.id === menteeId);
  const program: Program = (currentMentee?.program as Program) ?? (viewProgram as Program) ?? "vanguard";
  const curriculum = getCurriculum(program);




  const { data: entry } = useQuery({
    queryKey: ["workbook-entry", user?.id, menteeId, week],
    enabled: !!user && !!menteeId,
    queryFn: async () => {
      const { data } = await supabase.from("workbook_entries")
        .select("*").eq("mentor_id", user!.id).eq("mentee_id", menteeId).eq("week_number", Number(week)).maybeSingle();
      return data;
    },
  });

  useEffect(() => { setContent(entry?.content ?? ""); }, [entry]);

  const save = useMutation({
    mutationFn: async () => {
      if (!user || !menteeId) throw new Error("Mentee required");
      const payload = { mentor_id: user.id, mentee_id: menteeId, week_number: Number(week), content };
      if (entry) {
        const { error } = await supabase.from("workbook_entries").update({ content }).eq("id", entry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("workbook_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Workbook saved.");
      qc.invalidateQueries({ queryKey: ["workbook-entry"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const currentTopic = curriculum.find((w) => w.week === Number(week));
  const template = `📋 Pre-session prep:
- Review last week's reflection
- Note any wins to celebrate

🎯 Session focus: ${currentTopic?.title ?? ""}
${currentTopic?.focus ?? ""}

💬 Discussion prompts:
1. 
2. 
3. 

✅ Action items for mentee:
- 

📝 Mentor observations:
`;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold font-semibold">Mentor Workbook</p>
        <h1 className="font-display text-4xl font-bold mt-1">Weekly 1:1 Workbook</h1>
        <p className="text-muted-foreground mt-1">Plan your weekly Zoom session and capture observations per mentee.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Pick mentee + week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Mentee</Label>
              <Select value={menteeId} onValueChange={setMenteeId}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>
                  {mentees.map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.program})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Week</Label>
              <Select value={week} onValueChange={setWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {curriculum.map((w) => <SelectItem key={w.week} value={String(w.week)}>W{w.week} · {w.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {currentTopic && (
              <div className="rounded-md border border-border bg-surface/40 p-3 text-sm">
                <p className="font-semibold">{currentTopic.title}</p>
                <p className="text-muted-foreground mt-1">{currentTopic.focus}</p>
              </div>
            )}
            {content === "" && menteeId && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setContent(template)}>Insert template</Button>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workbook entry</CardTitle>
            <CardDescription>Auto-saves when you click Save.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {menteeId ? `Drafting for ${currentMentee?.full_name ?? "mentee"} · W${week}` : "Pick a mentee + week to begin."}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!menteeId || !currentTopic || drafting}
                onClick={async () => {
                  if (!currentTopic) return;
                  setDrafting(true);
                  try {
                    const { draft } = await draftFn({
                      data: {
                        programName: PROGRAMS[program].name,
                        weekNumber: currentTopic.week,
                        weekTitle: currentTopic.title,
                        weekFocus: currentTopic.focus ?? "",
                        menteeName: currentMentee?.full_name ?? "the mentee",
                      },
                    });
                    setContent(draft);
                    toast.success("AI draft inserted.");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setDrafting(false);
                  }
                }}
                className="border-gold/50 text-gold hover:bg-gold/10 hover:text-gold"
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {drafting ? "Drafting..." : "AI Draft Assistant"}
              </Button>
            </div>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={20}
              disabled={!menteeId}
              placeholder={menteeId ? "Write your weekly session plan and observations..." : "Pick a mentee to start."} />
            <Button onClick={() => save.mutate()} disabled={save.isPending || !menteeId} className="bg-gradient-gold text-primary-foreground font-semibold">
              {save.isPending ? "Saving..." : "Save workbook"}
            </Button>
          </CardContent>

        </Card>
      </div>
    </div>
  );
}
