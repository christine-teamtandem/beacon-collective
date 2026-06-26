import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

type State = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export const Route = createFileRoute("/unsubscribe")({
  component: UnsubscribePage,
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : "" }),
});

function UnsubscribePage() {
  const { token } = useSearch({ from: "/unsubscribe" });
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) { setState("invalid"); return; }
        if (j.valid === false && j.reason === "already_unsubscribed") setState("already");
        else if (j.valid) setState("valid");
        else setState("invalid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setState("loading");
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setError(j?.error || "Failed"); setState("error"); return; }
      if (j.success) setState("success");
      else if (j.reason === "already_unsubscribed") setState("already");
      else setState("error");
    } catch (e) {
      setError((e as Error).message); setState("error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>{BRAND_NAME} — {BRAND_TAGLINE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && <p className="text-sm text-muted-foreground">Loading...</p>}
          {state === "valid" && (
            <>
              <p className="text-sm">Click below to unsubscribe from {BRAND_NAME} emails.</p>
              <Button onClick={confirm} className="w-full">Confirm unsubscribe</Button>
            </>
          )}
          {state === "already" && <p className="text-sm">You're already unsubscribed.</p>}
          {state === "success" && <p className="text-sm">You've been unsubscribed. Sorry to see you go.</p>}
          {state === "invalid" && <p className="text-sm text-destructive">This unsubscribe link is invalid or expired.</p>}
          {state === "error" && <p className="text-sm text-destructive">Something went wrong. {error ?? ""}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
