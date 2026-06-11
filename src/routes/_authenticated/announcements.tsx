import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useUserContext } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Megaphone, Pin, Plus, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/announcements")({
  component: AnnouncementsPage,
});

function AnnouncementsPage() {
  const { user, role, program } = useUserContext();
  const qc = useQueryClient();
  const canPost = role === "mentor" || role === "admin";

  const { data: items = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements")
        .select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    // Mark as read on view
    if (user) supabase.from("profiles").update({ last_seen_announcements_at: new Date().toISOString() }).eq("id", user.id);
    const ch = supabase.channel("ann-rt").on("postgres_changes",
      { event: "*", schema: "public", table: "announcements" },
      (payload) => {
        qc.invalidateQueries({ queryKey: ["announcements"] });
        if (payload.eventType === "INSERT") toast.info(`New announcement: ${(payload.new as any).title}`);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, user]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-program font-semibold">Feed</p>
          <h1 className="font-display text-3xl font-bold mt-1">Announcements</h1>
          <p className="text-muted-foreground text-sm mt-1">Updates and paalala from your program leaders.</p>
        </div>
        {canPost && program && <NewAnnouncementDialog program={program} userId={user!.id} />}
      </div>

      {items.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-50" />
          No announcements yet.
        </CardContent></Card>
      )}

      <div className="space-y-3">
        {items.map((a) => <AnnouncementCard key={a.id} a={a} canDelete={role === "admin" || a.author_id === user!.id} />)}
      </div>
    </div>
  );
}

function AnnouncementCard({ a, canDelete }: { a: any; canDelete: boolean }) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").delete().eq("id", a.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements"] }); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card className={a.pinned ? "border-program/40" : ""}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {a.pinned && <Pin className="h-3.5 w-3.5 text-program" />}
            <CardTitle className="text-lg">{a.title}</CardTitle>
            <Badge variant="outline" className="capitalize">{a.program}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
        </div>
        {canDelete && <Button size="icon" variant="ghost" onClick={() => del.mutate()}><Trash2 className="h-4 w-4" /></Button>}
      </CardHeader>
      <CardContent><p className="whitespace-pre-wrap text-sm leading-relaxed">{a.body}</p></CardContent>
    </Card>
  );
}

function NewAnnouncementDialog({ program, userId }: { program: "vanguard" | "flow"; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        program, author_id: userId, title: form.title, body: form.body, pinned: form.pinned,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      setOpen(false); setForm({ title: "", body: "", pinned: false });
      toast.success("Announcement posted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Post announcement</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Message</Label><Textarea required rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: !!v })} /> Pin to top
          </label>
          <DialogFooter><Button type="submit" disabled={create.isPending}>{create.isPending ? "Posting…" : "Post"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
