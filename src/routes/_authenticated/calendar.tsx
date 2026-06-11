import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useUserContext } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalIcon, Video, Plus, Trash2, Link as LinkIcon, Unlink } from "lucide-react";
import { format, isAfter, addMinutes, subMinutes } from "date-fns";
import { toast } from "sonner";
import { getZoomConnection, getZoomAuthUrl, disconnectZoom, createZoomMeetingForSession } from "@/lib/zoom.functions";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
  validateSearch: (s: Record<string, unknown>) => ({ zoom: typeof s.zoom === "string" ? s.zoom : undefined }),
});

function CalendarPage() {
  const { user, role, program } = useUserContext();
  const qc = useQueryClient();
  const canEdit = role === "mentor" || role === "admin";

  const { data: sessions = [] } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions").select("*").order("starts_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const ch = supabase.channel("sessions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => {
        qc.invalidateQueries({ queryKey: ["sessions"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const upcoming = sessions.filter((s) => isAfter(new Date(s.ends_at), new Date()));
  const past = sessions.filter((s) => !isAfter(new Date(s.ends_at), new Date())).reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-program font-semibold">Schedule</p>
          <h1 className="font-display text-3xl font-bold mt-1">Sessions & Zoom Calls</h1>
          <p className="text-muted-foreground text-sm mt-1">Upcoming mentorship sessions for your program.</p>
        </div>
        {canEdit && program && <NewSessionDialog program={program} userId={user!.id} />}
      </div>

      {canEdit && <ZoomConnectionCard />}


      <Card>
        <CardHeader><CardTitle>Upcoming</CardTitle><CardDescription>{upcoming.length} session{upcoming.length === 1 ? "" : "s"}</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No upcoming sessions scheduled.</p>}
          {upcoming.map((s) => <SessionRow key={s.id} s={s} canEdit={canEdit && (role === "admin" || s.created_by === user!.id)} />)}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Past</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {past.slice(0, 10).map((s) => <SessionRow key={s.id} s={s} canEdit={false} muted />)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SessionRow({ s, canEdit, muted }: { s: any; canEdit: boolean; muted?: boolean }) {
  const qc = useQueryClient();
  const start = new Date(s.starts_at);
  const end = new Date(s.ends_at);
  const now = new Date();
  const joinable = now >= subMinutes(start, 15) && now <= addMinutes(end, 5);

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sessions").delete().eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sessions"] }); toast.success("Session deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border border-border p-4 ${muted ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <CalIcon className="h-4 w-4 text-program shrink-0" />
          <p className="font-semibold truncate">{s.title}</p>
          <Badge variant="outline" className="capitalize">{s.program}</Badge>
          {s.cohort && <Badge variant="secondary">{s.cohort}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {format(start, "EEE, MMM d · h:mm a")} – {format(end, "h:mm a")}
        </p>
        {s.description && <p className="text-sm mt-1">{s.description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {s.zoom_url && (
          <Button asChild size="sm" variant={joinable ? "default" : "outline"} disabled={!joinable && !muted ? false : false}>
            <a href={s.zoom_url} target="_blank" rel="noreferrer">
              <Video className="h-3.5 w-3.5 mr-1" /> {joinable ? "Join now" : "Zoom link"}
            </a>
          </Button>
        )}
        {canEdit && (
          <Button size="icon" variant="ghost" onClick={() => del.mutate()} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function NewSessionDialog({ program, userId }: { program: "vanguard" | "flow"; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", starts_at: "", ends_at: "", zoom_url: "", cohort: "" });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sessions").insert({
        program, mentor_id: userId, created_by: userId,
        title: form.title, description: form.description || null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        zoom_url: form.zoom_url || null, cohort: form.cohort || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      toast.success("Session created");
      setOpen(false);
      setForm({ title: "", description: "", starts_at: "", ends_at: "", zoom_url: "", cohort: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> New session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule a session</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Starts</Label><Input type="datetime-local" required value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Label>Ends</Label><Input type="datetime-local" required value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          </div>
          <div><Label>Zoom URL</Label><Input type="url" placeholder="https://zoom.us/j/…" value={form.zoom_url} onChange={(e) => setForm({ ...form, zoom_url: e.target.value })} /></div>
          <div><Label>Cohort (optional)</Label><Input value={form.cohort} onChange={(e) => setForm({ ...form, cohort: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <DialogFooter><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ZoomConnectionCard() {
  const qc = useQueryClient();
  const getConnFn = useServerFn(getZoomConnection);
  const getAuthFn = useServerFn(getZoomAuthUrl);
  const disconnectFn = useServerFn(disconnectZoom);
  const search = useSearch({ from: "/_authenticated/calendar" });

  const { data, isLoading } = useQuery({
    queryKey: ["zoom-conn"],
    queryFn: () => (getConnFn as any)({}),
  });

  useEffect(() => {
    if (search.zoom === "connected") toast.success("Zoom connected!");
    else if (search.zoom === "error") toast.error("Zoom connection failed.");
  }, [search.zoom]);

  const connect = useMutation({
    mutationFn: async () => (getAuthFn as any)({}),
    onSuccess: (r: any) => { window.location.href = r.url; },
    onError: (e) => toast.error((e as Error).message),
  });
  const disconnect = useMutation({
    mutationFn: async () => (disconnectFn as any)({}),
    onSuccess: () => { toast.success("Zoom disconnected"); qc.invalidateQueries({ queryKey: ["zoom-conn"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const conn = data?.connection;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5 text-program" /> Zoom integration</CardTitle>
        <CardDescription>
          {isLoading ? "Loading…" : conn
            ? `Connected as ${conn.zoom_email ?? "your Zoom account"}.`
            : "Connect your Zoom account to auto-create meetings for sessions."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {!conn ? (
          <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
            <LinkIcon className="mr-1.5 h-4 w-4" /> {connect.isPending ? "Redirecting…" : "Connect Zoom"}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            <Unlink className="mr-1.5 h-4 w-4" /> Disconnect Zoom
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
