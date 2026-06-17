import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import type { Program } from "@/lib/curriculum";

interface Props {
  program: Program;
  week: number;
}

type Lesson = {
  id: string;
  program: Program;
  week_number: number;
  title: string;
  body: string;
  author_id: string;
  position: number;
};

export function WeekLessons({ program, week }: Props) {
  const qc = useQueryClient();
  const { role, user } = useUserContext();
  const canManage = role === "admin" || role === "mentor";

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["week-lessons", program, week],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("week_lessons")
        .select("*")
        .eq("program", program)
        .eq("week_number", week)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Lesson[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("week_lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lesson removed.");
      qc.invalidateQueries({ queryKey: ["week-lessons", program, week] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-gold" /> Lessons & topics
          </CardTitle>
          <CardDescription>Module notes written by mentors and admins.</CardDescription>
        </div>
        {canManage && user && (
          <LessonDialog program={program} week={week} userId={user.id} nextPosition={lessons.length} />
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : lessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canManage
              ? "No lessons yet. Click 'Add lesson' to write the first module."
              : "No lesson notes posted for this week yet."}
          </p>
        ) : (
          <ul className="space-y-4">
            {lessons.map((l) => {
              const mine = l.author_id === user?.id;
              return (
                <li key={l.id} className="rounded-lg border border-border bg-surface/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{l.title}</h3>
                    {(role === "admin" || mine) && (
                      <div className="flex gap-1 shrink-0">
                        <LessonDialog
                          program={program}
                          week={week}
                          userId={user!.id}
                          lesson={l}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Delete this lesson?")) del.mutate(l.id);
                          }}
                          disabled={del.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                    {l.body}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LessonDialog({
  program,
  week,
  userId,
  lesson,
  nextPosition,
}: {
  program: Program;
  week: number;
  userId: string;
  lesson?: Lesson;
  nextPosition?: number;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [body, setBody] = useState(lesson?.body ?? "");
  const [busy, setBusy] = useState(false);
  const isEdit = !!lesson;

  const submit = async () => {
    if (!title.trim()) return toast.error("Title is required.");
    setBusy(true);
    try {
      if (isEdit) {
        const { error } = await supabase
          .from("week_lessons")
          .update({ title: title.trim(), body })
          .eq("id", lesson!.id);
        if (error) throw error;
        toast.success("Lesson updated.");
      } else {
        const { error } = await supabase.from("week_lessons").insert({
          program,
          week_number: week,
          title: title.trim(),
          body,
          author_id: userId,
          position: nextPosition ?? 0,
        });
        if (error) throw error;
        toast.success("Lesson added.");
      }
      qc.invalidateQueries({ queryKey: ["week-lessons", program, week] });
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !isEdit) {
          setTitle("");
          setBody("");
        }
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="icon" variant="ghost">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add lesson
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lesson" : `Add lesson — Week ${week}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title / topic</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Module 1 — Understanding boundaries"
            />
          </div>
          <div className="space-y-1">
            <Label>Lesson content</Label>
            <Textarea
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the lesson, key points, discussion prompts, takeaways..."
            />
            <p className="text-xs text-muted-foreground">
              Plain text with line breaks. Pair with files or video links in "Week materials".
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving..." : isEdit ? "Save changes" : "Publish lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
