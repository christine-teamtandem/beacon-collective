import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { Shield, AlertTriangle } from "lucide-react";

const searchSchema = z.object({ program: z.enum(["vanguard", "flow"]).optional() });

function AuthErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <h1 className="font-display text-xl font-semibold">Sign-in page hit a snag</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {error?.message || "An unexpected error occurred while loading the sign-in page."}
      </p>
      <div className="flex gap-2">
        <Button onClick={() => { router.invalidate(); reset(); }}>Try again</Button>
        <Button variant="outline" onClick={() => router.navigate({ to: "/" })}>Go home</Button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — freebleeders mentorship hub" },
      { name: "description", content: "Sign in or create your mentorship account." },
    ],
  }),
  component: AuthPage,
  errorComponent: AuthErrorFallback,
});

function AuthPage() {
  const navigate = useNavigate();
  Route.useSearch();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  // Open signup disabled — accounts are created by admins (or parents for their kids).


  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="bg-gradient-hero">
        <div className="mx-auto max-w-md px-4 py-16">
          <div className="text-center mb-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-gold">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold">Welcome</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in or create your account</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-elegant">
            <form onSubmit={handleSignIn} className="space-y-4">
              <Field label="Email" name="email" type="email" required />
              <Field label="Password" name="password" type="password" required />
              <Button disabled={loading} type="submit" className="w-full bg-gradient-gold text-primary-foreground font-semibold">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full font-semibold"
              onClick={async () => {
                try {
                  const { lovable } = await import("@/integrations/lovable");
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (result.error) {
                    toast.error(result.error.message ?? "Google sign-in failed");
                    return;
                  }
                  if (result.redirected) return;
                  toast.success("Welcome!");
                  navigate({ to: "/dashboard" });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Google sign-in is unavailable right now.");
                }
              }}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.3 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.3 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.7 13.2-4.7l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.2 0-9.6-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.1 5c-.4.4 6.7-4.9 6.7-14.5 0-1.2-.1-2.3-.4-3.5z"/>
              </svg>
              Continue with Google
            </Button>
            <div className="mt-6 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Need an account?</p>
              <p className="mt-1">
                Accounts are created by program admins. Contact your coordinator or email{" "}
                <a className="text-program underline" href="mailto:freebleeders@gmail.com">freebleeders@gmail.com</a> to get set up.
              </p>
              <p className="mt-2">Parents: once your account is created, you can add your child from your dashboard.</p>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            <Link to="/" className="hover:text-foreground">← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.name}>{label}</Label>
      <Input id={props.name} {...props} />
    </div>
  );
}
