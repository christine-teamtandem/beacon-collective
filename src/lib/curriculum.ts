export type Program = "vanguard" | "flow";

export interface WeekTopic {
  week: number;
  title: string;
  focus: string;
  description: string;
  month: number;
  monthLabel: string;
}

export interface ProgramMeta {
  id: Program;
  name: string;
  tagline: string;
  subtitle: string;
  ageGroup: string;
  duration: string;
  weeks: number;
  audience: string;
  accent: "gold" | "rose";
  description: string;
}

export const PROGRAMS: Record<Program, ProgramMeta> = {
  vanguard: {
    id: "vanguard",
    name: "The Vanguard Brotherhood",
    tagline: "Master your health. Build confidence. Lead.",
    subtitle: "3-Month Elite Mentorship Alliance",
    ageGroup: "Young Men · Ages 12–18",
    duration: "3 Months · 12 Weekly Sessions",
    weeks: 12,
    audience: "young men",
    accent: "gold",
    description:
      "An intensive 3-month leadership initiative designed for young men aged 12–18. We provide the tools to build discipline, confidence, and absolute independence.",
  },
  flow: {
    id: "flow",
    name: "The Flow Collective",
    tagline: "Invisible no more. Rule your life.",
    subtitle: "6-Month Health & Sisterhood Alliance",
    ageGroup: "Young Women · Ages 12–18",
    duration: "6 Months · 24 Weekly Circles",
    weeks: 12, // core foundational 12 weeks
    audience: "young women",
    accent: "rose",
    description:
      "A 100% sponsored sisterhood circle for young women navigating life with bleeding disorders. Shift from feeling misunderstood to ruling your physical health and future.",
  },
};

export const VANGUARD_CURRICULUM: WeekTopic[] = [
  { week: 1, month: 1, monthLabel: "Foundations", title: "Welcome & Brotherhood", focus: "Laying the groundwork of trust & peer connection.", description: "Personal introductions, operational guidelines, and initial personal targets." },
  { week: 2, month: 1, monthLabel: "Foundations", title: "Understanding Your Body", focus: "Physical literacy, biology, and injury mitigation.", description: "Fitness, physical margins, managing injuries, and athletic safety." },
  { week: 3, month: 1, monthLabel: "Foundations", title: "Routine & Independence", focus: "Daily habits and morning execution.", description: "Self-driven routines, sleep hygiene, nutrition, and self-management." },
  { week: 4, month: 1, monthLabel: "Foundations", title: "Building Self-Confidence", focus: "Dynamic self-esteem and visual presence.", description: "Communication, body language, and overcoming imposter syndrome." },
  { week: 5, month: 2, monthLabel: "Life Skills", title: "Discipline & Responsibility", focus: "Structuring days for high performance.", description: "Why discipline outlasts motivation. Setting non-negotiables." },
  { week: 6, month: 2, monthLabel: "Life Skills", title: "Managing Emotions", focus: "Stress, isolation, and triggers.", description: "Tactical breathing protocols and stress-management routines." },
  { week: 7, month: 2, monthLabel: "Life Skills", title: "Peer Pressure Mastery", focus: "Guarding limits in negative social spaces.", description: "Boundary scripts that preserve status while asserting independence." },
  { week: 8, month: 2, monthLabel: "Life Skills", title: "Healthy Relationships", focus: "Respectful and clear communication.", description: "Strong friendships, dating norms, and respecting standards." },
  { week: 9, month: 3, monthLabel: "Leadership", title: "Leadership & Character", focus: "Integrity and leading by example.", description: "Mentees lead parts of brotherhood Zoom meetings." },
  { week: 10, month: 3, monthLabel: "Leadership", title: "Advocating for Your Future", focus: "High-stakes professional conversations.", description: "Speaking to doctors, coaches, bosses with executive authority." },
  { week: 11, month: 3, monthLabel: "Leadership", title: "Future Goal Planning", focus: "Career, academic, and financial foundations.", description: "5-year vision: career, finance, education, prioritization." },
  { week: 12, month: 3, monthLabel: "Leadership", title: "Brotherhood Celebration", focus: "Transition to advanced leadership.", description: "Graduation and readiness for high-adventure retreats." },
];

export const FLOW_CURRICULUM: WeekTopic[] = [
  { week: 1, month: 1, monthLabel: "Foundations", title: "Sisterhood & Expectations", focus: "Safety, boundaries, and shared expectations.", description: "Personal introductions, breaking isolation, and co-creating safety norms." },
  { week: 2, month: 1, monthLabel: "Foundations", title: "Understanding Your Body", focus: "Biology, cycle tracking, and clotting literacy.", description: "Bleeding disorders (VWD, factor deficiencies), tracking, and joint safety." },
  { week: 3, month: 1, monthLabel: "Foundations", title: "Symptom Control & Advocacy", focus: "Heavy flows, treatments, and self-administration.", description: "Care plans, clotting treatments, needle anxiety, and travel kits." },
  { week: 4, month: 1, monthLabel: "Foundations", title: "Absolute Self-Esteem", focus: "Dismantling clinical stigma.", description: "Discussing your condition with friends and partners with confidence." },
  { week: 5, month: 2, monthLabel: "Life Skills", title: "School & Personal Goals", focus: "Accommodations and personal targets.", description: "504 plans, gym teacher convos, balanced academic-wellness goals." },
  { week: 6, month: 2, monthLabel: "Life Skills", title: "Emotional Balance & Resilience", focus: "Frustration, hormones, and chronic fatigue.", description: "Mindfulness and somatic routines for high-stress cycles." },
  { week: 7, month: 2, monthLabel: "Life Skills", title: "Saying No & Social Pressures", focus: "Asserting health boundaries.", description: "Role-play to safely decline risky behaviors with respect." },
  { week: 8, month: 2, monthLabel: "Life Skills", title: "Healthy Boundaries & Respect", focus: "Disclosure, communication, mutual respect.", description: "Romantic disclosures and surrounding yourself with supportive friends." },
  { week: 9, month: 3, monthLabel: "Leadership", title: "Sisterhood Leadership & Character", focus: "Finding your voice and leading peers.", description: "Lead circles, accountability structures, and peer coaching roles." },
  { week: 10, month: 3, monthLabel: "Leadership", title: "Clinical Advocacy", focus: "Lead at your hematology clinics.", description: "Transition from pediatric to adult care; clinic prep and ER strategy." },
  { week: 11, month: 3, monthLabel: "Leadership", title: "Future Goals & Career Pathways", focus: "Career mapping and independence.", description: "Career paths respecting wellness; insurance basics; 5-year map." },
  { week: 12, month: 3, monthLabel: "Leadership", title: "The Collective Celebration", focus: "Honoring progress.", description: "Foundational graduation. Certificates and advanced peer mentor prep." },
];

export function getCurriculum(program: Program): WeekTopic[] {
  return program === "vanguard" ? VANGUARD_CURRICULUM : FLOW_CURRICULUM;
}

export function getWeek(program: Program, week: number): WeekTopic | undefined {
  return getCurriculum(program).find((w) => w.week === week);
}
