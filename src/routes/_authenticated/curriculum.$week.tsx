import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getWeek, getCurriculum, type Program } from "@/lib/curriculum";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/curriculum/$week")({
  component: WeekDetail,
});

function WeekDetail() {
  const { week } = Route.useParams();
  const weekNum = Number(week);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, role, program: userProgram } = useUserContext();
  const program: Program = userProgram ?? "vanguard";
  const topic = getWeek(program, weekNum);
  const curriculum = getCurriculum(program);

  const { data: progress } = useQuery({
    queryKey: ["progress-week", user?.id, program, weekNum],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("weekly_progress")
        .select("*").eq("mentee_id", user!.id).eq("program", program).eq("week_number", weekNum).maybeSingle();
      return data;
    },
  });

  const [reflection, setReflection] = useState("");
  useEffect(() => { if (progress?.reflection) setReflection(progress.reflection); }, [progress]);

  const save = useMutation({
    mutationFn: async (markComplete: boolean) => {
      if (!user) return;
      const payload = {
        mentee_id: user.id,
        program,
        week_number: weekNum,
        reflection,
        completed: markComplete,
        completed_at: markComplete ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("weekly_progress").upsert(payload, { onConflict: "mentee_id,program,week_number" });
      if (error) throw error;
    },
    onSuccess: (_d, markComplete) => {
      toast.success(markComplete ? "Week completed!" : "Saved.");
      qc.invalidateQueries({ queryKey: ["progress"] });
      qc.invalidateQueries({ queryKey: ["progress-week"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!topic) return <p>Week not found. <Link to="/curriculum" className="underline">Back</Link></p>;

  const prev = curriculum.find((w) => w.week === weekNum - 1);
  const next = curriculum.find((w) => w.week === weekNum + 1);
  const isMentee = role === "mentee";

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/curriculum"><ArrowLeft className="h-4 w-4 mr-1" /> Back to curriculum</Link>
      </Button>

      <div>
        <Badge className="bg-gold/10 text-gold border-gold/30">Month {topic.month} · {topic.monthLabel}</Badge>
        <h1 className="font-display text-4xl font-bold mt-3">Week {topic.week}: {topic.title}</h1>
        <p className="text-gold mt-2">{topic.focus}</p>
        <p className="text-muted-foreground mt-3">{topic.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discussion topics</CardTitle>
          <CardDescription>Explore these during your weekly session.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><span className="text-gold">▸</span> Reflect on this week's focus area.</li>
            <li className="flex gap-2"><span className="text-gold">▸</span> Share one personal example with your mentor or circle.</li>
            <li className="flex gap-2"><span className="text-gold">▸</span> Identify one action item to apply this week.</li>
            <li className="flex gap-2"><span className="text-gold">▸</span> Check in on last week's commitment.</li>
          </ul>
        </CardContent>
      </Card>

      {isMentee && (
        <Card>
          <CardHeader>
            <CardTitle>Your reflection</CardTitle>
            <CardDescription>What did you learn? What will you apply?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={reflection} onChange={(e) => setReflection(e.target.value)} rows={6} placeholder="Write your reflection here..." />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => save.mutate(true)} disabled={save.isPending} className="bg-gradient-gold text-primary-foreground font-semibold">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark week complete
              </Button>
              <Button variant="outline" onClick={() => save.mutate(false)} disabled={save.isPending}>
                <Circle className="h-4 w-4 mr-2" /> Save draft
              </Button>
              {progress?.completed && <Badge className="bg-gold/20 text-gold ml-auto self-center">✓ Completed</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        {prev ? (
          <Button variant="outline" onClick={() => navigate({ to: "/curriculum/$week", params: { week: String(prev.week) } })}>
            <ArrowLeft className="h-4 w-4 mr-1" /> W{prev.week}
          </Button>
        ) : <div />}
        {next && (
          <Button variant="outline" onClick={() => navigate({ to: "/curriculum/$week", params: { week: String(next.week) } })}>
            W{next.week} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
