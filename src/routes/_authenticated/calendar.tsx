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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalIcon, Video, Plus, Trash2, Link as LinkIcon, Unlink, AlertTriangle, ExternalLink, Copy, CheckCheck, CheckCircle2 } from "lucide-react";
import { format, isAfter, addMinutes, subMinutes } from "date-fns";
import { toast } from "sonner";
import { getZoomConnection, getZoomAuthUrl, getZoomSetupInfo, disconnectZoom, createZoomMeetingForSession } from "@/lib/zoom.functions";
import { createScheduledSession, listSessionParticipants } from "@/lib/sessions.functions";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
  validateSearch: (s: Record<string, unknown>) => ({
    zoom: typeof s.zoom === "string" ? s.zoom : undefined,
    reason: typeof s.reason === "string" ? s.reason : undefined,
  }),
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
  const createZoomFn = useServerFn(createZoomMeetingForSession);
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
  const createZoom = useMutation({
    mutationFn: async () => createZoomFn({ data: { sessionId: s.id } }),
    onSuccess: () => { toast.success("Zoom meeting created"); qc.invalidateQueries({ queryKey: ["sessions"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border border-border p-4 ${muted ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <CalIcon className="h-4 w-4 text-program shrink-0" />
          <p className="font-semibold truncate">{s.title}</p>
          <Badge variant="outline" className="capitalize">{s.program}</Badge>
          {s.cohort && <Badge variant="secondary">{s.cohort}</Badge>}
          {s.zoom_url && (
            <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 border-emerald-600/30">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Zoom Meeting Created
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {format(start, "EEE, MMM d · h:mm a")} – {format(end, "h:mm a")}
        </p>
        {s.description && <p className="text-sm mt-1">{s.description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {s.zoom_url ? (
          <Button asChild size="sm" variant={joinable ? "default" : "outline"}>
            <a href={s.zoom_url} target="_blank" rel="noreferrer">
              <Video className="h-3.5 w-3.5 mr-1" /> {joinable ? "Join now" : "Zoom link"}
            </a>
          </Button>
        ) : canEdit && !muted && (
          <Button size="sm" variant="outline" onClick={() => createZoom.mutate()} disabled={createZoom.isPending}>
            <Video className="h-3.5 w-3.5 mr-1" /> {createZoom.isPending ? "Creating…" : "Create Zoom"}
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
  const createSessionFn = useServerFn(createScheduledSession);
  const listParticipantsFn = useServerFn(listSessionParticipants);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    cohort: "",
    participant_id: "",
  });

  const { data: participantData } = useQuery({
    queryKey: ["session-participants", program],
    queryFn: () => (listParticipantsFn as any)({}),
    enabled: open,
  });
  const participants = participantData?.participants ?? [];

  const create = useMutation({
    mutationFn: async () => {
      return createSessionFn({
        data: {
          program,
          title: form.title,
          description: form.description || undefined,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: new Date(form.ends_at).toISOString(),
          cohort: form.cohort || undefined,
          participant_id: form.participant_id || undefined,
        },
      });
    },
    onSuccess: (result: any) => {
      qc.invalidateQueries({ queryKey: ["sessions"] });
      const msg = result?.zoomCreated
        ? `Session scheduled — Zoom meeting created${result.emailsSent ? ` and ${result.emailsSent} confirmation email(s) sent` : ""}.`
        : "Session created.";
      toast.success(msg);
      setOpen(false);
      setForm({ title: "", description: "", starts_at: "", ends_at: "", cohort: "", participant_id: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" /> New session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a session</DialogTitle>
          <DialogDescription>
            {program === "vanguard"
              ? "Creates a unique Zoom room, calendar links, and sends a confirmation email to your participant."
              : "Creates a Zoom room and sends calendar confirmations to you and your participant."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Starts</Label><Input type="datetime-local" required value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Label>Ends</Label><Input type="datetime-local" required value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
          </div>
          <div>
            <Label>{program === "vanguard" ? "Participant" : "Participant (optional)"}</Label>
            <Select
              value={form.participant_id || undefined}
              onValueChange={(v) => setForm({ ...form, participant_id: v })}
              required={program === "vanguard"}
            >
              <SelectTrigger>
                <SelectValue placeholder={participants.length ? "Select mentee…" : "No assigned mentees"} />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p: { id: string; full_name: string | null }) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || "Unnamed mentee"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Cohort (optional)</Label><Input value={form.cohort} onChange={(e) => setForm({ ...form, cohort: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <p className="text-xs text-muted-foreground">
            Zoom link is generated automatically when you save. Your Zoom account must be connected with <code className="text-[11px]">meeting:write</code> scope.
          </p>
          <DialogFooter><Button type="submit" disabled={create.isPending}>{create.isPending ? "Scheduling…" : "Schedule session"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ZoomConnectionCard() {
  const qc = useQueryClient();
  const getConnFn    = useServerFn(getZoomConnection);
  const getAuthFn    = useServerFn(getZoomAuthUrl);
  const setupInfoFn  = useServerFn(getZoomSetupInfo);
  const disconnectFn = useServerFn(disconnectZoom);
  const search = useSearch({ from: "/_authenticated/calendar" });

  const [notConfigured, setNotConfigured] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["zoom-conn"],
    queryFn: () => (getConnFn as any)({}),
  });
  const setupQuery = useQuery({
    queryKey: ["zoom-setup"],
    queryFn: () => (setupInfoFn as any)({}),
  });

  useEffect(() => {
    if (search.zoom === "connected") {
      toast.success("Zoom connected successfully!");
      setNotConfigured(false);
      qc.invalidateQueries({ queryKey: ["zoom-conn"] });
    } else if (search.zoom === "error") {
      toast.error(search.reason || "Zoom OAuth failed — check that your redirect URI matches exactly in the Zoom app settings.", { duration: 8000 });
      if (search.reason && /not configured|client id|client secret/i.test(search.reason)) {
        setNotConfigured(true);
      }
    }
  }, [search.zoom, search.reason, qc]);

  const connect = useMutation({
    mutationFn: async () => (getAuthFn as any)({}),
    onSuccess: (r: any) => { window.location.href = r.url; },
    onError: (e: any) => {
      const msg: string = e?.message ?? "";
      if (msg.toLowerCase().includes("zoom_client_id") || msg.toLowerCase().includes("not configured")) {
        setNotConfigured(true);
      } else {
        toast.error(msg);
      }
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => (disconnectFn as any)({}),
    onSuccess: () => {
      toast.success("Zoom disconnected.");
      qc.invalidateQueries({ queryKey: ["zoom-conn"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Prefer the server-authoritative redirect URI (built from PUBLIC_SITE_URL) so
  // users register the exact string the server sends to Zoom. Fall back to the
  // browser origin only until the query resolves.
  const callbackUrl =
    setupQuery.data?.redirectUri || `${window.location.origin}/api/public/zoom/callback`;

  const copyUrl = () => {
    navigator.clipboard.writeText(callbackUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const conn = data?.connection;

  // ── Connected state ──────────────────────────────────────────────────────
  if (!isLoading && conn) {
    return (
      <Card className="border-green-600/30 bg-green-600/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="h-5 w-5 text-green-500" />
            Zoom connected
          </CardTitle>
          <CardDescription>
            Signed in as <strong>{conn.zoom_email ?? "your Zoom account"}</strong>.
            Sessions will auto-create Zoom meetings when you click "Create Zoom" on a session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            <Unlink className="mr-1.5 h-3.5 w-3.5" />
            {disconnect.isPending ? "Disconnecting…" : "Disconnect Zoom"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Not configured — show setup guide ────────────────────────────────────
  if (notConfigured) {
    return (
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Zoom setup required
          </CardTitle>
          <CardDescription>
            <code className="text-xs">ZOOM_CLIENT_ID</code> and <code className="text-xs">ZOOM_CLIENT_SECRET</code> are
            not configured. Follow these steps to enable Zoom OAuth:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>
              Go to{" "}
              <a
                href="https://marketplace.zoom.us/develop/create"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2 inline-flex items-center gap-1"
              >
                marketplace.zoom.us <ExternalLink className="h-3 w-3" />
              </a>{" "}
              and create a new <strong className="text-foreground">User-managed OAuth app</strong>.
            </li>
            <li>
              Under <strong className="text-foreground">Redirect URL for OAuth</strong>, paste this exact URL:
              <div className="mt-1.5 flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 font-mono text-xs">
                <span className="flex-1 break-all">{callbackUrl}</span>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  aria-label="Copy URL"
                >
                  {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </li>
            <li>
              Copy the <strong className="text-foreground">Client ID</strong> and{" "}
              <strong className="text-foreground">Client Secret</strong> from your Zoom app.
            </li>
            <li>
              Add them to your environment (Lovable project settings or <code className="text-xs">.env</code>):
              <pre className="mt-1.5 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed">
{`ZOOM_CLIENT_ID="your_client_id_here"
ZOOM_CLIENT_SECRET="your_client_secret_here"
PUBLIC_SITE_URL="${window.location.origin}"`}
              </pre>
            </li>
            <li>Redeploy or restart the server, then click <strong className="text-foreground">Connect Zoom</strong> below.</li>
          </ol>
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => connect.mutate()}
              disabled={connect.isPending}
              size="sm"
            >
              <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
              {connect.isPending ? "Redirecting…" : "Connect Zoom"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setNotConfigured(false)}>
              Dismiss
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Default — not connected ───────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-program" /> Zoom integration
        </CardTitle>
        <CardDescription>
          {isLoading
            ? "Checking connection…"
            : "Connect your Zoom account to auto-create meetings for sessions."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={() => connect.mutate()} disabled={connect.isPending || isLoading}>
          <LinkIcon className="mr-1.5 h-4 w-4" />
          {connect.isPending ? "Redirecting to Zoom…" : "Connect Zoom"}
        </Button>
        <div className="rounded-md border border-border bg-muted/50 p-3 text-xs">
          <p className="mb-1.5 text-muted-foreground">
            Getting an <span className="font-semibold text-foreground">"Invalid redirect (4,700)"</span> error?
            Register this <em>exact</em> URL in your Zoom app (Redirect URL for OAuth <em>and</em> OAuth Allow List):
          </p>
          <div className="flex items-center gap-2 rounded border border-border bg-background px-2 py-1.5 font-mono">
            <span className="flex-1 break-all">{callbackUrl}</span>
            <button
              type="button"
              onClick={copyUrl}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Copy redirect URL"
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
