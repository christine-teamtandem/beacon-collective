import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useUserContext } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Loader2, Upload, Sparkles, MapPin, Mail, Cake, Heart, Target, Lightbulb } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

const portfolioSchema = z.object({
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  birthday: z.string().min(1, "Birthday is required").regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  address: z.string().trim().min(4, "Address is required").max(500),
  avatar_url: z.string().url("Upload a profile photo").min(1, "Profile photo is required"),
  hobbies: z.string().max(500).optional().or(z.literal("")),
  favorites: z.string().max(500).optional().or(z.literal("")),
  goals: z.string().max(1000).optional().or(z.literal("")),
  fun_facts: z.string().max(1000).optional().or(z.literal("")),
});

type PortfolioForm = z.infer<typeof portfolioSchema>;

function ProfilePage() {
  const { user, role, fullName, loading } = useUserContext();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    enabled: !!user,
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, birthday, avatar_url, hobbies, favorites, goals, fun_facts, program")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const { data: addr } = await supabase.rpc("get_profile_address", { _profile_id: user!.id });
      return { ...data, address: (addr as string | null) ?? "" };
    },
  });

  const form = useForm<PortfolioForm>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      full_name: "", email: "", birthday: "", address: "", avatar_url: "",
      hobbies: "", favorites: "", goals: "", fun_facts: "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      full_name: profile.full_name ?? fullName ?? "",
      email: profile.email ?? user?.email ?? "",
      birthday: profile.birthday ?? "",
      address: profile.address ?? "",
      avatar_url: profile.avatar_url ?? "",
      hobbies: Array.isArray(profile.hobbies) ? profile.hobbies.join(", ") : (profile.hobbies ?? ""),
      favorites: profile.favorites ?? "",
      goals: profile.goals ?? "",
      fun_facts: profile.fun_facts ?? "",
    });
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAvatarChange = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("Image must be under 4MB."); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      form.setValue("avatar_url", signed.signedUrl, { shouldValidate: true, shouldDirty: true });
      toast.success("Photo uploaded.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: PortfolioForm) => {
    if (!user) return;
    const hobbies = values.hobbies
      ? values.hobbies.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    const payload = {
      full_name: values.full_name,
      email: values.email,
      birthday: values.birthday,
      address: values.address,
      avatar_url: values.avatar_url,
      hobbies,
      favorites: values.favorites || null,
      goals: values.goals || null,
      fun_facts: values.fun_facts || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Portfolio saved.");
    qc.invalidateQueries({ queryKey: ["my-profile", user.id] });
  };

  const avatarUrl = form.watch("avatar_url");
  const initials = useMemo(
    () => (form.watch("full_name") || fullName || user?.email || "?").slice(0, 1).toUpperCase(),
    [form, fullName, user]
  );

  if (loading || isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your portfolio…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-widest font-semibold text-program">
          {role} portfolio
        </p>
        <h1 className="font-display text-4xl font-bold mt-1 bg-gradient-to-r from-program to-gold bg-clip-text text-transparent">
          Your Portfolio
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Tell your story. The five essentials keep your account complete; the optional details help mentors and family connect with you on a deeper level.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="border-program/20">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Edit your portfolio</CardTitle>
            <CardDescription>The five fields marked required are mandatory for every account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 ring-2 ring-gold/40">
                    <AvatarImage src={avatarUrl || undefined} alt="" />
                    <AvatarFallback className="bg-gradient-program text-primary-foreground text-xl font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <FormLabel className="text-sm font-semibold">Profile photo <span className="text-rose">*</span></FormLabel>
                    <div className="mt-2 flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" asChild disabled={uploading}>
                        <label className="cursor-pointer">
                          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          <span className="ml-2">{uploading ? "Uploading…" : "Upload photo"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && onAvatarChange(e.target.files[0])}
                          />
                        </label>
                      </Button>
                    </div>
                    {form.formState.errors.avatar_url && (
                      <p className="text-xs text-rose mt-1">{form.formState.errors.avatar_url.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField control={form.control} name="full_name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name <span className="text-rose">*</span></FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email <span className="text-rose">*</span></FormLabel>
                      <FormControl><Input type="email" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="birthday" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birthday <span className="text-rose">*</span></FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address <span className="text-rose">*</span></FormLabel>
                      <FormControl><Input placeholder="Street, City, Region" {...field} /></FormControl>
                      <FormDescription className="text-xs">Private — visible only to you, admins, and your linked parent.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="border-t border-gold/20 pt-6">
                  <p className="text-xs uppercase tracking-widest font-semibold text-gold mb-4">Optional · tell us more</p>
                  <div className="grid gap-4">
                    <FormField control={form.control} name="hobbies" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hobbies</FormLabel>
                        <FormControl><Input placeholder="Comma separated — e.g. basketball, sketching, chess" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="favorites" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Favorites</FormLabel>
                        <FormControl><Input placeholder="Favorite food, music, films, books…" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="goals" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goals</FormLabel>
                        <FormControl><Textarea rows={3} placeholder="What you want from mentorship and life this season." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="fun_facts" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fun facts / other details</FormLabel>
                        <FormControl><Textarea rows={3} placeholder="Anything else you want your mentor or family to know." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <Button type="submit" disabled={form.formState.isSubmitting} className="bg-gradient-to-r from-program to-gold text-primary-foreground hover:opacity-90">
                  {form.formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Save portfolio
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <PortfolioCard
          fullName={form.watch("full_name")}
          email={form.watch("email")}
          birthday={form.watch("birthday")}
          address={form.watch("address")}
          avatarUrl={form.watch("avatar_url")}
          hobbies={form.watch("hobbies")}
          favorites={form.watch("favorites")}
          goals={form.watch("goals")}
          funFacts={form.watch("fun_facts")}
          role={role ?? "member"}
        />
      </div>
    </div>
  );
}

export function PortfolioCard(props: {
  fullName: string; email?: string; birthday?: string; address?: string | null;
  avatarUrl?: string; hobbies?: string; favorites?: string; goals?: string; funFacts?: string;
  role: string;
}) {
  const initials = (props.fullName || "?").slice(0, 1).toUpperCase();
  const hobbiesList = props.hobbies ? props.hobbies.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return (
    <Card className="overflow-hidden border-gold/30 bg-gradient-to-b from-card to-card/60">
      <div className="h-20 bg-gradient-to-r from-program via-program/80 to-gold" />
      <CardContent className="-mt-12 pb-6">
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24 ring-4 ring-card shadow-xl">
            <AvatarImage src={props.avatarUrl || undefined} alt="" />
            <AvatarFallback className="bg-gradient-program text-primary-foreground text-2xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <h3 className="font-display text-xl font-bold mt-3">{props.fullName || "Your name"}</h3>
          <Badge variant="outline" className="mt-1 border-gold/40 text-gold uppercase tracking-wider text-[10px]">{props.role}</Badge>
        </div>
        <div className="mt-5 space-y-2 text-sm">
          {props.email && <Row icon={<Mail className="h-4 w-4 text-program" />}>{props.email}</Row>}
          {props.birthday && <Row icon={<Cake className="h-4 w-4 text-program" />}>{props.birthday}</Row>}
          {props.address && <Row icon={<MapPin className="h-4 w-4 text-program" />}>{props.address}</Row>}
        </div>
        {hobbiesList.length > 0 && (
          <div className="mt-5">
            <SectionLabel icon={<Heart className="h-3 w-3" />}>Hobbies</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hobbiesList.map((h) => (
                <Badge key={h} variant="secondary" className="bg-gold/10 text-gold border border-gold/30">{h}</Badge>
              ))}
            </div>
          </div>
        )}
        {props.favorites && (
          <Section icon={<Sparkles className="h-3 w-3" />} title="Favorites">{props.favorites}</Section>
        )}
        {props.goals && (
          <Section icon={<Target className="h-3 w-3" />} title="Goals">{props.goals}</Section>
        )}
        {props.funFacts && (
          <Section icon={<Lightbulb className="h-3 w-3" />} title="Fun facts">{props.funFacts}</Section>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-start gap-2 text-muted-foreground"><span className="mt-0.5">{icon}</span><span className="break-words">{children}</span></div>;
}
function SectionLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-semibold text-gold">{icon}{children}</p>;
}
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <SectionLabel icon={icon}>{title}</SectionLabel>
      <p className="mt-1 text-sm text-foreground/90 whitespace-pre-wrap">{children}</p>
    </div>
  );
}
