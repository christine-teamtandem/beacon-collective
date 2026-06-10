import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { DonateModal } from "@/components/DonateModal";
import { PROGRAMS, VANGUARD_CURRICULUM, FLOW_CURRICULUM } from "@/lib/curriculum";
import {
  Shield, Sparkles, Users, Trophy, Calendar, BookOpen, Heart, ArrowRight,
  CheckCircle2, Link2, Target, HandHeart, Flame, Gift, ClipboardList, LineChart,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vanguard & Flow — Member Hub for Mentees, Mentors & Families" },
      { name: "description", content: "The private hub for enrolled mentees, mentors, and families of the Vanguard Brotherhood and Flow Collective mentorship programs." },
      { property: "og:title", content: "Vanguard & Flow — Member Hub" },
      { property: "og:description", content: "Sign in to access your curriculum, weekly tracking, mentor workbook, and family updates." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [donateOpen, setDonateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24 sm:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs uppercase tracking-widest text-gold mb-6">
            <Sparkles className="h-3 w-3" /> Member Hub · Mentees · Mentors · Families
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-bold leading-tight">
            Welcome to your<br /><span className="text-gold">Brotherhood & Collective</span> hub.
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg text-muted-foreground">
            The private home base for enrolled mentees, their mentors, and their families. Access your curriculum, weekly check-ins, tracking logs, and program updates — all in one place.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-gold text-primary-foreground font-semibold shadow-elegant">
              <Link to="/auth">Sign in <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-border" onClick={() => setDonateOpen(true)}>
              <Heart className="mr-1 h-4 w-4" /> Make a donation
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-3 max-w-2xl mx-auto gap-4 text-center">
            <Stat label="Week program" value="12" />
            <Stat label="Cohort Zooms" value="Weekly" />
            <Stat label="Age range" value="12–18" />
          </div>
        </div>
      </section>

      {/* Inside the hub */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-gold font-semibold">Inside your hub</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold">Everything members need in one place</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Each role sees the dashboard built for them — mentees, mentors, families, and program admins.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <HubFeature icon={<BookOpen className="h-5 w-5" />} title="12-Week Curriculum" body="Mentees follow the weekly roadmap — Foundations, Life Skills, Leadership — with reflections that mentors review." />
            <HubFeature icon={<ClipboardList className="h-5 w-5" />} title="Weekly Tracking Log" body="Mentors record Mentee Wins, engagement (1–5), and milestones within 24 hours of every 1:1." />
            <HubFeature icon={<Calendar className="h-5 w-5" />} title="1:1 Mentor Workbook" body="Per-mentee session notes auto-templated by week and synced for Zoom check-ins." />
            <HubFeature icon={<Users className="h-5 w-5" />} title="Family Liaison Updates" body="Parents follow their child's journey with the right level of transparency — no overreach." />
            <HubFeature icon={<LineChart className="h-5 w-5" />} title="Sponsor-Ready Reports" body="Admins see aggregate engagement, milestones, and Action Rewards across the entire cohort." />
            <HubFeature icon={<Gift className="h-5 w-5" />} title="Action Rewards Program" body="Reliable engagement unlocks digital gift cards, dinner-Zoom vouchers, and the high-adventure retreat." />
          </div>
        </div>
      </section>

      {/* 4 C's */}
      <section className="bg-surface/40 py-24 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-gold font-semibold">Our foundation</p>
            <h2 className="mt-3 font-display text-4xl font-bold">The 4 C's of Mentorship</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Four pillars guiding every session, message, and milestone inside the program.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Pillar icon={<Link2 className="h-5 w-5" />} title="Connection" body="A physically and psychologically safe environment that builds genuine, mutual trust." />
            <Pillar icon={<Target className="h-5 w-5" />} title="Clarity" body="Clear goals, non-negotiable boundaries, and reliable communication schedules." />
            <Pillar icon={<HandHeart className="h-5 w-5" />} title="Compassion" body="Active listening on health and emotional hurdles — empathy without judgment." />
            <Pillar icon={<Flame className="h-5 w-5" />} title="Commitment" body="Showing up — group Zooms, 1:1 check-ins, tasks, and graduation goals." />
          </div>
        </div>
      </section>

      {/* Programs */}
      <section id="programs" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-gold font-semibold">Your alliance</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold">Two programs. One brotherhood/sisterhood.</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <ProgramCard meta={PROGRAMS.vanguard} icon={<Shield className="h-6 w-6" />} gradient="bg-gradient-gold" weeks={VANGUARD_CURRICULUM.slice(0, 4)} />
            <ProgramCard meta={PROGRAMS.flow} icon={<Heart className="h-6 w-6" />} gradient="bg-gradient-rose" weeks={FLOW_CURRICULUM.slice(0, 4)} />
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="bg-surface/40 py-24 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-gold font-semibold">The roadmap</p>
            <h2 className="mt-3 font-display text-4xl font-bold">12 weeks. 3 phases.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Phase month="Month 1" title="Foundations" body="Acclimation to the brotherhood/collective, physical literacy, routine & independence, self-confidence." />
            <Phase month="Month 2" title="Life Skills" body="Discipline & responsibility, managing emotions, peer pressure mastery, healthy relationships." />
            <Phase month="Month 3" title="Leadership" body="Character & integrity, self-advocacy, 5-year future mapping, brotherhood/collective celebration." />
          </div>
        </div>
      </section>

      {/* Donate CTA */}
      <section className="py-24 text-center">
        <Trophy className="mx-auto h-10 w-10 text-gold" />
        <h2 className="mt-4 font-display text-4xl font-bold">Sponsor a young leader</h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Every donation funds curriculum, weekly rewards, mentor stipends, and the high-adventure retreats that complete the journey.
        </p>
        <Button size="lg" onClick={() => setDonateOpen(true)} className="mt-8 bg-gradient-gold text-primary-foreground font-semibold shadow-elegant">
          <Heart className="mr-1.5 h-4 w-4" /> Make a donation
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          Already a member? <Link to="/auth" className="text-gold hover:underline">Sign in to your hub →</Link>
        </p>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Vanguard & Flow — Administered by Free Bleeders Inc.
      </footer>

      <DonateModal open={donateOpen} onOpenChange={setDonateOpen} />
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

function HubFeature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 hover:border-gold/40 transition">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold/10 text-gold">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Pillar({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary-foreground">{icon}</div>
      <h3 className="mt-4 font-display text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Phase({ month, title, body }: { month: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-widest text-gold">{month}</p>
      <h3 className="mt-2 font-display text-2xl font-bold">{title}</h3>
      <p className="mt-3 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ProgramCard({
  meta, icon, gradient, weeks,
}: {
  meta: typeof PROGRAMS.vanguard;
  icon: React.ReactNode;
  gradient: string;
  weeks: { week: number; title: string }[];
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

      <div className="mt-6 flex items-start gap-2 rounded-md border border-border bg-surface/40 p-3 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-gold shrink-0 mt-0.5" />
        Enrolled in this program? Sign in to your hub to view your full roadmap and weekly check-ins.
      </div>
    </div>
  );
}
