import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { listAllowedRecipients, sendComposedEmail } from "@/lib/compose.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Mail, Send, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/compose")({
  component: ComposePage,
});

function ComposePage() {
  const listFn = useServerFn(listAllowedRecipients);
  const sendFn = useServerFn(sendComposedEmail);
  const { data, isLoading } = useQuery({
    queryKey: ["compose-recipients"],
    queryFn: () => (listFn as any)({}),
  });

  const recipients: Array<{ id: string; fullName: string; program: string | null; roles: string[] }> =
    data?.recipients ?? [];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

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
      setSubject(""); setBody(""); setSelected(new Set());
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const availableRoles = useMemo(() => {
    const s = new Set<string>();
    recipients.forEach((r) => r.roles.forEach((x) => s.add(x)));
    return Array.from(s).sort();
  }, [recipients]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-program font-semibold">Hub</p>
        <h1 className="font-display text-3xl font-bold mt-1 flex items-center gap-2">
          <Mail className="h-7 w-7 text-program" /> Compose email
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send a branded email to people in the hub. Recipient list is scoped to your role.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Message</CardTitle>
            <CardDescription>Plain text — line breaks become paragraphs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Subject line" />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={10000} rows={14} placeholder="Type your message here..." />
              <p className="text-xs text-muted-foreground">{body.length}/10000</p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                {selected.size === 0 ? "No recipients selected." : `${selected.size} recipient${selected.size === 1 ? "" : "s"} selected.`}
              </p>
              <Button
                onClick={() => send.mutate()}
                disabled={send.isPending || selected.size === 0 || !subject.trim() || !body.trim()}
              >
                <Send className="mr-1.5 h-4 w-4" /> {send.isPending ? "Sending..." : "Send email"}
              </Button>
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
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1">
              <Button size="sm" variant={roleFilter === "all" ? "default" : "outline"} onClick={() => setRoleFilter("all")}>all</Button>
              {availableRoles.map((r) => (
                <Button key={r} size="sm" variant={roleFilter === r ? "default" : "outline"} onClick={() => setRoleFilter(r)}>{r}</Button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Button size="sm" variant="ghost" onClick={selectAllVisible}>Select visible</Button>
              <Button size="sm" variant="ghost" onClick={clearAll}>Clear</Button>
            </div>
            <div className="max-h-[460px] space-y-1.5 overflow-y-auto pr-1">
              {isLoading && <p className="text-xs text-muted-foreground">Loading...</p>}
              {!isLoading && filtered.length === 0 && (
                <p className="text-xs text-muted-foreground">No one matches.</p>
              )}
              {filtered.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 hover:bg-muted">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.fullName}</p>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {r.roles.map((x) => <Badge key={x} variant="outline" className="capitalize text-[10px] py-0">{x}</Badge>)}
                      {r.program && <Badge variant="outline" className="capitalize text-[10px] py-0">{r.program}</Badge>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
