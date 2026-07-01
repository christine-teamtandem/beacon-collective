import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { EmailBlock, EmailHeader } from "@/lib/email-blocks";
import { DEFAULT_EMAIL_HEADER, makeBlock } from "@/lib/email-blocks";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, LayoutTemplate } from "lucide-react";
import {
  BLOCK_PALETTE,
  BlockInspector,
  CanvasDropZone,
  DraggablePaletteItem,
  EmailHeaderInspector,
  SortableBlockRow,
  renderBlocksToHtml,
  handleEditorDragEnd,
  useBlockDragSensors,
  BLOCK_LABELS,
} from "@/components/email/email-editor-parts";

type SavedTemplate = {
  id: string;
  name: string;
  subject: string | null;
  html: string;
  blocks?: unknown;
  header?: unknown;
};

export function EmailComposerEditor({
  blocks,
  onBlocksChange,
  header = DEFAULT_EMAIL_HEADER,
  onHeaderChange,
  templates = [],
  onLoadTemplate,
  activeTemplateId,
}: {
  blocks: EmailBlock[];
  onBlocksChange: (blocks: EmailBlock[]) => void;
  header?: EmailHeader;
  onHeaderChange?: (header: EmailHeader) => void;
  templates?: SavedTemplate[];
  onLoadTemplate?: (template: SavedTemplate) => void;
  activeTemplateId?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"content" | "design">("content");
  const [draggingType, setDraggingType] = useState<EmailBlock["type"] | null>(null);
  const [canvasOver, setCanvasOver] = useState(false);
  const sensors = useBlockDragSensors();

  const html = useMemo(() => renderBlocksToHtml(blocks, header), [blocks, header]);
  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  const addBlock = (type: EmailBlock["type"]) => {
    const b = makeBlock(type);
    onBlocksChange([...blocks, b]);
    setSelectedId(b.id);
  };

  const updateBlock = (id: string, patch: Partial<EmailBlock>) => {
    onBlocksChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as EmailBlock) : b)));
  };

  const deleteBlock = (id: string) => {
    onBlocksChange(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const onDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith("palette:")) {
      setDraggingType(id.replace("palette:", "") as EmailBlock["type"]);
    }
  };

  const onDragEnd = (event: Parameters<typeof handleEditorDragEnd>[1]) => {
    setDraggingType(null);
    setCanvasOver(false);
    const result = handleEditorDragEnd(blocks, event);
    if (!result) return;
    onBlocksChange(result.blocks);
    if (result.newBlockId) setSelectedId(result.newBlockId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={({ over }) => setCanvasOver(!!over)}
    >
      <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)_280px]">
        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader className="pb-2">
            <div className="flex gap-1 border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setTab("content")}
                className={tab === "content" ? "text-gold" : "text-muted-foreground"}
              >
                Content
              </button>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => setTab("design")}
                className={tab === "design" ? "text-gold" : "text-muted-foreground"}
              >
                Design
              </button>
            </div>
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Blocks</CardTitle>
            <CardDescription className="text-[11px]">Drag onto canvas or click to add</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {tab === "content" ? (
              <div className="grid grid-cols-2 gap-1.5">
                {BLOCK_PALETTE.map(({ type, icon, label }) => (
                  <DraggablePaletteItem
                    key={type}
                    type={type}
                    icon={icon}
                    label={label ?? type}
                    onClick={() => addBlock(type)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dark luxury theme — gold accents, charcoal card, serif headings. Header fields appear in the properties panel.
              </p>
            )}

            {templates.length > 0 && onLoadTemplate && (
              <div className="space-y-1.5 border-t border-border pt-3">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <LayoutTemplate className="h-3 w-3" /> Library
                </p>
                {templates.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onLoadTemplate(t)}
                    className={`w-full truncate rounded-md border px-2 py-1.5 text-left text-xs hover:border-gold/50 ${
                      activeTemplateId === t.id ? "border-gold bg-gold/5" : "border-border"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3 min-w-0">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-gold" /> Preview
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {blocks.length} block{blocks.length === 1 ? "" : "s"}
              </Badge>
            </CardHeader>
            <CardContent>
              <iframe
                title="Email preview"
                srcDoc={html}
                className="h-[min(420px,50vh)] w-full rounded-lg border bg-white shadow-inner"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Canvas</CardTitle>
              <CardDescription className="text-xs">
                Drag blocks from the left onto a row, or drop on the empty area. Reorder by dragging rows.
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Properties</CardTitle>
            <CardDescription className="text-xs">
              {selected ? `Editing ${selected.type}` : "Email header & global settings"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {onHeaderChange && (
              <EmailHeaderInspector
                header={header}
                onChange={(patch) => onHeaderChange({ ...header, ...patch })}
              />
            )}
            {selected ? (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Block settings
                </p>
                <BlockInspector block={selected} onUpdate={(patch) => updateBlock(selected.id, patch)} />
              </>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Select a block in the canvas to edit its content, or fill in the email header fields above.
              </p>
            )}
          </CardContent>
        </Card>
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
