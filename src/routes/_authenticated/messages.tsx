import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUserContext } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Users as UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

type Thread = {
  id: string;
  kind: "direct" | "group";
  title: string | null;
  program: string | null;
  other?: { id: string; full_name: string | null } | null;
};

function MessagesPage() {
  const { user } = useUserContext();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  // Presence on a global "hub" channel — everyone authenticated joins
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("presence:hub", { config: { presence: { key: user.id } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setOnlineIds(new Set(Object.keys(state)));
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const { data: threads = [] } = useQuery({
    queryKey: ["threads", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Thread[]> => {
      const { data: mems, error } = await supabase
        .from("chat_thread_members").select("thread_id").eq("user_id", user!.id);
      if (error) throw error;
      const ids = (mems ?? []).map((m) => m.thread_id);
      if (!ids.length) return [];
      const { data: ts } = await supabase.from("chat_threads").select("*").in("id", ids);
      const result: Thread[] = [];
      for (const t of ts ?? []) {
        if (t.kind === "direct") {
          const { data: others } = await supabase
            .from("chat_thread_members").select("user_id").eq("thread_id", t.id).neq("user_id", user!.id);
          const otherId = others?.[0]?.user_id;
          let otherProfile: { id: string; full_name: string | null } | null = null;
          if (otherId) {
            const { data: p } = await supabase.from("profiles").select("id, full_name").eq("id", otherId).maybeSingle();
            otherProfile = p ?? null;
          }
          result.push({ id: t.id, kind: "direct", title: t.title, program: t.program, other: otherProfile });
        } else {
          result.push({ id: t.id, kind: "group", title: t.title, program: t.program });
        }
      }
      return result.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "group" ? -1 : 1));
    },
  });

  useEffect(() => { if (!activeId && threads.length) setActiveId(threads[0].id); }, [threads, activeId]);

  // Listen to all new messages for toast notifications
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("msg-toast").on("postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages" },
      (payload) => {
        const m = payload.new as any;
        qc.invalidateQueries({ queryKey: ["messages", m.thread_id] });
        if (m.sender_id !== user.id && m.thread_id !== activeId) toast.info("New message");
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc, user, activeId]);

  const active = threads.find((t) => t.id === activeId);

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
      <Card className="overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Conversations</p>
        </div>
        <ScrollArea className="flex-1">
          <ul>
            {threads.length === 0 && <li className="p-4 text-sm text-muted-foreground">No threads yet. An admin can pair you with a mentor to start a 1:1.</li>}
            {threads.map((t) => {
              const otherOnline = t.kind === "direct" && t.other && onlineIds.has(t.other.id);
              const label = t.kind === "group" ? (t.title ?? "Group") : (t.other?.full_name ?? "Direct message");
              return (
                <li key={t.id}>
                  <button onClick={() => setActiveId(t.id)}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2.5 hover:bg-muted ${activeId === t.id ? "bg-muted" : ""}`}>
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-program/10 text-program">
                      {t.kind === "group" ? <UsersIcon className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{label}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{t.kind === "group" ? `${t.program} group` : "Direct"}</p>
                    </div>
                    {otherOnline && <span className="h-2 w-2 rounded-full bg-green-500" aria-label="online" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </Card>

      <Card className="overflow-hidden flex flex-col">
        {active ? <ChatPane thread={active} onlineIds={onlineIds} userId={user!.id} /> : (
          <div className="flex-1 grid place-items-center text-muted-foreground text-sm">Select a conversation</div>
        )}
      </Card>
    </div>
  );
}

function ChatPane({ thread, onlineIds, userId }: { thread: Thread; onlineIds: Set<string>; userId: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", thread.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chat_messages")
        .select("*").eq("thread_id", thread.id).order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: memberProfiles = {} } = useQuery({
    queryKey: ["thread-members", thread.id],
    queryFn: async () => {
      const { data: mems } = await supabase.from("chat_thread_members").select("user_id").eq("thread_id", thread.id);
      const ids = (mems ?? []).map((m) => m.user_id);
      if (!ids.length) return {} as Record<string, string>;
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      for (const p of profs ?? []) map[p.id] = p.full_name ?? "Member";
      return map;
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`thread:${thread.id}`).on("postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${thread.id}` },
      () => qc.invalidateQueries({ queryKey: ["messages", thread.id] })).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [thread.id, qc]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const send = useMutation({
    mutationFn: async () => {
      if (!text.trim()) return;
      const { error } = await supabase.from("chat_messages").insert({
        thread_id: thread.id, sender_id: userId, body: text.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["messages", thread.id] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const headerLabel = thread.kind === "group" ? thread.title ?? "Group" : thread.other?.full_name ?? "Direct";
  const headerOnline = thread.kind === "direct" && thread.other && onlineIds.has(thread.other.id);
  const groupOnlineCount = useMemo(() =>
    Object.keys(memberProfiles).filter((id) => onlineIds.has(id) && id !== userId).length,
    [memberProfiles, onlineIds, userId]);

  return (
    <>
      <div className="p-3 border-b border-border flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-program/10 text-program">
          {thread.kind === "group" ? <UsersIcon className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{headerLabel}</p>
          <p className="text-xs text-muted-foreground">
            {thread.kind === "direct"
              ? (headerOnline ? <span className="text-green-600">● Online now</span> : "Offline")
              : `${groupOnlineCount} member${groupOnlineCount === 1 ? "" : "s"} online`}
          </p>
        </div>
        {thread.program && <Badge variant="outline" className="capitalize">{thread.program}</Badge>}
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hi!</p>}
          {messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {!mine && thread.kind === "group" && (
                    <p className="text-[10px] font-semibold uppercase opacity-70 mb-0.5">{memberProfiles[m.sender_id] ?? "Member"}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                  <p className={`text-[10px] mt-0.5 ${mine ? "opacity-70" : "text-muted-foreground"}`}>{format(new Date(m.created_at), "h:mm a")}</p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <form className="p-3 border-t border-border flex gap-2" onSubmit={(e) => { e.preventDefault(); send.mutate(); }}>
        <Input placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} />
        <Button type="submit" disabled={!text.trim() || send.isPending}><Send className="h-4 w-4" /></Button>
      </form>
    </>
  );
}
