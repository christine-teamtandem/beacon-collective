import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  listAllowedRecipients,
  sendComposedEmail,
  listSentEmails,
  generateEmailDraft,
} from "@/lib/compose.functions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  Send,
  Search,
  FileText,
  History,
  Trash2,
  ArrowUpRight,
  Clock,
  Sparkles,
  Upload,
  ChevronDown,
  ChevronUp,
  CalendarClock,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/compose")({
  validateSearch: (search) => ({
    tab: (["compose", "scheduled", "drafts", "sent"].includes(search.tab as string)
      ? (search.tab as string)
      : "compose") as "compose" | "scheduled" | "drafts" | "sent",
  }),
  component: ComposePage,
});

// ─── Local storage types ───────────────────────────────────────────────────────

interface Draft {
  id: string;
  subject: string;
  body: string;
  recipientIds: string[];
  updatedAt: number;
}

interface ScheduledEmail {
  id: string;
  subject: string;
  body: string;
  recipientIds: string[];
  scheduledAt: number;
  createdAt: number;
}

const DRAFTS_KEY = "compose_drafts_v1";
const SCHEDULED_KEY = "compose_scheduled_v1";

function loadDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]"); }
  catch { return []; }
}
function saveDrafts(d: Draft[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(d));
}
function loadScheduled(): ScheduledEmail[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SCHEDULED_KEY) || "[]"); }
  catch { return []; }
}
function saveScheduled(s: ScheduledEmail[]) {
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(s));
}

// ─── Main component ────────────────────────────────────────────────────────────

function ComposePage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();

  const setTab = (t: string) =>
    navigate({
      to: "/compose",
      search: { tab: t as "compose" | "scheduled" | "drafts" | "sent" },
    });

  const listFn  = useServerFn(listAllowedRecipients);
  const sendFn  = useServerFn(sendComposedEmail);
  const sentFn  = useServerFn(listSentEmails);
  const aiFn    = useServerFn(generateEmailDraft);

  const { data, isLoading } = useQuery({
    queryKey: ["compose-recipients"],
    queryFn: () => (listFn as any)({}),
  });
  const sentQuery = useQuery({
    queryKey: ["compose-sent"],
    queryFn: () => (sentFn as any)({}),
  });

  const recipients: Array<{
    id: string; fullName: string; program: string | null; roles: string[];
  }> = data?.recipients ?? [];

  // ── Compose form state ──
  const [selected,        setSelected]        = useState<Set<string>>(new Set());
  const [subject,         setSubject]         = useState("");
  const [body,            setBody]            = useState("");
  const [search,          setSearch]          = useState("");
  const [roleFilter,      setRoleFilter]      = useState<string>("all");
  const [editingDraftId,  setEditingDraftId]  = useState<string | null>(null);
  const [scheduleDate,    setScheduleDate]    = useState("");

  // ── AI assistant state ──
  const [aiOpen,          setAiOpen]          = useState(false);
  const [aiReference,     setAiReference]     = useState("");
  const [aiContext,       setAiContext]        = useState("");
  const referenceFileRef = useRef<HTMLInputElement>(null);

  const aiMutation = useMutation({
    mutationFn: () =>
      (aiFn as any)({
        data: {
          reference: aiReference.trim(),
          subject: subject.trim() || undefined,
          context: aiContext.trim() || undefined,
        },
      }),
    onSuccess: (res: any) => {
      setBody(res.draft);
      toast.success("Draft generated — review and refine before sending.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const handleReferenceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAiReference((ev.target?.result as string) || "");
      toast.success(`Loaded "${file.name}"`);
    };
    reader.readAsText(file);
  };

  // ── Drafts state ──
  const [drafts, setDrafts] = useState<Draft[]>([]);
  useEffect(() => { setDrafts(loadDrafts()); }, []);

  // ── Scheduled state ──
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  useEffect(() => { setScheduled(loadScheduled()); }, []);

  // ── Filtering ──
  const filtered = useMemo(() => {
    return recipients.filter((r) => {
      if (search && !r.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && !r.roles.includes(roleFilter)) return false;
      return true;
    });
  }, [recipients, search, roleFilter]);

  const availableRoles = useMemo(() => {
    const s = new Set<string>();
    recipients.forEach((r) => r.roles.forEach((x) => s.add(x)));
    return Array.from(s).sort();
  }, [recipients]);

  const recipientName = (id: string) =>
    recipients.find((r) => r.id === id)?.fullName ?? id.slice(0, 8);

  // ── Recipient toggles ──
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const selectAllVisible = () => {
    const next = new Set(selected);
    filtered.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const clearAll = () => setSelected(new Set());

  const clearComposer = () => {
    setSubject(""); setBody(""); setSelected(new Set());
    setEditingDraftId(null); setScheduleDate("");
    setAiReference(""); setAiContext("");
  };

  // ── Send ──
  const send = useMutation({
    mutationFn: () =>
      (sendFn as any)({
        data: {
          recipientIds: Array.from(selected),
          subject: subject.trim(),
          body: body.trim(),
        },
      }),
    onSuccess: (res: any) => {
      toast.success(`Queued ${res.sent}/${res.total} emails.`);
      if (editingDraftId) {
        const next = drafts.filter((d) => d.id !== editingDraftId);
        setDrafts(next); saveDrafts(next);
      }
      clearComposer();
      sentQuery.refetch();
      setTab("sent");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // ── Save draft ──
  const saveDraft = () => {
    if (!subject.trim() && !body.trim() && selected.size === 0) {
      toast.error("Nothing to save."); return;
    }
    const id = editingDraftId ?? crypto.randomUUID();
    const draft: Draft = { id, subject, body, recipientIds: Array.from(selected), updatedAt: Date.now() };
    const next = [draft, ...drafts.filter((d) => d.id !== id)];
    setDrafts(next); saveDrafts(next);
    setEditingDraftId(id);
    toast.success("Draft saved.");
  };

  const openDraft = (d: Draft) => {
    setSubject(d.subject); setBody(d.body);
    setSelected(new Set(d.recipientIds)); setEditingDraftId(d.id);
    setTab("compose");
  };

  const deleteDraft = (id: string) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next); saveDrafts(next);
    if (editingDraftId === id) setEditingDraftId(null);
    toast.success("Draft deleted.");
  };

  // ── Schedule ──
  const scheduleEmail = () => {
    if (!scheduleDate) { toast.error("Pick a send date and time first."); return; }
    if (!subject.trim() || !body.trim()) { toast.error("Subject and message are required."); return; }
    if (selected.size === 0) { toast.error("Select at least one recipient."); return; }
    const scheduledAt = new Date(scheduleDate).getTime();
    if (scheduledAt <= Date.now()) { toast.error("Scheduled time must be in the future."); return; }
    const entry: ScheduledEmail = {
      id: crypto.randomUUID(), subject, body,
      recipientIds: Array.from(selected), scheduledAt, createdAt: Date.now(),
    };
    const next = [entry, ...scheduled];
    setScheduled(next); saveScheduled(next);
    if (editingDraftId) {
      const nd = drafts.filter((d) => d.id !== editingDraftId);
      setDrafts(nd); saveDrafts(nd);
    }
    clearComposer();
    toast.success("Email scheduled.");
    setTab("scheduled");
  };

  const sendScheduled = (s: ScheduledEmail) => {
    setSubject(s.subject); setBody(s.body);
    setSelected(new Set(s.recipientIds));
    const next = scheduled.filter((x) => x.id !== s.id);
    setScheduled(next); saveScheduled(next);
    setTab("compose");
    toast("Loaded into composer — press Send when ready.");
  };

  const deleteScheduled = (id: string) => {
    const next = scheduled.filter((x) => x.id !== id);
    setScheduled(next); saveScheduled(next);
    toast.success("Scheduled email removed.");
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-program font-semibold">Hub</p>
        <h1 className="font-display text-3xl font-bold mt-1 flex items-center gap-2">
          <Mail className="h-7 w-7 text-program" /> Email Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compose branded emails, schedule campaigns, manage drafts, and review send history.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="gap-0.5">
          <TabsTrigger value="compose" className="gap-1.5">
            <Send className="h-4 w-4" /> Compose
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-1.5">
            <CalendarClock className="h-4 w-4" /> Scheduled
            {scheduled.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {scheduled.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-1.5">
            <FileText className="h-4 w-4" /> Drafts
            {drafts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                {drafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-1.5">
            <History className="h-4 w-4" /> Sent
          </TabsTrigger>
        </TabsList>

        {/* ── COMPOSE TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="compose" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">

            {/* Left column */}
            <div className="space-y-4">

              {/* AI Assistant panel */}
              <Card className="border-gold/40 bg-card">
                <CardHeader
                  className="cursor-pointer select-none pb-3"
                  onClick={() => setAiOpen((o) => !o)}
                >
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-gold" />
                      <span className="text-gold font-semibold">AI Email Assistant</span>
                    </span>
                    <span className="text-muted-foreground">
                      {aiOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </CardTitle>
                  {!aiOpen && (
                    <CardDescription className="text-xs">
                      Paste a reference email or content notes — AI generates a polished draft matching your tone.
                    </CardDescription>
                  )}
                </CardHeader>

                {aiOpen && (
                  <>
                    <Separator className="bg-gold/20" />
                    <CardContent className="space-y-4 pt-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-semibold text-gold">
                          Reference Email / Content Guidelines
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Paste an existing email, template, bullet points, or style notes. The AI will match its exact tone and structure.
                        </p>
                        <Textarea
                          value={aiReference}
                          onChange={(e) => setAiReference(e.target.value)}
                          placeholder="Paste reference email text, template, or content guidelines here..."
                          rows={8}
                          className="resize-y font-mono text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            ref={referenceFileRef}
                            type="file"
                            accept=".txt,.md,.html,.eml"
                            className="hidden"
                            onChange={handleReferenceFile}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs border-dashed"
                            onClick={() => referenceFileRef.current?.click()}
                          >
                            <Upload className="h-3.5 w-3.5" /> Upload text file
                          </Button>
                          {aiReference.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {aiReference.length.toLocaleString()} chars loaded
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Additional context (optional)
                        </Label>
                        <Input
                          value={aiContext}
                          onChange={(e) => setAiContext(e.target.value)}
                          placeholder="e.g. This is for Week 3 mentees, keep it warm and motivating"
                          className="text-sm"
                        />
                      </div>

                      <Button
                        onClick={() => aiMutation.mutate()}
                        disabled={
                          aiMutation.isPending ||
                          aiReference.trim().length === 0
                        }
                        className="w-full bg-gold text-gold-foreground hover:bg-gold/90 font-bold tracking-wide gap-2"
                      >
                        {aiMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Generating draft...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Generate Draft with AI
                          </>
                        )}
                      </Button>

                      {aiMutation.isPending && (
                        <p className="text-center text-xs text-muted-foreground animate-pulse">
                          Analyzing reference material and crafting your message…
                        </p>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>

              {/* Message composer */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Message</span>
                    {editingDraftId && (
                      <Badge variant="outline" className="text-[10px]">Editing draft</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Plain text — double line breaks become separate paragraphs in the email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Subject</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      maxLength={200}
                      placeholder="Subject line"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Message</Label>
                    <Textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      maxLength={10000}
                      rows={14}
                      placeholder="Type your message here, or use AI to generate a draft above…"
                    />
                    <p className="text-xs text-muted-foreground">{body.length}/10 000</p>
                  </div>

                  {/* Schedule date picker */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> Schedule for later (optional)
                    </Label>
                    <Input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                      className="text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-sm text-muted-foreground">
                      {selected.size === 0
                        ? "No recipients selected."
                        : `${selected.size} recipient${selected.size === 1 ? "" : "s"} selected.`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={saveDraft}>
                        <FileText className="mr-1.5 h-4 w-4" /> Save draft
                      </Button>
                      {scheduleDate && (
                        <Button
                          variant="outline"
                          className="border-gold/50 text-gold hover:bg-gold/10"
                          onClick={scheduleEmail}
                          disabled={
                            selected.size === 0 || !subject.trim() || !body.trim()
                          }
                        >
                          <CalendarClock className="mr-1.5 h-4 w-4" /> Schedule
                        </Button>
                      )}
                      <Button variant="ghost" onClick={clearComposer}>Clear</Button>
                      <Button
                        onClick={() => send.mutate()}
                        disabled={
                          send.isPending ||
                          selected.size === 0 ||
                          !subject.trim() ||
                          !body.trim()
                        }
                      >
                        <Send className="mr-1.5 h-4 w-4" />
                        {send.isPending ? "Sending…" : "Send email"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column — recipients */}
            <Card>
              <CardHeader>
                <CardTitle>Recipients</CardTitle>
                <CardDescription>{recipients.length} people you can email.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant={roleFilter === "all" ? "default" : "outline"}
                    onClick={() => setRoleFilter("all")}
                  >all</Button>
                  {availableRoles.map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={roleFilter === r ? "default" : "outline"}
                      onClick={() => setRoleFilter(r)}
                    >{r}</Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Button size="sm" variant="ghost" onClick={selectAllVisible}>Select visible</Button>
                  <Button size="sm" variant="ghost" onClick={clearAll}>Clear</Button>
                </div>
                <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
                  {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
                  {!isLoading && filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground">No one matches.</p>
                  )}
                  {filtered.map((r) => (
                    <label
                      key={r.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-muted"
                    >
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={() => toggle(r.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.fullName}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {r.roles.map((x) => (
                            <Badge key={x} variant="outline" className="capitalize text-[10px] py-0">{x}</Badge>
                          ))}
                          {r.program && (
                            <Badge variant="outline" className="capitalize text-[10px] py-0">{r.program}</Badge>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── SCHEDULED TAB ────────────────────────────────────────────────── */}
        <TabsContent value="scheduled" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-gold" /> Scheduled emails
              </CardTitle>
              <CardDescription>
                Emails queued for a future send time. Open one to send immediately or remove it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scheduled.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No scheduled emails yet.</p>
                  <p className="text-xs text-muted-foreground">
                    Compose a message, pick a date, and click "Schedule".
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {scheduled
                    .sort((a, b) => a.scheduledAt - b.scheduledAt)
                    .map((s) => {
                      const isPast = s.scheduledAt <= Date.now();
                      return (
                        <li key={s.id} className="flex items-start justify-between gap-3 py-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">
                                {s.subject || <span className="italic text-muted-foreground">No subject</span>}
                              </p>
                              {isPast && (
                                <Badge variant="destructive" className="text-[10px] py-0">
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                              {s.body || "Empty message"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span className={isPast ? "text-destructive font-semibold" : ""}>
                                {new Date(s.scheduledAt).toLocaleString()}
                              </span>
                              <span>•</span>
                              <span>{s.recipientIds.length} recipient{s.recipientIds.length === 1 ? "" : "s"}</span>
                              {s.recipientIds.slice(0, 3).map((id) => (
                                <Badge key={id} variant="outline" className="text-[10px] py-0">
                                  {recipientName(id)}
                                </Badge>
                              ))}
                              {s.recipientIds.length > 3 && (
                                <span>+{s.recipientIds.length - 3} more</span>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gold/40 text-gold hover:bg-gold/10"
                              onClick={() => sendScheduled(s)}
                            >
                              <Send className="mr-1 h-3.5 w-3.5" /> Send now
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteScheduled(s.id)}
                              aria-label="Delete scheduled email"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DRAFTS TAB ───────────────────────────────────────────────────── */}
        <TabsContent value="drafts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved drafts</CardTitle>
              <CardDescription>
                Drafts are stored on this device. Open one to continue editing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {drafts.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No drafts yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {drafts.map((d) => (
                    <li key={d.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {d.subject || <span className="italic text-muted-foreground">No subject</span>}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {d.body || "Empty message"}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span>{new Date(d.updatedAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>{d.recipientIds.length} recipient{d.recipientIds.length === 1 ? "" : "s"}</span>
                          {d.recipientIds.slice(0, 3).map((id) => (
                            <Badge key={id} variant="outline" className="text-[10px] py-0">
                              {recipientName(id)}
                            </Badge>
                          ))}
                          {d.recipientIds.length > 3 && (
                            <span>+{d.recipientIds.length - 3} more</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="sm" variant="outline" onClick={() => openDraft(d)}>
                          <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> Open
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDraft(d.id)}
                          aria-label="Delete draft"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SENT TAB ─────────────────────────────────────────────────────── */}
        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Send history</CardTitle>
                  <CardDescription className="mt-1">
                    Your last 200 sends. Status reflects what the email server reported.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sentQuery.refetch()}
                  disabled={sentQuery.isFetching}
                >
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${sentQuery.isFetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sentQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : !sentQuery.data?.batches?.length ? (
                <div className="py-8 text-center space-y-2">
                  <History className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">You haven't sent anything yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {sentQuery.data.batches.map((b: any) => (
                    <li key={b.stamp} className="space-y-1.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          {new Date(b.createdAt).toLocaleString()}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {b.total} total
                          </Badge>
                          {b.sent > 0 && (
                            <Badge className="bg-green-600/15 text-green-700 hover:bg-green-600/20 dark:text-green-400 text-[10px]">
                              {b.sent} sent
                            </Badge>
                          )}
                          {b.pending > 0 && (
                            <Badge variant="secondary" className="text-[10px]">
                              {b.pending} pending
                            </Badge>
                          )}
                          {b.failed > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              {b.failed} failed
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {b.recipients.slice(0, 8).map((r: any, i: number) => (
                          <Badge
                            key={`${r.email}-${i}`}
                            variant="outline"
                            className="text-[10px] py-0"
                            title={r.error ?? r.status}
                          >
                            {r.email}
                          </Badge>
                        ))}
                        {b.recipients.length > 8 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{b.recipients.length - 8} more
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
