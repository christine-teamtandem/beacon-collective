import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { PROGRAMS, VANGUARD_CURRICULUM, FLOW_CURRICULUM } from "@/lib/curriculum";
import { Shield, Sparkles, Users, Trophy, Calendar, BookOpen, Heart, ArrowRight, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vanguard & Flow — Elite Youth Mentorship Platform" },
      { name: "description", content: "Two elite mentorship programs for young men and young women aged 12-18. Master health, build confidence, lead." },
      { property: "og:title", content: "Vanguard & Flow — Elite Youth Mentorship" },
      { property: "og:description", content: "Brotherhood for young men. Sisterhood for young women. Health, leadership, and life skills." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-widest text-gold mb-6">
            <Sparkles className="h-3 w-3" /> Elite Youth Mentorship · Ages 12–18
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-bold leading-tight">
            Build the next<br />generation of <span className="text-gold">leaders</span>.
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
            Two sponsored mentorship programs. One mission — empower young people to master their health, command their confidence, and lead their own lives.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-gold text-primary-foreground font-semibold shadow-elegant">
              <Link to="/auth">Start your journey <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border">
              <a href="#programs">Explore programs</a>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-3 max-w-2xl mx-auto gap-4 text-center">
            <Stat label="Sponsored" value="100%" />
            <Stat label="Weekly sessions" value="12+" />
            <Stat label="Age range" value="12–18" />
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-gold font-semibold">Choose your alliance</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold">Two programs. One brotherhood/sisterhood.</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Vanguard */}
            <ProgramCard
              meta={PROGRAMS.vanguard}
              icon={<Shield className="h-6 w-6" />}
              gradient="bg-gradient-gold"
              weeks={VANGUARD_CURRICULUM.slice(0, 4)}
              cta="Join the Brotherhood"
            />
            {/* Flow */}
            <ProgramCard
              meta={PROGRAMS.flow}
              icon={<Heart className="h-6 w-6" />}
              gradient="bg-gradient-rose"
              weeks={FLOW_CURRICULUM.slice(0, 4)}
              cta="Join the Collective"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-surface/40 py-24 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-gold font-semibold">Built for impact</p>
            <h2 className="mt-3 font-display text-4xl font-bold">Everything mentors and mentees need</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Feature icon={<BookOpen className="h-5 w-5" />} title="Interactive curriculum" body="Weekly topics with reflections, mentees mark progress, mentors guide deeper conversations." />
            <Feature icon={<Calendar className="h-5 w-5" />} title="Tracking & engagement" body="Mentors log Mentee Wins, Engagement, and Family Liaison notes for sponsorship reports." />
            <Feature icon={<Users className="h-5 w-5" />} title="Role-based access" body="Mentees, mentors, parents, and admins each get the dashboard built for them." />
            <Feature icon={<Trophy className="h-5 w-5" />} title="Mentor workbook" body="Per-mentee weekly notes synced and ready for 1:1 Zoom sessions." />
            <Feature icon={<Sparkles className="h-5 w-5" />} title="Sponsor-ready reports" body="Admins see aggregate engagement and milestones across the whole cohort." />
            <Feature icon={<CheckCircle2 className="h-5 w-5" />} title="Family visibility" body="Parents follow their child's journey with the right level of transparency." />
          </div>
        </div>
      </section>

      <section className="py-24 text-center">
        <h2 className="font-display text-4xl font-bold">Ready to lead?</h2>
        <p className="mt-3 text-muted-foreground">Create your account and pick your program.</p>
        <Button asChild size="lg" className="mt-8 bg-gradient-gold text-primary-foreground font-semibold shadow-elegant">
          <Link to="/auth">Create account <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Vanguard & Flow — Mentorship Platform
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface/50 p-4">
      <div className="text-3xl font-display font-bold text-gold">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold/10 text-gold">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ProgramCard({
  meta, icon, gradient, weeks, cta,
}: {
  meta: typeof PROGRAMS.vanguard;
  icon: React.ReactNode;
  gradient: string;
  weeks: { week: number; title: string }[];
  cta: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-elegant transition hover:border-gold/40">
      <div className={`absolute -top-20 -right-20 h-48 w-48 rounded-full ${gradient} opacity-10 blur-3xl`} />
      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${gradient} text-primary-foreground`}>{icon}</div>
      <p className="mt-6 text-xs uppercase tracking-widest text-muted-foreground">{meta.subtitle}</p>
      <h3 className="mt-2 font-display text-3xl font-bold">{meta.name}</h3>
      <p className="mt-1 text-sm text-gold">{meta.tagline}</p>
      <p className="mt-4 text-sm text-muted-foreground">{meta.description}</p>

      <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-border p-3">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Audience</dt>
          <dd className="mt-1 font-semibold">{meta.ageGroup}</dd>
        </div>
        <div className="rounded-md border border-border p-3">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Duration</dt>
          <dd className="mt-1 font-semibold">{meta.duration}</dd>
        </div>
      </dl>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Month 1 preview</p>
        <ul className="space-y-2">
          {weeks.map((w) => (
            <li key={w.week} className="flex items-center gap-3 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-gold/30 text-xs text-gold font-semibold">W{w.week}</span>
              {w.title}
            </li>
          ))}
        </ul>
      </div>

      <Button asChild className="mt-8 w-full bg-gradient-gold text-primary-foreground font-semibold">
        <Link to="/auth" search={{ program: meta.id }}>{cta} <ArrowRight className="ml-1 h-4 w-4" /></Link>
      </Button>
    </div>
  );
}
