import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { Shield } from "lucide-react";

const searchSchema = z.object({ program: z.enum(["vanguard", "flow"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Vanguard & Flow" },
      { name: "description", content: "Sign in or create your mentorship account." },
    ],
  }),
  component: AuthPage,
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
