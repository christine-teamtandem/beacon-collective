import { createFileRoute } from "@tanstack/react-router";
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
  Inbox,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/compose")({
  component: ComposePage,
});

// ─── Types ─────────────────────────────────────────────────────────────────────

type TabId = "compose" | "scheduled" | "drafts" | "sent";

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

// ─── Local storage helpers ──────────────────────────────────────────────────────

const DRAFTS_KEY     = "compose_drafts_v1";
const SCHEDULED_KEY  = "compose_scheduled_v1";

const loadDrafts    = (): Draft[]          => { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]"); } catch { return []; } };
const saveDrafts    = (d: Draft[])         => localStorage.setItem(DRAFTS_KEY, JSON.stringify(d));
const loadScheduled = (): ScheduledEmail[] => { try { return JSON.parse(localStorage.getItem(SCHEDULED_KEY) || "[]"); } catch { return []; } };
const saveScheduled = (s: ScheduledEmail[]) => localStorage.setItem(SCHEDULED_KEY, JSON.stringify(s));

// ─── Tab bar ────────────────────────────────────────────────────────────────────

const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "compose",   label: "Compose",   icon: Send },
  { id: "scheduled", label: "Scheduled", icon: CalendarClock },
  { id: "drafts",    label: "Drafts",    icon: FileText },
  { id: "sent",      label: "Sent",      icon: History },
];

function TabBar({
  active,
  onChange,
  draftCount,
  scheduledCount,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  draftCount: number;
  scheduledCount: number;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border pb-0">
      {tabs.map(({ id, label, icon: Icon }) => {
        const count = id === "drafts" ? draftCount : id === "scheduled" ? scheduledCount : 0;
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={[
              "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
              "border-b-2 -mb-px",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {label}
            {count > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

function ComposePage() {
  const [activeTab, setActiveTab] = useState<TabId>("compose");

  const listFn = useServerFn(listAllowedRecipients);
  const sendFn = useServerFn(sendComposedEmail);
  const sentFn = useServerFn(listSentEmails);
  const aiFn   = useServerFn(generateEmailDraft);

  const { data, isLoading } = useQuery({
    queryKey: ["compose-recipients"],
    queryFn: () => (listFn as any)({}),
  });
  const sentQuery = useQuery({
    queryKey: ["compose-sent"],
    queryFn: () => (sentFn as any)({}),
    enabled: activeTab === "sent",
  });

  const recipients: Array<{ id: string; fullName: string; program: string | null; roles: string[] }> =
    data?.recipients ?? [];

  // ── Compose state ──
  const [selected,       setSelected]       = useState<Set<string>>(new Set());
  const [subject,        setSubject]        = useState("");
  const [body,           setBody]           = useState("");
  const [search,         setSearch]         = useState("");
  const [roleFilter,     setRoleFilter]     = useState("all");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [scheduleDate,   setScheduleDate]   = useState("");

  // ── AI state ──
  const [aiOpen,      setAiOpen]      = useState(false);
  const [aiReference, setAiReference] = useState("");
  const [aiContext,   setAiContext]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
      toast.success("Draft generated — review before sending.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAiReference((ev.target?.result as string) || "");
      toast.success(`Loaded "${file.name}"`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Drafts ──
  const [drafts, setDrafts] = useState<Draft[]>([]);
  useEffect(() => { setDrafts(loadDrafts()); }, []);

  // ── Scheduled ──
  const [scheduled, setScheduled] = useState<ScheduledEmail[]>([]);
  useEffect(() => { setScheduled(loadScheduled()); }, []);

  // ── Filtering ──
  const filtered = useMemo(() =>
    recipients.filter((r) => {
      if (search && !r.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && !r.roles.includes(roleFilter)) return false;
      return true;
    }),
    [recipients, search, roleFilter]
  );

  const availableRoles = useMemo(() => {
    const s = new Set<string>();
    recipients.forEach((r) => r.roles.forEach((x) => s.add(x)));
    return Array.from(s).sort();
  }, [recipients]);

  const recipientName = (id: string) =>
    recipients.find((r) => r.id === id)?.fullName ?? id.slice(0, 8) + "…";

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

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
      setActiveTab("sent");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ── Draft actions ──
  const saveDraft = () => {
    if (!subject.trim() && !body.trim() && selected.size === 0) {
      toast.error("Nothing to save."); return;
    }
    const id = editingDraftId ?? crypto.randomUUID();
    const draft: Draft = { id, subject, body, recipientIds: Array.from(selected), updatedAt: Date.now() };
    const next = [draft, ...drafts.filter((d) => d.id !== id)];
    setDrafts(next); saveDrafts(next); setEditingDraftId(id);
    toast.success("Draft saved.");
  };

  const openDraft = (d: Draft) => {
    setSubject(d.subject); setBody(d.body);
    setSelected(new Set(d.recipientIds)); setEditingDraftId(d.id);
    setActiveTab("compose");
  };

  const deleteDraft = (id: string) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next); saveDrafts(next);
    if (editingDraftId === id) setEditingDraftId(null);
    toast.success("Draft deleted.");
  };

  // ── Schedule actions ──
  const scheduleEmail = () => {
    if (!scheduleDate) { toast.error("Pick a send date/time first."); return; }
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
    setActiveTab("scheduled");
  };

  const loadScheduledIntoComposer = (s: ScheduledEmail) => {
    setSubject(s.subject); setBody(s.body); setSelected(new Set(s.recipientIds));
    const next = scheduled.filter((x) => x.id !== s.id);
    setScheduled(next); saveScheduled(next);
    setActiveTab("compose");
    toast("Loaded into composer — press Send when ready.");
  };

  const deleteScheduled = (id: string) => {
    const next = scheduled.filter((x) => x.id !== id);
    setScheduled(next); saveScheduled(next);
    toast.success("Scheduled email removed.");
  };

  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-program font-semibold">Hub</p>
        <h1 className="font-display text-3xl font-bold mt-1 flex items-center gap-2">
          <Mail className="h-7 w-7 text-program" /> Email Dashboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Compose branded emails, schedule campaigns, manage drafts, and review send history.
        </p>
      </div>

      {/* Tab bar */}
      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        draftCount={drafts.length}
        scheduledCount={scheduled.length}
      />

      {/* ── COMPOSE VIEW ────────────────────────────────────────────────────── */}
      {activeTab === "compose" && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">

          {/* Left: AI assistant + message form */}
          <div className="space-y-4">

            {/* AI assistant panel */}
            <Card className="border-gold/40">
              <CardHeader
                className="cursor-pointer select-none pb-3"
                onClick={() => setAiOpen((o) => !o)}
              >
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-gold" />
                    <span className="text-gold font-semibold">AI Email Assistant</span>
                  </span>
                  {aiOpen
                    ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
                {!aiOpen && (
                  <CardDescription className="text-xs">
                    Paste a reference email or notes — AI generates a polished draft matching your tone.
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
                        Paste an existing email, bullet points, or style notes. The AI will match its exact tone and structure.
                      </p>
                      <Textarea
                        value={aiReference}
                        onChange={(e) => setAiReference(e.target.value)}
                        placeholder="Paste reference email text, template, or content guidelines here…"
                        rows={8}
                        className="resize-y font-mono text-sm"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          ref={fileRef}
                          type="file"
                          accept=".txt,.md,.html,.eml"
                          className="hidden"
                          onChange={handleFile}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs border-dashed"
                          onClick={() => fileRef.current?.click()}
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
                      disabled={aiMutation.isPending || !aiReference.trim()}
                      className="w-full bg-gold text-gold-foreground hover:bg-gold/90 font-bold tracking-wide gap-2"
                    >
                      {aiMutation.isPending ? (
                        <><RefreshCw className="h-4 w-4 animate-spin" /> Generating draft…</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Generate Draft with AI</>
                      )}
                    </Button>
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
                  <p className="text-xs text-muted-foreground">{body.length} / 10 000</p>
                </div>

                {/* Optional schedule date */}
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

                {/* Action row */}
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
                        disabled={!selected.size || !subject.trim() || !body.trim()}
                      >
                        <CalendarClock className="mr-1.5 h-4 w-4" /> Schedule
                      </Button>
                    )}
                    <Button variant="ghost" onClick={clearComposer}>Clear</Button>
                    <Button
                      onClick={() => send.mutate()}
                      disabled={send.isPending || !selected.size || !subject.trim() || !body.trim()}
                    >
                      <Send className="mr-1.5 h-4 w-4" />
                      {send.isPending ? "Sending…" : "Send email"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: recipients picker */}
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
                  placeholder="Search…"
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant={roleFilter === "all" ? "default" : "outline"} onClick={() => setRoleFilter("all")}>
                  all
                </Button>
                {availableRoles.map((r) => (
                  <Button key={r} size="sm" variant={roleFilter === r ? "default" : "outline"} onClick={() => setRoleFilter(r)}>
                    {r}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => { const next = new Set(selected); filtered.forEach((r) => next.add(r.id)); setSelected(next); }}>
                  Select visible
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
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
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
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
      )}

      {/* ── SCHEDULED VIEW ───────────────────────────────────────────────────── */}
      {activeTab === "scheduled" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-gold" /> Scheduled emails
            </CardTitle>
            <CardDescription>
              Emails queued for a future send time. Use "Send now" to dispatch immediately, or delete to cancel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scheduled.length === 0 ? (
              <EmptyState
                icon={<CalendarClock className="h-10 w-10" />}
                heading="No scheduled emails"
                body="Compose a message, pick a future date, and click Schedule."
                action={<Button variant="outline" onClick={() => setActiveTab("compose")}>
                  <Send className="mr-1.5 h-4 w-4" /> Go to Compose
                </Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4 font-semibold">Subject</th>
                      <th className="pb-3 pr-4 font-semibold">Recipients</th>
                      <th className="pb-3 pr-4 font-semibold">Scheduled Date</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {scheduled
                      .sort((a, b) => a.scheduledAt - b.scheduledAt)
                      .map((s) => {
                        const isPast = s.scheduledAt <= Date.now();
                        return (
                          <tr key={s.id} className="align-top">
                            <td className="py-3 pr-4">
                              <p className="font-medium">
                                {s.subject || <span className="italic text-muted-foreground">No subject</span>}
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.body}</p>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="font-medium">{s.recipientIds.length}</span>
                              <span className="ml-1 text-muted-foreground">
                                {s.recipientIds.length === 1 ? "person" : "people"}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={isPast ? "font-semibold text-destructive" : ""}>
                                {new Date(s.scheduledAt).toLocaleString()}
                              </span>
                              {isPast && (
                                <Badge variant="destructive" className="ml-2 text-[10px] py-0">Overdue</Badge>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-gold/40 text-gold hover:bg-gold/10 text-xs"
                                  onClick={() => loadScheduledIntoComposer(s)}
                                >
                                  <Send className="mr-1 h-3 w-3" /> Send now
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteScheduled(s.id)}
                                  aria-label="Cancel scheduled email"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── DRAFTS VIEW ──────────────────────────────────────────────────────── */}
      {activeTab === "drafts" && (
        <Card>
          <CardHeader>
            <CardTitle>Saved drafts</CardTitle>
            <CardDescription>
              Drafts are stored in this browser. Click Resume to continue editing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {drafts.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-10 w-10" />}
                heading="No drafts saved"
                body="Start writing a message and click Save draft to store your work."
                action={<Button variant="outline" onClick={() => setActiveTab("compose")}>
                  <Send className="mr-1.5 h-4 w-4" /> Go to Compose
                </Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4 font-semibold">Subject</th>
                      <th className="pb-3 pr-4 font-semibold">Recipients</th>
                      <th className="pb-3 pr-4 font-semibold">Last Saved</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {drafts.map((d) => (
                      <tr key={d.id} className="align-top">
                        <td className="py-3 pr-4">
                          <p className="font-medium">
                            {d.subject || <span className="italic text-muted-foreground">No subject</span>}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {d.body || "Empty message"}
                          </p>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="font-medium">{d.recipientIds.length}</span>
                          <span className="ml-1 text-muted-foreground">
                            {d.recipientIds.length === 1 ? "person" : "people"}
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {d.recipientIds.slice(0, 3).map((id) => (
                              <Badge key={id} variant="outline" className="text-[10px] py-0">
                                {recipientName(id)}
                              </Badge>
                            ))}
                            {d.recipientIds.length > 3 && (
                              <span className="text-[11px] text-muted-foreground">
                                +{d.recipientIds.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {new Date(d.updatedAt).toLocaleString()}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => openDraft(d)}
                            >
                              <ArrowUpRight className="mr-1 h-3 w-3" /> Resume
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => deleteDraft(d.id)}
                              aria-label="Delete draft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── SENT VIEW ────────────────────────────────────────────────────────── */}
      {activeTab === "sent" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Send history</CardTitle>
                <CardDescription className="mt-1">
                  Your last 200 sends, grouped by campaign batch.
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
              <p className="py-4 text-sm text-muted-foreground">Loading…</p>
            ) : !sentQuery.data?.batches?.length ? (
              <EmptyState
                icon={<Inbox className="h-10 w-10" />}
                heading="No emails sent yet"
                body="Your send history will appear here after your first campaign."
                action={<Button variant="outline" onClick={() => setActiveTab("compose")}>
                  <Send className="mr-1.5 h-4 w-4" /> Go to Compose
                </Button>}
              />
            ) : (
              <div className="space-y-4">
                {sentQuery.data.batches.map((b: any) => (
                  <SentBatchCard key={b.stamp} batch={b} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sent batch card ───────────────────────────────────────────────────────────

function SentBatchCard({ batch }: { batch: any }) {
  const [expanded, setExpanded] = useState(false);
  const failed  = batch.recipients.filter((r: any) => r.status === "failed" || r.status === "dlq");
  const sent    = batch.recipients.filter((r: any) => r.status === "sent");
  const pending = batch.recipients.filter((r: any) => r.status === "pending");
  const hasErrors = failed.length > 0;

  return (
    <div className={`rounded-lg border ${hasErrors ? "border-destructive/40" : "border-border"} bg-card`}>
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            Campaign &middot; {batch.total} recipient{batch.total === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {new Date(batch.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {sent.length > 0 && (
            <Badge className="bg-green-600/15 text-green-700 dark:text-green-400 text-[10px]">
              ✓ {sent.length} sent
            </Badge>
          )}
          {pending.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              ⏳ {pending.length} pending
            </Badge>
          )}
          {failed.length > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              ✕ {failed.length} failed
            </Badge>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ml-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {expanded ? "Hide" : "Details"}
          </button>
        </div>
      </div>

      {/* Inline error summary — always visible when there are failures */}
      {hasErrors && !expanded && (
        <div className="mx-4 mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-xs font-semibold text-destructive mb-1">
            {failed.length} recipient{failed.length === 1 ? "" : "s"} failed
          </p>
          {/* Show the first unique error message */}
          {failed[0]?.error && (
            <p className="text-xs text-muted-foreground font-mono break-all">
              {failed[0].error}
            </p>
          )}
        </div>
      )}

      {/* Expanded: per-recipient detail table */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 pr-4 font-semibold">Recipient</th>
                  <th className="pb-2 pr-4 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Error / Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batch.recipients.map((r: any, i: number) => (
                  <tr key={`${r.email}-${i}`} className="align-top">
                    <td className="py-2 pr-4 font-mono">{r.email}</td>
                    <td className="py-2 pr-4">
                      {r.status === "sent" && (
                        <span className="font-semibold text-green-600 dark:text-green-400">Sent</span>
                      )}
                      {(r.status === "failed" || r.status === "dlq") && (
                        <span className="font-semibold text-destructive">Failed</span>
                      )}
                      {r.status === "pending" && (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </td>
                    <td className="py-2 text-muted-foreground break-all">
                      {r.error || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared empty state ─────────────────────────────────────────────────────────

function EmptyState({
  icon,
  heading,
  body,
  action,
}: {
  icon: React.ReactNode;
  heading: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="text-muted-foreground/30">{icon}</div>
      <p className="font-semibold text-foreground">{heading}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
