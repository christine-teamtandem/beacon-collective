import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  type EmailBlock,
  type BlockType,
  type EmailHeader,
  DEFAULT_EMAIL_HEADER,
  BLOCK_LABELS,
  makeBlock,
  renderBlocksToHtml,
} from "@/lib/email-blocks";
import {
  BLOCK_PALETTE,
  BlockInspector,
  EmailHeaderInspector,
  SortableBlockRow,
  DraggablePaletteItem,
  CanvasDropZone,
  handleEditorDragEnd,
  useBlockDragSensors,
} from "@/components/email/email-editor-parts";
import {
  listTemplates,
  saveTemplate,
  deleteTemplate,
  generateTemplateFromImage,
  generateTemplateFromPrompt,
  rewriteText,
} from "@/lib/templates.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Trash2,
  Sparkles,
  Save,
  Library,
  Loader2,
  Plus,
  Wand2,
  Upload,
} from "lucide-react";

export function EmailBuilder() {
  const qc = useQueryClient();
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    makeBlock("heading"),
    makeBlock("text"),
    makeBlock("button"),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emailHeader, setEmailHeader] = useState<EmailHeader>({ ...DEFAULT_EMAIL_HEADER });
  const [draggingType, setDraggingType] = useState<BlockType | null>(null);
  const [canvasOver, setCanvasOver] = useState(false);
  const [mode, setMode] = useState<"blocks" | "html">("blocks");
  const [rawHtml, setRawHtml] = useState("");

  const [name, setName] = useState("Untitled template");
  const [subject, setSubject] = useState("");
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [prompt, setPrompt] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const sensors = useBlockDragSensors();

  const html = useMemo(
    () => (mode === "blocks" ? renderBlocksToHtml(blocks, emailHeader) : rawHtml),
    [mode, blocks, emailHeader, rawHtml],
  );
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  // ── Server fns ──
  const listFn = useServerFn(listTemplates);
  const saveFn = useServerFn(saveTemplate);
  const delFn = useServerFn(deleteTemplate);
  const imgFn = useServerFn(generateTemplateFromImage);
  const promptFn = useServerFn(generateTemplateFromPrompt);
  const rewriteFn = useServerFn(rewriteText);

  const library = useQuery({
    queryKey: ["email-templates"],
    queryFn: () => (listFn as any)(),
  });

  // ── Block ops ──
  const addBlock = (type: BlockType) => {
    if (mode === "html") {
      toast.error("Switch to block mode to add blocks (current template is AI HTML).");
      return;
    }
    const b = makeBlock(type);
    setBlocks((prev) => [...prev, b]);
    setSelectedId(b.id);
  };
  const updateBlock = (id: string, patch: Partial<EmailBlock>) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? ({ ...b, ...patch } as EmailBlock) : b)));
  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const onDragEnd = (e: DragEndEvent) => {
    setDraggingType(null);
    setCanvasOver(false);
    const result = handleEditorDragEnd(blocks, e);
    if (!result) return;
    setBlocks(result.blocks);
    if (result.newBlockId) setSelectedId(result.newBlockId);
  };

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("palette:")) setDraggingType(id.replace("palette:", "") as BlockType);
  };

  // ── AI ──
  const genImage = useMutation({
    mutationFn: (dataUrl: string) => (imgFn as any)({ data: { imageDataUrl: dataUrl, notes: prompt || undefined } }),
    onSuccess: (res: { html: string }) => {
      setRawHtml(res.html);
      setMode("html");
      toast.success("Template generated from image.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const genPrompt = useMutation({
    mutationFn: () => (promptFn as any)({ data: { prompt } }),
    onSuccess: (res: { html: string }) => {
      setRawHtml(res.html);
      setMode("html");
      toast.success("Template generated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const rewrite = useMutation({
    mutationFn: (vars: { id: string; text: string; instruction: string }) =>
      (rewriteFn as any)({ data: { text: vars.text, instruction: vars.instruction } }),
    onSuccess: (res: { text: string }, vars) => updateBlock(vars.id, { text: res.text } as Partial<EmailBlock>),
    onError: (e: Error) => toast.error(e.message),
  });

  const onPickImage = (file: File) => {
    if (file.size > 6_000_000) {
      toast.error("Image too large (max ~6MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => genImage.mutate(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ── Persistence ──
  const save = useMutation({
    mutationFn: () =>
      (saveFn as any)({
        data: {
          id: currentId,
          name: name.trim() || "Untitled template",
          subject: subject || null,
          html,
          blocks: mode === "blocks" ? { blocks, header: emailHeader } : null,
        },
      }),
    onSuccess: (res: { template: { id: string } | null }) => {
      if (res.template?.id) setCurrentId(res.template.id);
      toast.success("Saved to library.");
      qc.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => (delFn as any)({ data: { id } }),
    onSuccess: () => {
      toast.success("Template deleted.");
      qc.invalidateQueries({ queryKey: ["email-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loadTemplate = (t: {
    id: string;
    name: string;
    subject: string | null;
    html: string;
    blocks: unknown;
  }) => {
    setCurrentId(t.id);
    setName(t.name);
    setSubject(t.subject ?? "");
    if (t.blocks && typeof t.blocks === "object" && !Array.isArray(t.blocks) && "blocks" in (t.blocks as object)) {
      const wrapped = t.blocks as { blocks: EmailBlock[]; header?: EmailHeader };
      setBlocks(wrapped.blocks?.length ? wrapped.blocks : [makeBlock("heading"), makeBlock("text")]);
      setEmailHeader({ ...DEFAULT_EMAIL_HEADER, ...wrapped.header });
      setMode("blocks");
    } else if (Array.isArray(t.blocks) && t.blocks.length) {
      setBlocks(t.blocks as EmailBlock[]);
      setMode("blocks");
    } else {
      setRawHtml(t.html);
      setMode("html");
    }
    setSelectedId(null);
    toast.success(`Loaded "${t.name}".`);
  };

  const newTemplate = () => {
    setCurrentId(undefined);
    setName("Untitled template");
    setSubject("");
    setBlocks([makeBlock("heading"), makeBlock("text"), makeBlock("button")]);
    setEmailHeader({ ...DEFAULT_EMAIL_HEADER });
    setMode("blocks");
    setRawHtml("");
    setSelectedId(null);
  };

  const aiBusy = genImage.isPending || genPrompt.isPending;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={({ over }) => setCanvasOver(!!over)}
    >
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_minmax(320px,420px)]">
      {/* ── Left: palette + library ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4 text-gold" /> Blocks
            </CardTitle>
            <CardDescription className="text-xs">Drag onto canvas or click to add.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-1.5">
            {BLOCK_PALETTE.map(({ type, icon, label }) => (
              <DraggablePaletteItem
                key={type}
                type={type}
                icon={icon}
                label={label ?? type}
                onClick={() => addBlock(type)}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Library className="h-4 w-4 text-gold" /> Library
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="secondary" size="sm" className="w-full" onClick={newTemplate}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> New template
            </Button>
            {library.isLoading && (
              <p className="text-xs text-muted-foreground">Loading…</p>
            )}
            {library.data?.templates?.length === 0 && (
              <p className="text-xs text-muted-foreground">No saved templates yet.</p>
            )}
            <div className="space-y-1.5">
              {library.data?.templates?.map((t: any) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-1 rounded-md border p-2 text-xs ${
                    currentId === t.id ? "border-gold bg-gold/5" : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left hover:text-gold"
                    onClick={() => loadTemplate(t)}
                  >
                    {t.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(t.id)}
                    className="text-muted-foreground hover:text-rose"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Middle: canvas / inspector ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">Canvas</CardTitle>
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("blocks")}
                  className={`rounded px-2 py-1 ${mode === "blocks" ? "bg-gold/15 text-gold" : "text-muted-foreground"}`}
                >
                  Blocks
                </button>
                <button
                  type="button"
                  onClick={() => setMode("html")}
                  className={`rounded px-2 py-1 ${mode === "html" ? "bg-gold/15 text-gold" : "text-muted-foreground"}`}
                >
                  AI HTML
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {mode === "blocks" ? (
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <CanvasDropZone isEmpty={blocks.length === 0} isOver={canvasOver && blocks.length === 0}>
                  <div className="space-y-1.5">
                    {blocks.map((b) => (
                      <SortableBlockRow
                        key={b.id}
                        block={b}
                        selected={b.id === selectedId}
                        onSelect={() => setSelectedId(b.id)}
                        onDelete={() => deleteBlock(b.id)}
                      />
                    ))}
                  </div>
                </CanvasDropZone>
              </SortableContext>
            ) : (
              <Textarea
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                className="min-h-[280px] font-mono text-xs"
                placeholder="AI-generated HTML appears here. You can hand-edit it."
              />
            )}
          </CardContent>
        </Card>

        {mode === "blocks" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Properties</CardTitle>
              <CardDescription className="text-xs">
                {selected ? `Editing ${BLOCK_LABELS[selected.type]}` : "Email header & global settings"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <EmailHeaderInspector
                header={emailHeader}
                onChange={(patch) => setEmailHeader((h) => ({ ...h, ...patch }))}
              />
              {selected ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Block settings
                  </p>
                  <BlockInspector
                    block={selected}
                    onUpdate={(patch) => updateBlock(selected.id, patch)}
                  />
                  {(selected.type === "heading" || selected.type === "text") && (
                    <div className="flex items-center gap-2 border-t border-border pt-3">
                      <Input
                        id="rewrite-instruction"
                        placeholder="AI: e.g. make it warmer and shorter"
                        className="h-8 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (v) rewrite.mutate({ id: selected.id, text: selected.text, instruction: v });
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rewrite.isPending}
                        onClick={() => {
                          const el = document.getElementById("rewrite-instruction") as HTMLInputElement | null;
                          const v = el?.value.trim();
                          if (v) rewrite.mutate({ id: selected.id, text: selected.text, instruction: v });
                        }}
                      >
                        {rewrite.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Select a block in the canvas to edit its content, or fill in the email header fields above.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Right: AI + save + preview ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-gold" /> AI generate
            </CardTitle>
            <CardDescription className="text-xs">
              Describe a template, or upload a design reference to recreate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A monthly newsletter announcing our new mentorship cohort, with a hero, 3 highlights, and a CTA."
              className="min-h-[72px] text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={aiBusy || !prompt.trim()}
                onClick={() => genPrompt.mutate()}
              >
                {genPrompt.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
                Generate
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={aiBusy}
                onClick={() => fileRef.current?.click()}
              >
                {genImage.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                <span className="ml-1.5">Image</span>
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onPickImage(e.target.files[0])}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Save className="h-4 w-4 text-gold" /> Save to library
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs">Template name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default subject (optional)</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <Button size="sm" className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              {currentId ? "Update template" : "Save template"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Live preview</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              title="Email preview"
              srcDoc={html}
              className="h-[420px] w-full rounded-lg border bg-white"
            />
          </CardContent>
        </Card>
      </div>
    </div>

    <DragOverlay dropAnimation={null}>
      {draggingType ? (
        <div className="rounded-lg border border-gold bg-card px-3 py-2 text-xs font-medium shadow-lg">
          {BLOCK_LABELS[draggingType]}
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
