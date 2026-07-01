import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
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
  type EmailHeader,
  BLOCK_LABELS,
  makeBlock,
  renderBlocksToHtml,
} from "@/lib/email-blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Trash2,
  Type,
  Heading,
  Image as ImageIcon,
  MousePointerClick,
  Minus,
  MoveVertical,
  Columns2,
  Columns3,
} from "lucide-react";

export const CANVAS_DROP_ID = "email-canvas-drop";
export const PALETTE_DRAG_PREFIX = "palette:";

export const BLOCK_PALETTE: {
  type: BlockType;
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
}[] = [
  { type: "heading", icon: Heading, label: "Heading" },
  { type: "text", icon: Type, label: "Text" },
  { type: "image", icon: ImageIcon, label: "Image" },
  { type: "button", icon: MousePointerClick, label: "Button" },
  { type: "columns2", icon: Columns2, label: "2 Columns" },
  { type: "columns3", icon: Columns3, label: "3 Columns" },
  { type: "divider", icon: Minus, label: "Divider" },
  { type: "spacer", icon: MoveVertical, label: "Spacer" },
];

export function paletteDragId(type: BlockType) {
  return `${PALETTE_DRAG_PREFIX}${type}`;
}

function parsePaletteType(id: string): BlockType | null {
  if (!id.startsWith(PALETTE_DRAG_PREFIX)) return null;
  return id.slice(PALETTE_DRAG_PREFIX.length) as BlockType;
}

function blockPreview(block: EmailBlock): string {
  if (block.type === "heading" || block.type === "text") return block.text;
  if (block.type === "button") return `Button · ${block.text}`;
  if (block.type === "image") return `Image${block.src ? "" : " (empty)"}`;
  if (block.type === "columns2") return `${block.left.slice(0, 24)} | ${block.right.slice(0, 24)}`;
  if (block.type === "columns3") return "3-column layout";
  return BLOCK_LABELS[block.type];
}

export function DraggablePaletteItem({
  type,
  icon: Icon,
  label,
  onClick,
}: {
  type: BlockType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: paletteDragId(type),
    data: { type: "palette", blockType: type },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      size="sm"
      className={cn(
        "h-auto flex-col gap-1 py-2.5 text-[10px] font-medium touch-none",
        isDragging && "opacity-40 ring-2 ring-gold/40",
      )}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      <Icon className="h-4 w-4 text-gold" />
      {label}
    </Button>
  );
}

export function CanvasDropZone({
  children,
  isEmpty,
  isOver,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: CANVAS_DROP_ID });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[120px] rounded-lg transition-colors",
        isEmpty && "border border-dashed border-border p-2",
        isOver && "bg-gold/5 ring-2 ring-gold/30",
      )}
    >
      {isEmpty && !isOver && (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Drag blocks here or click a block on the left to add content.
        </p>
      )}
      {children}
    </div>
  );
}

export function SortableBlockRow({
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
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDropRef(node);
      }}
      style={style}
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors",
        selected ? "border-gold bg-gold/10 ring-1 ring-gold/30" : "border-border hover:border-gold/40",
        isOver && "border-gold/60 bg-gold/5",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Badge variant="outline" className="shrink-0 text-[9px] uppercase">
        {BLOCK_LABELS[block.type]}
      </Badge>
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{blockPreview(block)}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-muted-foreground opacity-0 transition-opacity hover:text-rose group-hover:opacity-100"
        aria-label="Delete block"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function EmailHeaderInspector({
  header,
  onChange,
}: {
  header: EmailHeader;
  onChange: (patch: Partial<EmailHeader>) => void;
}) {
  return (
    <div className="space-y-3 border-b border-border pb-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Email header
      </p>
      <div className="space-y-1">
        <Label className="text-xs">Headline</Label>
        <Input
          value={header.headline}
          onChange={(e) => onChange({ headline: e.target.value })}
          placeholder="Monthly newsletter"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Subheadline (optional, italic)</Label>
        <Input
          value={header.subheadline}
          onChange={(e) => onChange({ subheadline: e.target.value })}
          placeholder="A short supporting line"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Intro text</Label>
        <Textarea
          value={header.intro}
          onChange={(e) => onChange({ intro: e.target.value })}
          placeholder="Brief opening paragraph for the email…"
          className="min-h-[72px] text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Hero image URL (optional)</Label>
        <Input
          value={header.heroImageUrl}
          onChange={(e) => onChange({ heroImageUrl: e.target.value })}
          placeholder="https://…"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Alt text</Label>
          <Input
            value={header.heroImageAlt}
            onChange={(e) => onChange({ heroImageAlt: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hero link</Label>
          <Input
            value={header.heroLink}
            onChange={(e) => onChange({ heroLink: e.target.value })}
            placeholder="https://…"
          />
        </div>
      </div>
    </div>
  );
}

export function BlockInspector({
  block,
  onUpdate,
}: {
  block: EmailBlock;
  onUpdate: (patch: Partial<EmailBlock>) => void;
}) {
  return (
    <div className="space-y-3">
      {(block.type === "heading" || block.type === "text") && (
        <div className="space-y-1">
          <Label className="text-xs">{block.type === "heading" ? "Headline" : "Body text"}</Label>
          <Textarea
            value={block.text}
            onChange={(e) => onUpdate({ text: e.target.value } as Partial<EmailBlock>)}
            className="min-h-[120px] text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Use {"{{first_name}}"} to personalise per recipient.
          </p>
        </div>
      )}
      {block.type === "columns2" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Left column</Label>
            <Textarea
              value={block.left}
              onChange={(e) => onUpdate({ left: e.target.value } as Partial<EmailBlock>)}
              className="min-h-[80px] text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Right column</Label>
            <Textarea
              value={block.right}
              onChange={(e) => onUpdate({ right: e.target.value } as Partial<EmailBlock>)}
              className="min-h-[80px] text-sm"
            />
          </div>
        </>
      )}
      {block.type === "columns3" && (
        <>
          {(["col1", "col2", "col3"] as const).map((key, i) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">Column {i + 1}</Label>
              <Textarea
                value={block[key]}
                onChange={(e) => onUpdate({ [key]: e.target.value } as Partial<EmailBlock>)}
                className="min-h-[64px] text-sm"
              />
            </div>
          ))}
        </>
      )}
      {block.type === "image" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Image URL</Label>
            <Input
              value={block.src}
              onChange={(e) => onUpdate({ src: e.target.value } as Partial<EmailBlock>)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Alt text</Label>
            <Input
              value={block.alt}
              onChange={(e) => onUpdate({ alt: e.target.value } as Partial<EmailBlock>)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Link (optional)</Label>
            <Input
              value={block.href ?? ""}
              onChange={(e) => onUpdate({ href: e.target.value } as Partial<EmailBlock>)}
              placeholder="https://…"
            />
          </div>
        </>
      )}
      {block.type === "button" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Button label</Label>
            <Input
              value={block.text}
              onChange={(e) => onUpdate({ text: e.target.value } as Partial<EmailBlock>)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Link URL</Label>
            <Input
              value={block.href}
              onChange={(e) => onUpdate({ href: e.target.value } as Partial<EmailBlock>)}
              placeholder="https://…"
            />
          </div>
        </>
      )}
      {block.type === "spacer" && (
        <div className="space-y-1">
          <Label className="text-xs">Height (px)</Label>
          <Input
            type="number"
            value={block.size}
            onChange={(e) => onUpdate({ size: Number(e.target.value) || 0 } as Partial<EmailBlock>)}
          />
        </div>
      )}
      {block.type === "divider" && (
        <p className="text-xs text-muted-foreground">Crimson accent divider — no extra options.</p>
      )}
    </div>
  );
}

export function useBlockDragSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

export function reorderBlocks(blocks: EmailBlock[], event: DragEndEvent): EmailBlock[] {
  const { active, over } = event;
  if (!over || active.id === over.id) return blocks;
  const oldI = blocks.findIndex((b) => b.id === active.id);
  const newI = blocks.findIndex((b) => b.id === over.id);
  if (oldI < 0 || newI < 0) return blocks;
  return arrayMove(blocks, oldI, newI);
}

function insertBlockAt(blocks: EmailBlock[], block: EmailBlock, overId: string | number): EmailBlock[] {
  if (overId === CANVAS_DROP_ID) return [...blocks, block];
  const idx = blocks.findIndex((b) => b.id === overId);
  if (idx < 0) return [...blocks, block];
  const next = [...blocks];
  next.splice(idx, 0, block);
  return next;
}

export type DragEndResult = {
  blocks: EmailBlock[];
  newBlockId?: string;
};

export function handleEditorDragEnd(blocks: EmailBlock[], event: DragEndEvent): DragEndResult | null {
  const { active, over } = event;
  if (!over) return null;

  const paletteType = parsePaletteType(String(active.id));
  if (paletteType) {
    const newBlock = makeBlock(paletteType);
    return {
      blocks: insertBlockAt(blocks, newBlock, over.id),
      newBlockId: newBlock.id,
    };
  }

  if (String(active.id).startsWith(PALETTE_DRAG_PREFIX)) return null;

  const reordered = reorderBlocks(blocks, event);
  if (reordered === blocks) return null;
  return { blocks: reordered };
}

export { makeBlock, renderBlocksToHtml, BLOCK_LABELS };
