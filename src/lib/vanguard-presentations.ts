/**
 * Vanguard Brotherhood — Cohort Presentation Viewer data.
 * 12-week curriculum decks + operational slide packs.
 */

export interface PresentationSlide {
  title: string;
  subtitle?: string;
  bullets: string[];
}

export interface VanguardWeekPresentation {
  week: number;
  title: string;
  month: number;
  monthLabel: string;
  focus: string;
  slides: PresentationSlide[];
}

export type PresentationPackId =
  | "week"
  | "lobby-etiquette"
  | "full-deck"
  | "silent-icebreakers";

export const PRESENTATION_FOOTER = "Free Bleeders Inc. • Operational Asset";

/** 12-week Vanguard Brotherhood cohort titles (Week 1 → Week 12). */
export const VANGUARD_PRESENTATION_WEEKS: VanguardWeekPresentation[] = [
  {
    week: 1,
    month: 1,
    monthLabel: "Foundations",
    title: "Welcome & Brotherhood Alliance",
    focus: "Trust, peer connection, and operational guidelines.",
    slides: [
      {
        title: "Opening the Alliance",
        subtitle: "Week 1 · Foundations",
        bullets: [
          "Welcome mentors and mentees — cameras on, mics muted until called.",
          "Share name, grade, and one word that describes your leadership edge.",
          "Review cohort norms: respect, confidentiality, and punctuality.",
        ],
      },
      {
        title: "Brotherhood Standards",
        bullets: [
          "We show up prepared, on time, and ready to contribute.",
          "Challenge ideas — never character. Speak with clarity and care.",
          "Celebrate wins publicly; address friction privately with your mentor.",
        ],
      },
      {
        title: "Session Flow",
        bullets: [
          "Lobby hold → welcome → icebreaker → core teaching → breakout → close.",
          "Mentors facilitate; mentees co-lead segments starting Week 9.",
          "Weekly workbook entries due within 24 hours of each session.",
        ],
      },
      {
        title: "Week 1 Commitments",
        bullets: [
          "Set one personal target for the next seven days.",
          "Confirm your Zoom display name and calendar reminders.",
          "Preview Week 2: Understanding Your Body.",
        ],
      },
    ],
  },
  {
    week: 2,
    month: 1,
    monthLabel: "Foundations",
    title: "Understanding Your Body",
    focus: "Physical literacy, biology, and injury mitigation.",
    slides: [
      {
        title: "Physical Literacy",
        subtitle: "Week 2 · Foundations",
        bullets: [
          "Know your baseline: sleep, hydration, and movement patterns.",
          "Identify sport or activity risks relevant to your body.",
          "Discuss bleeding-disorder awareness where applicable.",
        ],
      },
      {
        title: "Injury Mitigation",
        bullets: [
          "Warm-up and cool-down are non-negotiable habits.",
          "Report pain early — silence delays recovery.",
          "Build a simple home recovery kit checklist.",
        ],
      },
      {
        title: "Athletic Safety",
        bullets: [
          "Communicate limits to coaches and trainers with confidence.",
          "Use the STOP protocol: Stop, Tell, Observe, Plan.",
          "Pair accountability partners for weekly movement goals.",
        ],
      },
      {
        title: "Week 2 Action",
        bullets: [
          "Log three physical wins in your tracking sheet.",
          "Schedule one proactive wellness conversation this month.",
          "Preview Week 3: Routine & Independence.",
        ],
      },
    ],
  },
  {
    week: 3,
    month: 1,
    monthLabel: "Foundations",
    title: "Routine & Independence",
    focus: "Daily habits and morning execution.",
    slides: [
      {
        title: "Morning Architecture",
        subtitle: "Week 3 · Foundations",
        bullets: [
          "Design a 30-minute morning stack: hydrate, move, plan.",
          "Remove friction: prep clothes, meals, and gear the night before.",
          "Track consistency, not perfection — streaks build identity.",
        ],
      },
      {
        title: "Sleep & Nutrition",
        bullets: [
          "Target consistent sleep windows — screens off 45 minutes before bed.",
          "Protein-forward breakfasts stabilize focus for school and sport.",
          "Hydration targets scale with activity and climate.",
        ],
      },
      {
        title: "Self-Management Systems",
        bullets: [
          "Use one calendar for school, mentorship, and personal goals.",
          "Batch similar tasks; protect deep-work blocks.",
          "Weekly reset every Sunday: review, prioritize, prepare.",
        ],
      },
      {
        title: "Week 3 Action",
        bullets: [
          "Publish your written morning routine in the workbook.",
          "Eliminate one habit that steals your first hour.",
          "Preview Week 4: Building Self-Confidence.",
        ],
      },
    ],
  },
  {
    week: 4,
    month: 1,
    monthLabel: "Foundations",
    title: "Building Self-Confidence",
    focus: "Dynamic self-esteem and visual presence.",
    slides: [
      {
        title: "Presence & Posture",
        subtitle: "Week 4 · Foundations",
        bullets: [
          "Square shoulders, steady breath, grounded stance on camera.",
          "Eye contact signals conviction — look at the lens, not the screen.",
          "Dress for the role you are growing into.",
        ],
      },
      {
        title: "Voice & Clarity",
        bullets: [
          "Pause before you speak; eliminate filler words.",
          "Structure answers: point → proof → payoff.",
          "Practice 60-second introductions until they feel natural.",
        ],
      },
      {
        title: "Imposter Syndrome",
        bullets: [
          "Name the narrative; replace it with evidence of effort.",
          "Compare against your past self, not someone else's highlight reel.",
          "Ask for feedback — growth requires mirrors.",
        ],
      },
      {
        title: "Week 4 Action",
        bullets: [
          "Record a 90-second confidence statement for your mentor.",
          "Lead one small group share next session.",
          "Preview Week 5: Discipline & Responsibility.",
        ],
      },
    ],
  },
  {
    week: 5,
    month: 2,
    monthLabel: "Life Skills",
    title: "Discipline & Responsibility",
    focus: "Structuring days for high performance.",
    slides: [
      {
        title: "Discipline Over Motivation",
        subtitle: "Week 5 · Life Skills",
        bullets: [
          "Motivation fluctuates; systems endure.",
          "Define non-negotiables — small, daily, measurable.",
          "Reward completion, not intensity alone.",
        ],
      },
      {
        title: "Time Architecture",
        bullets: [
          "Time-block school, training, rest, and brotherhood commitments.",
          "Protect transition buffers between contexts.",
          "Say no to good opportunities that break great priorities.",
        ],
      },
      {
        title: "Accountability Structures",
        bullets: [
          "Pair with an accountability brother for weekly check-ins.",
          "Report metrics, not moods — numbers reveal patterns.",
          "Mentors coach; mentees own outcomes.",
        ],
      },
      {
        title: "Week 5 Action",
        bullets: [
          "Document three non-negotiables for this month.",
          "Remove one recurring distraction from your schedule.",
          "Preview Week 6: Managing Emotions.",
        ],
      },
    ],
  },
  {
    week: 6,
    month: 2,
    monthLabel: "Life Skills",
    title: "Managing Emotions",
    focus: "Stress, isolation, and triggers.",
    slides: [
      {
        title: "Emotional Intelligence",
        subtitle: "Week 6 · Life Skills",
        bullets: [
          "Name the feeling before you react.",
          "Separate stimulus from story — facts first.",
          "Regulate, then respond; never respond from spike.",
        ],
      },
      {
        title: "Tactical Breathing",
        bullets: [
          "Box breathing: 4 in, 4 hold, 4 out, 4 hold.",
          "Use before exams, games, and difficult conversations.",
          "Pair breath with a physical anchor (feet on floor, hand on chest).",
        ],
      },
      {
        title: "Stress Routines",
        bullets: [
          "Build a 10-minute reset: walk, journal, or prayer/meditation.",
          "Limit doom-scrolling during high-stress weeks.",
          "Reach out to mentor or parent before isolation hardens.",
        ],
      },
      {
        title: "Week 6 Action",
        bullets: [
          "Write your personal trigger map and reset plan.",
          "Practice box breathing daily for one week.",
          "Preview Week 7: Peer Pressure Mastery.",
        ],
      },
    ],
  },
  {
    week: 7,
    month: 2,
    monthLabel: "Life Skills",
    title: "Peer Pressure Mastery",
    focus: "Guarding limits in negative social spaces.",
    slides: [
      {
        title: "Pressure Patterns",
        subtitle: "Week 7 · Life Skills",
        bullets: [
          "Identify environments where your standards are tested.",
          "Recognize social cost vs. long-term identity cost.",
          "Pre-decide responses before you enter high-risk settings.",
        ],
      },
      {
        title: "Boundary Scripts",
        bullets: [
          "Short, calm, final: \"I'm good — I don't do that.\"",
          "Offer an alternative activity when possible.",
          "Exit beats debate when safety is on the line.",
        ],
      },
      {
        title: "Status Without Compromise",
        bullets: [
          "Consistency earns respect faster than conformity.",
          "Align with friends who reinforce your standards.",
          "Mentors are backup — use them before crises.",
        ],
      },
      {
        title: "Week 7 Action",
        bullets: [
          "Role-play three boundary scripts with your mentor.",
          "List allies who support your non-negotiables.",
          "Preview Week 8: Healthy Relationships.",
        ],
      },
    ],
  },
  {
    week: 8,
    month: 2,
    monthLabel: "Life Skills",
    title: "Healthy Relationships",
    focus: "Respectful and clear communication.",
    slides: [
      {
        title: "Friendship Standards",
        subtitle: "Week 8 · Life Skills",
        bullets: [
          "Mutual respect, honesty, and reciprocity define brotherhood.",
          "Address small fractures before they become ruptures.",
          "Celebrate friends publicly; correct privately.",
        ],
      },
      {
        title: "Communication Clarity",
        bullets: [
          "Use I-statements; avoid accusatory language.",
          "Listen to understand, not to win.",
          "Confirm agreements in writing for important plans.",
        ],
      },
      {
        title: "Dating & Respect",
        bullets: [
          "Consent, clarity, and courtesy are baseline expectations.",
          "Pursue relationships that elevate your standards.",
          "Walk away from patterns that erode self-respect.",
        ],
      },
      {
        title: "Week 8 Action",
        bullets: [
          "Repair or release one strained relationship with mentor guidance.",
          "Draft a personal relationship charter (3 standards).",
          "Preview Week 9: Leadership & Character.",
        ],
      },
    ],
  },
  {
    week: 9,
    month: 3,
    monthLabel: "Leadership",
    title: "Leadership & Character",
    focus: "Integrity and leading by example.",
    slides: [
      {
        title: "Leadership Is Conduct",
        subtitle: "Week 9 · Leadership",
        bullets: [
          "Character is what you do when no one is watching.",
          "Mentees co-facilitate segments this month.",
          "Model punctuality, preparation, and follow-through.",
        ],
      },
      {
        title: "Integrity Practices",
        bullets: [
          "Keep promises — small commitments compound trust.",
          "Admit mistakes quickly; propose fixes immediately.",
          "Protect confidential cohort conversations.",
        ],
      },
      {
        title: "Peer Leadership",
        bullets: [
          "Invite quieter brothers into discussion deliberately.",
          "Summarize and synthesize group insights.",
          "Debrief wins and gaps after each session.",
        ],
      },
      {
        title: "Week 9 Action",
        bullets: [
          "Lead a 5-minute cohort segment next Zoom.",
          "Document one leadership win and one growth edge.",
          "Preview Week 10: Advocating for Your Future.",
        ],
      },
    ],
  },
  {
    week: 10,
    month: 3,
    monthLabel: "Leadership",
    title: "Advocating for Your Future",
    focus: "High-stakes professional conversations.",
    slides: [
      {
        title: "Executive Voice",
        subtitle: "Week 10 · Leadership",
        bullets: [
          "Prepare agendas for doctor, coach, and teacher meetings.",
          "State needs clearly: context, ask, timeline, follow-up.",
          "Bring documentation — logs, plans, and prior agreements.",
        ],
      },
      {
        title: "Medical & Academic Advocacy",
        bullets: [
          "Know your rights to accommodations and clear communication.",
          "Practice requesting support without apology.",
          "Escalate respectfully when dismissed — involve mentors/parents.",
        ],
      },
      {
        title: "Professional Presence",
        bullets: [
          "Email etiquette: subject, greeting, concise body, gratitude.",
          "Arrive early; confirm next steps before leaving any meeting.",
          "Follow up within 24 hours in writing.",
        ],
      },
      {
        title: "Week 10 Action",
        bullets: [
          "Conduct one advocacy conversation this month.",
          "Write a follow-up email template for your mentor to review.",
          "Preview Week 11: Future Goal Planning.",
        ],
      },
    ],
  },
  {
    week: 11,
    month: 3,
    monthLabel: "Leadership",
    title: "Future Goal Planning",
    focus: "Career, academic, and financial foundations.",
    slides: [
      {
        title: "Five-Year Horizon",
        subtitle: "Week 11 · Leadership",
        bullets: [
          "Map education, career, wellness, and brotherhood pillars.",
          "Identify skills gaps for the next 12 months.",
          "Assign one metric per pillar you will track quarterly.",
        ],
      },
      {
        title: "Financial Foundations",
        bullets: [
          "Understand income, saving, and giving as leadership disciplines.",
          "Avoid impulsive spending tied to social pressure.",
          "Research one scholarship, internship, or skill program this week.",
        ],
      },
      {
        title: "Decision Frameworks",
        bullets: [
          "Filter choices: Does this align with my 5-year map?",
          "Seek counsel from mentors before major pivots.",
          "Document decisions and review outcomes monthly.",
        ],
      },
      {
        title: "Week 11 Action",
        bullets: [
          "Submit your written 5-year vision map.",
          "Set three milestones for the next 90 days.",
          "Preview Week 12: Celebration & Graduation Rituals.",
        ],
      },
    ],
  },
  {
    week: 12,
    month: 3,
    monthLabel: "Leadership",
    title: "Celebration & Graduation Rituals",
    focus: "Transition to advanced leadership.",
    slides: [
      {
        title: "Graduation Ceremony",
        subtitle: "Week 12 · Leadership",
        bullets: [
          "Honor completion of the 12-week Vanguard Brotherhood cohort.",
          "Certificates, mentor remarks, and mentee testimonies.",
          "Silent moment for growth recognized and sacrifices made.",
        ],
      },
      {
        title: "Retrospective",
        bullets: [
          "Each mentee shares one transformation and one gift to the brotherhood.",
          "Mentors affirm specific evidence of leadership growth.",
          "Capture highlights for sponsor reporting and family updates.",
        ],
      },
      {
        title: "Advanced Pathways",
        bullets: [
          "Introduce alumni mentor track and high-adventure retreat criteria.",
          "Action Rewards eligibility review.",
          "Ongoing brotherhood touchpoints calendar for the next quarter.",
        ],
      },
      {
        title: "Closing Ritual",
        bullets: [
          "Brotherhood oath renewal — standards carried forward.",
          "Group photo and digital binder export for every family.",
          "Final word: \"We lead ourselves so we can lead others.\"",
        ],
      },
    ],
  },
];

export const LOBBY_ETIQUETTE_SLIDES: PresentationSlide[] = [
  {
    title: "Zoom Lobby Etiquette",
    subtitle: "Pre-Session Hold",
    bullets: [
      "Join 5 minutes early; remain in the lobby until admitted.",
      "Display your full name: First Last · Vanguard Cohort.",
      "Camera on, mic muted, professional background or blur enabled.",
    ],
  },
  {
    title: "While You Wait",
    bullets: [
      "Review the week slide deck and workbook prompts.",
      "Hydrate and silence notifications on all devices.",
      "No side conversations or unrelated screen sharing.",
    ],
  },
  {
    title: "Admission Protocol",
    bullets: [
      "Host admits cohort in cohort order; late entry noted by mentor.",
      "Greet with a nod or wave — keep audio muted until icebreaker.",
      "Technical issues: use chat → \"Tech support\" for host attention.",
    ],
  },
  {
    title: "Professional Close",
    bullets: [
      "Stay until the mentor releases the room.",
      "Submit session feedback within 10 minutes of dismiss.",
      "Log tracking metrics within 24 hours.",
    ],
  },
];

export const SILENT_ZOOM_ICEBREAKERS: PresentationSlide[] = [
  {
    title: "Silent Icebreaker Menu",
    subtitle: "Low-Noise Engagement",
    bullets: [
      "Emoji check-in: post one emoji that matches your energy today.",
      "Chat waterfall: type your answer, wait, send on \"3-2-1\".",
      "Gesture wave: show thumbs up / goal / gratitude on camera.",
    ],
  },
  {
    title: "Reflection Prompts (Chat)",
    bullets: [
      "One win from this week — one sentence max.",
      "One challenge you are actively working on.",
      "One way a brotherhood member helped you recently.",
    ],
  },
  {
    title: "Visual Polls",
    bullets: [
      "Hold up fingers 1–5 for readiness level.",
      "Green/yellow/red paper for go / cautious / need support.",
      "Whiteboard or notepad: write your goal for today's session.",
    ],
  },
  {
    title: "Transition to Voice",
    bullets: [
      "Mentor invites 2–3 volunteers to unmute — keep shares under 60 seconds.",
      "Use raised-hand feature before speaking.",
      "Return to mute after your share unless facilitating.",
    ],
  },
];

/** One overview slide per week for the full 12-week deck pack. */
export function buildFullDeckSlides(): PresentationSlide[] {
  return VANGUARD_PRESENTATION_WEEKS.map((w) => ({
    title: `Week ${w.week}: ${w.title}`,
    subtitle: `${w.monthLabel} · ${w.focus}`,
    bullets: w.slides[0]?.bullets.slice(0, 3) ?? [w.focus],
  }));
}

export function getWeekPresentation(week: number): VanguardWeekPresentation | undefined {
  return VANGUARD_PRESENTATION_WEEKS.find((w) => w.week === week);
}

export function slidesForPack(pack: PresentationPackId, week: number): PresentationSlide[] {
  switch (pack) {
    case "lobby-etiquette":
      return LOBBY_ETIQUETTE_SLIDES;
    case "silent-icebreakers":
      return SILENT_ZOOM_ICEBREAKERS;
    case "full-deck":
      return buildFullDeckSlides();
    case "week":
    default:
      return getWeekPresentation(week)?.slides ?? [];
  }
}

export function packLabel(pack: PresentationPackId, week: number): string {
  switch (pack) {
    case "lobby-etiquette":
      return "Lobby Etiquette";
    case "silent-icebreakers":
      return "Silent-Zoom Icebreakers";
    case "full-deck":
      return "12-Week Slides Deck";
    case "week":
    default: {
      const w = getWeekPresentation(week);
      return w ? `Week ${w.week}: ${w.title}` : `Week ${week}`;
    }
  }
}
