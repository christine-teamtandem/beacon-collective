import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/hooks/useSession";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FileText, Link as LinkIcon, Upload, Download, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/resources")({
  component: ResourcesPage,
});

type Program = "vanguard" | "flow";

function ResourcesPage() {
  const { role, program, user, loading } = useUserContext();
  const canSeeBoth = role === "admin";
  const initial: Program = (program as Program) ?? "vanguard";
  const [view, setView] = useState<Program>(initial);

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!canSeeBoth && !program) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resources locked</CardTitle>
          <CardDescription>An admin needs to assign you to a program first.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const activeProgram: Program = canSeeBoth ? view : (program as Program);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-program font-semibold">Resource library</p>
          <h1 className="font-display text-3xl font-bold mt-1">
            {activeProgram === "vanguard" ? "Vanguard Brotherhood" : "Flow Collective"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Workbooks, guides, and links — curated by mentors.</p>
        </div>
        {(role === "mentor" || role === "admin") && user && (
          <UploadDialog program={activeProgram} userId={user.id} />
        )}
      </div>

      {canSeeBoth ? (
        <Tabs value={view} onValueChange={(v) => setView(v as Program)}>
          <TabsList>
            <TabsTrigger value="vanguard">Vanguard</TabsTrigger>
            <TabsTrigger value="flow">Flow</TabsTrigger>
          </TabsList>
          <TabsContent value="vanguard" className="mt-4"><ResourceList program="vanguard" /></TabsContent>
          <TabsContent value="flow" className="mt-4"><ResourceList program="flow" /></TabsContent>
        </Tabs>
      ) : (
        <ResourceList program={activeProgram} />
      )}
    </div>
  );
}

function ResourceList({ program }: { program: Program }) {
  const qc = useQueryClient();
  const { role, user } = useUserContext();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["resources", program],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources").select("*")
        .eq("program", program)
        .order("week_number", { ascending: true, nullsFirst: true })
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
    onSuccess: () => { toast.success("Removed."); qc.invalidateQueries({ queryKey: ["resources", program] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const download = async (bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return toast.error("Could not generate download link.");
    window.open(data.signedUrl, "_blank");
  };

  if (isLoading) return <p className="text-muted-foreground text-sm">Loading resources...</p>;
  if (!items.length) {
    return (
      <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
        Walang resource pa. Mentors at admins ang makakapag-upload.
      </CardContent></Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <Card key={r.id} className="flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-program">
                {r.kind === "link" ? <LinkIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </div>
              {r.week_number != null && <Badge variant="outline">Week {r.week_number}</Badge>}
            </div>
            <CardTitle className="mt-2 text-base">{r.title}</CardTitle>
            {r.description && <CardDescription className="line-clamp-3">{r.description}</CardDescription>}
          </CardHeader>
          <CardContent className="mt-auto flex items-center justify-between pt-0">
            {r.kind === "link" && r.external_url && (
              <Button size="sm" variant="outline" onClick={() => window.open(r.external_url!, "_blank")}>
                <LinkIcon className="mr-1 h-3 w-3" /> Open
              </Button>
            )}
            {r.kind === "file" && r.storage_bucket && r.storage_path && (
              <Button size="sm" variant="outline" onClick={() => download(r.storage_bucket!, r.storage_path!)}>
                <Download className="mr-1 h-3 w-3" /> Download
              </Button>
            )}
            {(role === "admin" || r.uploaded_by === user?.id) && (
              <Button size="icon" variant="ghost" onClick={() => del.mutate(r.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UploadDialog({ program, userId }: { program: Program; userId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"file" | "link">("file");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [week, setWeek] = useState<string>("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => { setTitle(""); setDescription(""); setWeek(""); setUrl(""); setFile(null); setKind("file"); };

  const submit = async () => {
    if (!title.trim()) return toast.error("Title required");
    setBusy(true);
    try {
      const bucket = `resources-${program}`;
      let storage_path: string | null = null;
      if (kind === "file") {
        if (!file) throw new Error("Pick a file");
        const path = `${program}/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, "_")}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(path, file);
        if (upErr) throw upErr;
        storage_path = path;
      } else {
        if (!url.trim()) throw new Error("Link URL required");
      }
      const { error } = await supabase.from("resources").insert({
        program,
        title: title.trim(),
        description: description.trim() || null,
        week_number: week ? Number(week) : null,
        kind,
        storage_bucket: kind === "file" ? bucket : null,
        storage_path,
        external_url: kind === "link" ? url.trim() : null,
        uploaded_by: userId,
      });
      if (error) throw error;
      toast.success("Resource added.");
      qc.invalidateQueries({ queryKey: ["resources", program] });
      setOpen(false); reset();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 h-4 w-4" /> Add resource</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add to {program === "vanguard" ? "Vanguard" : "Flow"} library</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Tabs value={kind} onValueChange={(v) => setKind(v as "file" | "link")}>
            <TabsList className="grid grid-cols-2"><TabsTrigger value="file">File</TabsTrigger><TabsTrigger value="link">Link</TabsTrigger></TabsList>
          </Tabs>
          <div className="space-y-1"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Week 3 workbook" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Week #</Label>
              <Select value={week} onValueChange={setWeek}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (<SelectItem key={n} value={String(n)}>Week {n}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary" /></div>
          </div>
          {kind === "file" ? (
            <div className="space-y-1"><Label>File (PDF, image, doc)</Label>
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
          ) : (
            <div className="space-y-1"><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}><Upload className="mr-1 h-4 w-4" />{busy ? "Saving..." : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
