import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  FileDown,
  Layers,
  MicOff,
  Presentation,
} from "lucide-react";
import { toast } from "sonner";
import {
  PRESENTATION_FOOTER,
  VANGUARD_PRESENTATION_WEEKS,
  packLabel,
  slidesForPack,
  type PresentationPackId,
  type PresentationSlide,
} from "@/lib/vanguard-presentations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const CHARCOAL = "#0a0a0a";
const CARD = "#141414";
const GOLD = "#C9A84C";
const CREAM = "#E8E4DD";
const CRIMSON = "#8B0000";

export function CohortPresentationViewer() {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [pack, setPack] = useState<PresentationPackId>("week");
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = useMemo(
    () => slidesForPack(pack, selectedWeek),
    [pack, selectedWeek],
  );

  const currentSlide: PresentationSlide | undefined = slides[slideIndex];
  const totalSlides = slides.length;

  const selectWeek = (week: number) => {
    setSelectedWeek(week);
    setPack("week");
    setSlideIndex(0);
  };

  const selectPack = (next: PresentationPackId) => {
    setPack(next);
    setSlideIndex(0);
  };

  const goPrev = () => setSlideIndex((i) => Math.max(0, i - 1));
  const goNext = () => setSlideIndex((i) => Math.min(totalSlides - 1, i + 1));

  const exportPdfBinder = useCallback(() => {
    const weekRows = VANGUARD_PRESENTATION_WEEKS.map((w) => {
      const slideHtml = w.slides
        .map(
          (s, idx) => `
        <section class="slide">
          <p class="eyebrow">Week ${w.week} · Slide ${idx + 1} of ${w.slides.length}</p>
          <h2>${s.title}</h2>
          ${s.subtitle ? `<p class="sub">${s.subtitle}</p>` : ""}
          <ul>${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
        </section>`,
        )
        .join("");
      return `<div class="week"><h1>Week ${w.week}: ${w.title}</h1><p class="focus">${w.focus}</p>${slideHtml}</div>`;
    }).join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Vanguard Brotherhood — PDF Binder</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
    body { font-family: Inter, sans-serif; background: ${CHARCOAL}; color: ${CREAM}; margin: 0; padding: 32px; }
    h1 { font-family: 'Playfair Display', serif; color: ${GOLD}; font-size: 28px; margin: 0 0 8px; }
    h2 { font-family: 'Playfair Display', serif; color: ${CREAM}; font-size: 22px; margin: 0 0 12px; }
    .cover { text-align: center; padding: 80px 24px; border: 2px solid ${GOLD}; margin-bottom: 48px; }
    .cover h1 { font-size: 36px; }
    .week { page-break-before: always; margin-bottom: 40px; }
    .slide { background: ${CARD}; border: 1px solid #2a2a2a; border-left: 4px solid ${CRIMSON}; padding: 24px; margin: 16px 0; border-radius: 8px; }
    .eyebrow { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${GOLD}; margin: 0 0 8px; }
    .sub { color: #a8a29e; margin: 0 0 12px; }
    .focus { color: #a8a29e; margin-bottom: 20px; }
    ul { margin: 0; padding-left: 20px; line-height: 1.6; }
    footer { text-align: center; font-size: 11px; color: #78716c; margin-top: 48px; letter-spacing: 0.08em; }
    @media print { body { background: white; color: black; } .slide { border: 1px solid #ccc; } }
  </style>
</head>
<body>
  <div class="cover">
    <h1>The Vanguard Brotherhood</h1>
    <p>Cohort Presentation Binder · 12 Weeks</p>
    <p style="color:${GOLD}">Free Bleeders Mentorship</p>
  </div>
  ${weekRows}
  <footer>${PRESENTATION_FOOTER}</footer>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Allow pop-ups to export the PDF binder.");
      return;
    }
    win.document.write(html);
    win.document.close();
    toast.success("Print dialog opened — save as PDF to export your binder.");
  }, []);

  const selectedWeekData = VANGUARD_PRESENTATION_WEEKS.find((w) => w.week === selectedWeek);

  return (
    <div
      className="min-h-[calc(100vh-8rem)] rounded-2xl border border-[#2a2a2a] overflow-hidden shadow-2xl"
      style={{ background: `linear-gradient(165deg, ${CHARCOAL} 0%, #111 50%, ${CHARCOAL} 100%)` }}
    >
      {/* Header */}
      <header className="border-b border-[#2a2a2a]/80 px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              The Vanguard Brotherhood
            </p>
            <h1
              className="font-display text-3xl sm:text-4xl font-bold mt-1"
              style={{ color: CREAM }}
            >
              Cohort Presentation Viewer
            </h1>
            <p className="text-sm mt-1" style={{ color: "#a8a29e" }}>
              Operational slide decks for weekly Zoom cohort sessions
            </p>
          </div>

          {/* Glassmorphism week selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex min-w-[280px] max-w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left",
                  "border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg",
                  "transition hover:border-[#C9A84C]/40 hover:bg-white/[0.08]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/50",
                )}
              >
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest" style={{ color: GOLD }}>
                    Curriculum week
                  </p>
                  <p className="font-display text-base font-semibold truncate" style={{ color: CREAM }}>
                    Week {selectedWeek}: {selectedWeekData?.title ?? "—"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-70" style={{ color: CREAM }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="max-h-[min(420px,70vh)] w-[320px] overflow-y-auto border-white/10 bg-[#141414]/95 backdrop-blur-xl"
            >
              {VANGUARD_PRESENTATION_WEEKS.map((w) => (
                <DropdownMenuItem
                  key={w.week}
                  onSelect={() => selectWeek(w.week)}
                  className={cn(
                    "cursor-pointer py-2.5 focus:bg-[#C9A84C]/15 focus:text-[#E8E4DD]",
                    selectedWeek === w.week && pack === "week" && "bg-[#C9A84C]/10",
                  )}
                >
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#C9A84C]">
                      Week {w.week} · {w.monthLabel}
                    </span>
                    <p className="font-display text-sm font-semibold">{w.title}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Action bar */}
      <div className="border-b border-[#2a2a2a]/60 px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton
            icon={<DoorOpen className="h-4 w-4" />}
            label="Lobby Etiquette Slide"
            active={pack === "lobby-etiquette"}
            onClick={() => selectPack("lobby-etiquette")}
          />
          <ActionButton
            icon={<Layers className="h-4 w-4" />}
            label="12-Week Slides Deck"
            active={pack === "full-deck"}
            onClick={() => selectPack("full-deck")}
          />
          <ActionButton
            icon={<MicOff className="h-4 w-4" />}
            label="Silent-Zoom Icebreakers"
            active={pack === "silent-icebreakers"}
            onClick={() => selectPack("silent-icebreakers")}
          />
          <button
            type="button"
            onClick={exportPdfBinder}
            className={cn(
              "ml-auto inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold",
              "border border-[#C9A84C] bg-[#C9A84C] text-[#0a0a0a]",
              "shadow-[0_0_24px_rgba(201,168,76,0.25)] transition hover:brightness-110",
            )}
          >
            <FileDown className="h-4 w-4" />
            Export PDF Binder
          </button>
        </div>
      </div>

      {/* Slide stage */}
      <div className="px-6 py-8 sm:px-8">
        <div
          className="relative mx-auto max-w-4xl rounded-2xl border border-[#2a2a2a] p-8 sm:p-12 min-h-[340px]"
          style={{
            background: `linear-gradient(145deg, ${CARD} 0%, #0f0f0f 100%)`,
            boxShadow: "inset 0 1px 0 rgba(201,168,76,0.12)",
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: GOLD }}>
              <Presentation className="h-4 w-4" />
              {packLabel(pack, selectedWeek)}
            </div>
            <p className="text-sm font-medium tabular-nums" style={{ color: CREAM }}>
              Slide {totalSlides === 0 ? 0 : slideIndex + 1} of {totalSlides || 0}
            </p>
          </div>

          {currentSlide ? (
            <>
              {currentSlide.subtitle && (
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.2em] mb-2"
                  style={{ color: CRIMSON }}
                >
                  {currentSlide.subtitle}
                </p>
              )}
              <h2
                className="font-display text-3xl sm:text-4xl font-bold leading-tight mb-8"
                style={{ color: CREAM }}
              >
                {currentSlide.title}
              </h2>
              <ul className="space-y-4">
                {currentSlide.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-base leading-relaxed"
                    style={{ color: "#d6d3d1" }}
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: GOLD }}
                    />
                    {bullet}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ color: "#78716c" }}>No slides available for this selection.</p>
          )}

          {/* Slide navigation */}
          <div className="mt-10 flex items-center justify-between gap-4 border-t border-[#2a2a2a] pt-6">
            <button
              type="button"
              onClick={goPrev}
              disabled={slideIndex <= 0}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium disabled:opacity-30"
              style={{ color: CREAM }}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setSlideIndex(i)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === slideIndex ? "w-8 bg-[#C9A84C]" : "w-2 bg-white/20 hover:bg-white/40",
                  )}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={goNext}
              disabled={slideIndex >= totalSlides - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium disabled:opacity-30"
              style={{ color: CREAM }}
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="border-t border-[#2a2a2a]/80 px-6 py-4 text-center text-[11px] uppercase tracking-[0.22em]"
        style={{ color: "#78716c" }}
      >
        {PRESENTATION_FOOTER}
      </footer>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition",
        "backdrop-blur-md",
        active
          ? "border-[#C9A84C]/60 bg-[#C9A84C]/15 text-[#E8E4DD]"
          : "border-white/10 bg-white/5 text-[#d6d3d1] hover:border-[#C9A84C]/30 hover:bg-white/[0.08]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export default CohortPresentationViewer;
