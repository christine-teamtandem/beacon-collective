import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type EmailBlock,
  type BlockType,
  BLOCK_LABELS,
  makeBlock,
  renderBlocksToHtml,
} from "@/lib/email-blocks";
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
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Trash2,
  Type,
  Heading,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  MoveVertical,
  Sparkles,
  Save,
  Library,
  Loader2,
  Plus,
  Wand2,
  Upload,
} from "lucide-react";

const PALETTE: { type: BlockType; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "heading", icon: Heading },
  { type: "text", icon: Type },
  { type: "image", icon: ImageIcon },
  { type: "button", icon: MousePointerClick },
  { type: "divider", icon: Minus },
  { type: "spacer", icon: MoveVertical },
];

function SortableRow({
  block,
  selected,
  onSelect,
  onDelete,
}: {
  block: EmailBlock;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const preview =
    block.type === "heading" || block.type === "text"
      ? block.text
      : block.type === "button"
        ? `Button · ${block.text}`
        : block.type === "image"
          ? `Image${block.src ? "" : " (empty)"}`
          : BLOCK_LABELS[block.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${
        selected ? "border-gold bg-gold/5" : "border-border hover:border-gold/40"
      }`}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
        {BLOCK_LABELS[block.type]}
      </Badge>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{preview}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-muted-foreground opacity-0 transition-opacity hover:text-rose group-hover:opacity-100"
        aria-label="Delete block"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function EmailBuilder() {
  const qc = useQueryClient();
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    makeBlock("heading"),
    makeBlock("text"),
    makeBlock("button"),
  ]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // "blocks" = structured builder; "html" = AI-generated raw HTML template.
  const [mode, setMode] = useState<"blocks" | "html">("blocks");
  const [rawHtml, setRawHtml] = useState("");

  const [name, setName] = useState("Untitled template");
  const [subject, setSubject] = useState("");
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [prompt, setPrompt] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const html = useMemo(
    () => (mode === "blocks" ? renderBlocksToHtml(blocks) : rawHtml),
    [mode, blocks, rawHtml],
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
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setBlocks((prev) => {
        const oldI = prev.findIndex((b) => b.id === active.id);
        const newI = prev.findIndex((b) => b.id === over.id);
        return arrayMove(prev, oldI, newI);
      });
    }
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
          blocks: mode === "blocks" ? blocks : null,
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
    if (Array.isArray(t.blocks) && t.blocks.length) {
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
    setMode("blocks");
    setRawHtml("");
    setSelectedId(null);
  };

  const aiBusy = genImage.isPending || genPrompt.isPending;

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr_minmax(320px,420px)]">
      {/* ── Left: palette + library ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Plus className="h-4 w-4 text-gold" /> Blocks
            </CardTitle>
            <CardDescription className="text-xs">Click to add, drag to reorder.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {PALETTE.map(({ type, icon: Icon }) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => addBlock(type)}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {BLOCK_LABELS[type]}
              </Button>
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
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {blocks.map((b) => (
                      <SortableRow
                        key={b.id}
                        block={b}
                        selected={b.id === selectedId}
                        onSelect={() => setSelectedId(b.id)}
                        onDelete={() => deleteBlock(b.id)}
                      />
                    ))}
                    {blocks.length === 0 && (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        Add blocks from the left to start building.
                      </p>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
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

        {/* Inspector for the selected block */}
        {mode === "blocks" && selected && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Edit {BLOCK_LABELS[selected.type]}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(selected.type === "heading" || selected.type === "text") && (
                <>
                  <Textarea
                    value={selected.text}
                    onChange={(e) => updateBlock(selected.id, { text: e.target.value } as Partial<EmailBlock>)}
                    className="min-h-[90px]"
                  />
                  <div className="flex items-center gap-2">
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
                      {rewrite.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </>
              )}
              {selected.type === "image" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Image URL</Label>
                    <Input
                      value={selected.src}
                      onChange={(e) => updateBlock(selected.id, { src: e.target.value } as Partial<EmailBlock>)}
                      placeholder="https://…"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Alt text</Label>
                    <Input
                      value={selected.alt}
                      onChange={(e) => updateBlock(selected.id, { alt: e.target.value } as Partial<EmailBlock>)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Link (optional)</Label>
                    <Input
                      value={selected.href ?? ""}
                      onChange={(e) => updateBlock(selected.id, { href: e.target.value } as Partial<EmailBlock>)}
                      placeholder="https://…"
                    />
                  </div>
                </>
              )}
              {selected.type === "button" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={selected.text}
                      onChange={(e) => updateBlock(selected.id, { text: e.target.value } as Partial<EmailBlock>)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Link URL</Label>
                    <Input
                      value={selected.href}
                      onChange={(e) => updateBlock(selected.id, { href: e.target.value } as Partial<EmailBlock>)}
                      placeholder="https://…"
                    />
                  </div>
                </>
              )}
              {selected.type === "spacer" && (
                <div className="space-y-1">
                  <Label className="text-xs">Height (px)</Label>
                  <Input
                    type="number"
                    value={selected.size}
                    onChange={(e) => updateBlock(selected.id, { size: Number(e.target.value) || 0 } as Partial<EmailBlock>)}
                  />
                </div>
              )}
              {selected.type === "divider" && (
                <p className="text-xs text-muted-foreground">A crimson accent divider. No options.</p>
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
  );
}
