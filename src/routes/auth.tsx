import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { PROGRAMS } from "@/lib/curriculum";
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
  const { program: presetProgram } = Route.useSearch();
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

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const role = String(form.get("role"));
    const program = String(form.get("program") || "");
    const fullName = String(form.get("fullName"));
    const { error } = await supabase.auth.signUp({
      email: String(form.get("email")),
      password: String(form.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName, role, program: program || null },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created! Check your email if confirmation is required.");
    navigate({ to: "/dashboard" });
  };

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
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <Field label="Email" name="email" type="email" required />
                  <Field label="Password" name="password" type="password" required />
                  <Button disabled={loading} type="submit" className="w-full bg-gradient-gold text-primary-foreground font-semibold">
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <Field label="Full name" name="fullName" required />
                  <Field label="Email" name="email" type="email" required />
                  <Field label="Password" name="password" type="password" required minLength={6} />

                  <div className="space-y-2">
                    <Label>I am a</Label>
                    <Select name="role" defaultValue="mentee" required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mentee">Mentee (12–18)</SelectItem>
                        <SelectItem value="mentor">Mentor</SelectItem>
                        <SelectItem value="parent">Parent / Family</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Admins are assigned by the team.</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Program</Label>
                    <Select name="program" defaultValue={presetProgram}>
                      <SelectTrigger><SelectValue placeholder="Choose program" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vanguard">{PROGRAMS.vanguard.name}</SelectItem>
                        <SelectItem value="flow">{PROGRAMS.flow.name}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button disabled={loading} type="submit" className="w-full bg-gradient-gold text-primary-foreground font-semibold">
                    {loading ? "Creating..." : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
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
