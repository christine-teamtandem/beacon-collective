import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "givebutter-widget": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { id: string }, HTMLElement>;
    }
  }
}

const SCRIPT_SRC = "https://widgets.givebutter.com/latest.umd.cjs?acct=BbxNP7ipqjr3OjeE&p=other";

export function DonateModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      document.body.appendChild(s);
    }
    if (mountRef.current) {
      mountRef.current.innerHTML = '<givebutter-widget id="pQq3nN"></givebutter-widget>';
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Support the mission</DialogTitle>
          <DialogDescription>
            Your gift sponsors mentorship, retreats, and rewards for young people in {BRAND_NAME}. {BRAND_TAGLINE}
          </DialogDescription>
        </DialogHeader>
        <div ref={mountRef} className="mt-4 min-h-[400px]" />
      </DialogContent>
    </Dialog>
  );
}
