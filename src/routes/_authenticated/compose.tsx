import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import {
  listAllowedRecipients,
  sendComposedEmail,
  listSentEmails,
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
import { Mail, Send, Search, FileText, History, Trash2, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/compose")({
  component: ComposePage,
});

interface Draft {
  id: string;
  subject: string;
  body: string;
  recipientIds: string[];
  updatedAt: number;
}

const DRAFTS_KEY = "compose_drafts_v1";

function loadDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveDrafts(d: Draft[]) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(d));
}

function ComposePage() {
  const listFn = useServerFn(listAllowedRecipients);
  const sendFn = useServerFn(sendComposedEmail);
  const sentFn = useServerFn(listSentEmails);

  const { data, isLoading } = useQuery({
    queryKey: ["compose-recipients"],
    queryFn: () => (listFn as any)({}),
  });
  const sentQuery = useQuery({
    queryKey: ["compose-sent"],
    queryFn: () => (sentFn as any)({}),
  });

  const recipients: Array<{
    id: string;
    fullName: string;
    program: string | null;
    roles: string[];
  }> = data?.recipients ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [tab, setTab] = useState("compose");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(loadDrafts());
  }, []);

  const filtered = useMemo(() => {
    return recipients.filter((r) => {
      if (search && !r.fullName.toLowerCase().includes(search.toLowerCase())) return false;
      if (roleFilter !== "all" && !r.roles.includes(roleFilter)) return false;
      return true;
    });
  }, [recipients, search, roleFilter]);

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
    setSubject("");
    setBody("");
    setSelected(new Set());
    setEditingDraftId(null);
  };

  const send = useMutation({
    mutationFn: async () =>
      sendFn({
        data: {
          recipientIds: Array.from(selected),
          subject: subject.trim(),
          body: body.trim(),
        },
      }),
    onSuccess: (res: any) => {
      toast.success(`Queued ${res.sent}/${res.total} emails.`);
      // remove draft if we sent from one
      if (editingDraftId) {
        const next = drafts.filter((d) => d.id !== editingDraftId);
        setDrafts(next);
        saveDrafts(next);
      }
      clearComposer();
      sentQuery.refetch();
      setTab("sent");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const saveDraft = () => {
    if (!subject.trim() && !body.trim() && selected.size === 0) {
      toast.error("Nothing to save.");
      return;
    }
    const id = editingDraftId ?? crypto.randomUUID();
    const draft: Draft = {
      id,
      subject,
      body,
      recipientIds: Array.from(selected),
      updatedAt: Date.now(),
    };
    const next = [draft, ...drafts.filter((d) => d.id !== id)];
    setDrafts(next);
    saveDrafts(next);
    setEditingDraftId(id);
    toast.success("Draft saved.");
  };

  const openDraft = (d: Draft) => {
    setSubject(d.subject);
    setBody(d.body);
    setSelected(new Set(d.recipientIds));
    setEditingDraftId(d.id);
    setTab("compose");
  };

  const deleteDraft = (id: string) => {
    const next = drafts.filter((d) => d.id !== id);
    setDrafts(next);
    saveDrafts(next);
    if (editingDraftId === id) setEditingDraftId(null);
    toast.success("Draft deleted.");
  };

  const availableRoles = useMemo(() => {
    const s = new Set<string>();
    recipients.forEach((r) => r.roles.forEach((x) => s.add(x)));
    return Array.from(s).sort();
  }, [recipients]);

  const recipientName = (id: string) =>
    recipients.find((r) => r.id === id)?.fullName ?? id.slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-program font-semibold">Hub</p>
        <h1 className="font-display text-3xl font-bold mt-1 flex items-center gap-2">
          <Mail className="h-7 w-7 text-program" /> Compose email
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send a branded email to people in the hub. Save drafts locally and review your send history.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="compose" className="gap-1.5">
            <Send className="h-4 w-4" /> Compose
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

        <TabsContent value="compose" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Message</span>
                  {editingDraftId && (
                    <Badge variant="outline" className="text-[10px]">Editing draft</Badge>
                  )}
                </CardTitle>
                <CardDescription>Plain text — line breaks become paragraphs.</CardDescription>
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
                    placeholder="Type your message here..."
                  />
                  <p className="text-xs text-muted-foreground">{body.length}/10000</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <p className="text-sm text-muted-foreground">
                    {selected.size === 0
                      ? "No recipients selected."
                      : `${selected.size} recipient${selected.size === 1 ? "" : "s"} selected.`}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={saveDraft}>
                      <FileText className="mr-1.5 h-4 w-4" /> Save draft
                    </Button>
                    <Button variant="ghost" onClick={clearComposer}>
                      Clear
                    </Button>
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
                      {send.isPending ? "Sending..." : "Send email"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                  >
                    all
                  </Button>
                  {availableRoles.map((r) => (
                    <Button
                      key={r}
                      size="sm"
                      variant={roleFilter === r ? "default" : "outline"}
                      onClick={() => setRoleFilter(r)}
                    >
                      {r}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Button size="sm" variant="ghost" onClick={selectAllVisible}>
                    Select visible
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearAll}>
                    Clear
                  </Button>
                </div>
                <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
                  {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
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
                            <Badge
                              key={x}
                              variant="outline"
                              className="capitalize text-[10px] py-0"
                            >
                              {x}
                            </Badge>
                          ))}
                          {r.program && (
                            <Badge variant="outline" className="capitalize text-[10px] py-0">
                              {r.program}
                            </Badge>
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

        <TabsContent value="drafts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Saved drafts</CardTitle>
              <CardDescription>
                Drafts are saved on this device only. Open one to continue editing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No drafts yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {drafts.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-start justify-between gap-3 py-3"
                    >
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
                          <span>
                            {d.recipientIds.length} recipient
                            {d.recipientIds.length === 1 ? "" : "s"}
                          </span>
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

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Send history</CardTitle>
              <CardDescription>
                Your last 200 sends. Status reflects what the email server reported.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : !sentQuery.data?.batches?.length ? (
                <p className="text-sm text-muted-foreground">You haven't sent anything yet.</p>
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
                        {b.recipients.slice(0, 6).map((r: any, i: number) => (
                          <Badge
                            key={`${r.email}-${i}`}
                            variant="outline"
                            className="text-[10px] py-0"
                            title={r.error ?? r.status}
                          >
                            {r.email}
                          </Badge>
                        ))}
                        {b.recipients.length > 6 && (
                          <span className="text-[11px] text-muted-foreground">
                            +{b.recipients.length - 6} more
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
