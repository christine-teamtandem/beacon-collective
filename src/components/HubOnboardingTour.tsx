import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ArrowRight, Shield, X } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";
import type { HubTourStep } from "@/lib/hub-tour";
import { cn } from "@/lib/utils";

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

export function HubOnboardingTour({
  steps,
  onClose,
  onCta,
}: {
  steps: HubTourStep[];
  onClose: () => void;
  onCta: (href: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const step = steps[index];
  const total = steps.length;
  const isLast = index === total - 1;

  const measureTarget = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      setCardPos({
        top: Math.max(24, window.innerHeight / 2 - 180),
        left: Math.max(24, window.innerWidth / 2 - 200),
      });
      return;
    }

    const el = document.querySelector(`[data-hub-tour="${step.target}"]`);
    if (!el) {
      setTargetRect(null);
      setCardPos({ top: 80, left: 24 });
      return;
    }

    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    const rect = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
    setTargetRect(rect);

    const cardW = Math.min(380, window.innerWidth - 32);
    let left = rect.left + rect.width + 16;
    let top = rect.top;

    if (left + cardW > window.innerWidth - 16) {
      left = Math.max(16, rect.left);
      top = rect.top + rect.height + 16;
    }
    if (top + 320 > window.innerHeight - 16) {
      top = Math.max(16, rect.top - 280);
    }
    if (left < 16) left = 16;

    setCardPos({ top, left });
  }, [step]);

  useLayoutEffect(() => {
    measureTarget();
  }, [measureTarget, index]);

  useEffect(() => {
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goNext = () => {
    if (isLast) {
      if (step.cta) onCta(step.cta.href);
      else onClose();
      return;
    }
    setIndex((i) => i + 1);
  };

  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Hub onboarding tour">
      {/* Dim overlay with spotlight cutout via box-shadow */}
      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-lg border-2 border-[#C9A84C] shadow-[0_0_0_9999px_rgba(0,0,0,0.78)] transition-all duration-300 ease-out"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            zIndex: 201,
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/78" style={{ zIndex: 201 }} />
      )}

      {/* Guide mascot */}
      <div
        className="pointer-events-none fixed hidden lg:block animate-in fade-in duration-500"
        style={{
          zIndex: 203,
          top: cardPos.top + 20,
          left: cardPos.left + 400,
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C9A84C]/40 bg-[#141414] shadow-xl">
          <Shield className="h-8 w-8 text-[#C9A84C]" />
        </div>
      </div>

      {/* Tour card */}
      <div
        className={cn(
          "fixed w-[min(380px,calc(100vw-32px))] rounded-2xl border border-[#2a2a2a]",
          "bg-[#faf8f4] text-[#0a0a0a] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300",
        )}
        style={{ top: cardPos.top, left: cardPos.left, zIndex: 204 }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e8e4dd] px-5 pt-4 pb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8B0000]">
              {BRAND_NAME.split(" ")[0]} · Step {index + 1} of {total}
            </p>
            {step.badge && (
              <span className="mt-1 inline-block rounded-full bg-[#C9A84C]/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8B6914]">
                {step.badge}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#666] hover:bg-black/5 hover:text-black"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <h2 className="font-display text-2xl font-bold text-[#0a0a0a] leading-tight">
            {step.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#3f3f46]">{step.description}</p>
          {step.footnote && (
            <p className="mt-3 text-xs italic text-[#78716c]">{step.footnote}</p>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-between gap-3 border-t border-[#e8e4dd] px-5 py-4">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-[#C9A84C]" : "w-1.5 bg-[#d4d4d8]",
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={goBack}
                className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#71717a] hover:text-[#0a0a0a]"
              >
                Back
              </button>
            )}
            {isLast && step.cta ? (
              <button
                type="button"
                onClick={() => onCta(step.cta!.href)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 py-2 text-sm font-semibold text-[#E8E4DD] hover:bg-[#141414]"
              >
                {step.cta.label}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 py-2 text-sm font-semibold text-[#E8E4DD] hover:bg-[#141414]"
              >
                {isLast ? "Finish" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {isLast && (
          <div className="border-t border-[#e8e4dd] px-5 py-3 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold uppercase tracking-wider text-[#71717a] hover:text-[#0a0a0a]"
            >
              I&apos;ll do it later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default HubOnboardingTour;
