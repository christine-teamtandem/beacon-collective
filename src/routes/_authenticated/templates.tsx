import { createFileRoute } from "@tanstack/react-router";
import { EmailBuilder } from "@/components/email/EmailBuilder";
import { LayoutTemplate } from "lucide-react";

export const Route = createFileRoute("/_authenticated/templates")({
  component: TemplatesPage,
});

function TemplatesPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold/10 text-gold">
          <LayoutTemplate className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold leading-tight">Email Templates</h1>
          <p className="text-sm text-muted-foreground">
            Build with drag-and-drop blocks, generate from a design reference, and save to your library.
          </p>
        </div>
      </div>
      <EmailBuilder />
    </div>
  );
}
