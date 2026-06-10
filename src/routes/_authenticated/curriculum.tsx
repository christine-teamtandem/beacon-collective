import { createFileRoute, Link } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROGRAMS, getCurriculum, type Program } from "@/lib/curriculum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/curriculum")({
  component: CurriculumIndex,
});

function CurriculumIndex() {
  const { user, role, program: userProgram } = useUserContext();
  const program: Program = userProgram ?? "vanguard";
  const curriculum = getCurriculum(program);

  const { data: progress = [] } = useQuery({
    queryKey: ["progress", user?.id, program],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("weekly_progress").select("*").eq("mentee_id", user!.id).eq("program", program);
      return data ?? [];
    },
  });

  const completedSet = new Set(progress.filter((p) => p.completed).map((p) => p.week_number));
  const months = [1, 2, 3];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold font-semibold">Curriculum</p>
        <h1 className="font-display text-4xl font-bold mt-1">{PROGRAMS[program].name}</h1>
        <p className="text-muted-foreground mt-1">{PROGRAMS[program].duration}</p>
      </div>

      {role !== "mentee" && (
        <p className="text-sm text-muted-foreground">Viewing as <span className="capitalize text-foreground">{role}</span> — showing {program} curriculum.</p>
      )}

      {months.map((m) => {
        const weeks = curriculum.filter((w) => w.month === m);
        return (
          <Card key={m}>
            <CardHeader>
              <CardTitle className="font-display text-2xl">Month {m}: {weeks[0]?.monthLabel}</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-3">
              {weeks.map((w) => {
                const done = completedSet.has(w.week);
                return (
                  <Link
                    key={w.week}
                    to="/curriculum/$week"
                    params={{ week: String(w.week) }}
                    className="group flex items-start gap-3 rounded-lg border border-border bg-surface/40 p-4 hover:border-gold/40 transition"
                  >
                    <span className="mt-0.5">
                      {done ? <CheckCircle2 className="h-5 w-5 text-gold" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">Week {w.week}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold transition" />
                      </div>
                      <p className="font-semibold mt-2">{w.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{w.focus}</p>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
