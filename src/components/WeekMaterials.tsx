import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Link as LinkIcon, Video, Download, Trash2, Plus, Upload, ExternalLink } from "lucide-react";
import type { Program } from "@/lib/curriculum";

interface Props {
  program: Program;
  week: number;
}

function detectIcon(r: { kind: string; external_url: string | null; storage_path: string | null }) {
  const url = r.external_url ?? r.storage_path ?? "";
  if (/youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.mov|\.webm/i.test(url)) return Video;
  if (r.kind === "link") return LinkIcon;
  return FileText;
}

export function WeekMaterials({ program, week }: Props) {
  const qc = useQueryClient();
  const { role, user } = useUserContext();
  const canManage = role === "admin" || role === "mentor";

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["resources", program, week],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .eq("program", program)
        .eq("week_number", week)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const row = items.find((i) => i.id === id);
      if (row?.storage_bucket && row.storage_path) {
        await supabase.storage.from(row.storage_bucket).remove([row.storage_path]);
      }
      const { error } = await supabase.from("resources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removed.");
      qc.invalidateQueries({ queryKey: ["resources", program, week] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const download = async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return toast.error("Could not generate link.");
    window.open(data.signedUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>Week materials</CardTitle>
          <CardDescription>PDFs, videos, and links for this week.</CardDescription>
        </div>
        {canManage && user && <UploadDialog program={program} week={week} userId={user.id} />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {canManage ? "No materials yet. Add one above." : "No materials posted yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((r) => {
              const Icon = detectIcon(r);
              const mine = r.uploaded_by === user?.id;
              return (
                <li
                  key={r.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-surface/40 p-3"
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{r.title}</p>
                      <Badge variant="outline" className="text-[10px] uppercase">{r.kind}</Badge>
                    </div>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {r.kind === "link" && r.external_url && (
                      <Button size="sm" variant="outline" onClick={() => window.open(r.external_url!, "_blank")}>
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                      </Button>
                    )}
                    {r.kind === "file" && r.storage_bucket && r.storage_path && (
                      <Button size="sm" variant="outline" onClick={() => download(r.storage_bucket!, r.storage_path!)}>
                        <Download className="h-3.5 w-3.5 mr-1" /> Download
                      </Button>
                    )}
                    {(role === "admin" || mine) && (
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)} disabled={del.isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
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

function UploadDialog({ program, week, userId }: { program: Program; week: number; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setUrl(""); setFile(null); setKind("file");
  };

  const submit = async () => {
    if (!title.trim()) return toast.error("Title is required.");
    setBusy(true);
    try {
      const bucket = `resources-${program}`;
      let storage_path: string | null = null;
      if (kind === "file") {
        if (!file) throw new Error("Choose a file to upload.");
        const path = `${program}/week-${week}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
        if (upErr) throw upErr;
        storage_path = path;
      } else if (!url.trim()) {
        throw new Error("URL is required.");
      }
      const { error } = await supabase.from("resources").insert({
        program,
        week_number: week,
        title: title.trim(),
        description: description.trim() || null,
        kind,
        storage_bucket: kind === "file" ? bucket : null,
        storage_path,
        external_url: kind === "link" ? url.trim() : null,
        uploaded_by: userId,
      });
      if (error) throw error;
      toast.success("Material added.");
      qc.invalidateQueries({ queryKey: ["resources", program, week] });
      setOpen(false);
      reset();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add material</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add material to Week {week}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Tabs value={kind} onValueChange={(v) => setKind(v as "file" | "link")}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="file">File upload</TabsTrigger>
              <TabsTrigger value="link">Link / video</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 3 workbook" />
          </div>
          <div className="space-y-1">
            <Label>Description (optional)</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary for mentees" />
          </div>
          {kind === "file" ? (
            <div className="space-y-1">
              <Label>File (PDF, image, doc, audio, video)</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          ) : (
            <div className="space-y-1">
              <Label>URL (YouTube, Vimeo, article, etc.)</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            <Upload className="h-4 w-4 mr-1" />{busy ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
