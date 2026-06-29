import type { AppRole, Program } from "@/hooks/useSession";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export type HubTourStep = {
  id: string;
  target?: string;
  title: string;
  description: string;
  footnote?: string;
  cta?: { label: string; href: string };
  badge?: string;
};

export const HUB_TOUR_STORAGE_KEY = "hub_onboarding_tour_v1";

export function tourStorageKey(userId: string) {
  return `${HUB_TOUR_STORAGE_KEY}:${userId}`;
}

const STEP: Record<string, Omit<HubTourStep, "id"> & { id: string }> = {
  welcome: {
    id: "welcome",
    title: `Welcome to ${BRAND_NAME}`,
    description:
      "This quick tour walks you through the hub — your command center for curriculum, sessions, messaging, and progress.",
    footnote: BRAND_TAGLINE,
  },
  dashboard: {
    id: "dashboard",
    target: "dashboard",
    badge: "Your hub",
    title: "Dashboard",
    description:
      "See upcoming sessions, program stats, and your next actions at a glance when you sign in.",
  },
  curriculum: {
    id: "curriculum",
    target: "curriculum",
    badge: "12-week path",
    title: "Curriculum",
    description:
      "Follow the full 12-week roadmap — Foundations, Life Skills, and Leadership — with weekly topics and reflections.",
  },
  presentations: {
    id: "presentations",
    target: "presentations",
    badge: "Vanguard ops",
    title: "Cohort Presentations",
    description:
      "Launch slide decks for each week, lobby etiquette, silent Zoom icebreakers, and export a PDF binder for your cohort.",
  },
  tracking: {
    id: "tracking",
    target: "tracking",
    badge: "Mentor tools",
    title: "Tracking Logs",
    description:
      "Record mentee wins, engagement scores, and milestones within 24 hours of each session.",
  },
  workbook: {
    id: "workbook",
    target: "workbook",
    badge: "Session prep",
    title: "Workbook",
    description:
      "Review or complete weekly session plans and observations for each mentee before your Zoom call.",
  },
  email: {
    id: "email",
    target: "email",
    badge: "Communications",
    title: "Email center",
    description:
      "Compose branded messages, schedule sends, and use AI-assisted drafts for cohort outreach.",
  },
  admin: {
    id: "admin",
    target: "admin",
    badge: "Super Admin",
    title: "Admin Portal",
    description:
      "Manage accounts, run diagnostics, send password resets, and monitor program health.",
  },
  people: {
    id: "people",
    target: "people",
    badge: "Roster",
    title: "Students & pairings",
    description:
      "Assign programs, pair mentors with mentees, and link family accounts.",
  },
  calendar: {
    id: "calendar",
    target: "calendar",
    badge: "Zoom ready",
    title: "Sessions & Calendar",
    description:
      "Schedule mentorship sessions, auto-create Zoom rooms, and send calendar confirmations to participants.",
  },
  messages: {
    id: "messages",
    target: "messages",
    badge: "Stay connected",
    title: "Messages",
    description:
      "Direct threads with your mentor, mentee, or program lead — private and secure inside the hub.",
  },
  announcements: {
    id: "announcements",
    target: "announcements",
    badge: "Program news",
    title: "Announcements",
    description:
      "Pinned updates from mentors and admins — cohort news, reminders, and celebration highlights.",
  },
  resources: {
    id: "resources",
    target: "resources",
    badge: "Library",
    title: "Resources",
    description:
      "Workbooks, links, and program materials curated for your cohort. Mentors can upload new assets here.",
  },
};

export function tourTargetForUrl(url: string): string | undefined {
  const map: Record<string, string> = {
    "/dashboard": "dashboard",
    "/curriculum": "curriculum",
    "/presentations": "presentations",
    "/calendar": "calendar",
    "/messages": "messages",
    "/announcements": "announcements",
    "/resources": "resources",
    "/tracking": "tracking",
    "/workbook": "workbook",
    "/compose": "email",
    "/admin": "admin",
    "/people": "people",
    "/profile": "profile",
  };
  return map[url];
}

function finalStep(role: AppRole | null, program: Program | null): HubTourStep {
  if (role === "mentor" || role === "admin") {
    return {
      id: "finish",
      title: "Your first step",
      description:
        "Schedule your next cohort session or open the presentation viewer to run Week 1 with your mentees.",
      footnote: "You can replay this tour anytime from the sidebar footer.",
      cta:
        program === "vanguard" || role === "admin"
          ? { label: "Open cohort presentations", href: "/presentations" }
          : { label: "Open calendar", href: "/calendar" },
    };
  }
  if (role === "mentee") {
    return {
      id: "finish",
      title: "Your first step",
      description: "Open your curriculum and preview Week 1 before your next mentorship session.",
      footnote: "You can replay this tour anytime from the sidebar footer.",
      cta: { label: "View Week 1 curriculum", href: "/curriculum/1" },
    };
  }
  return {
    id: "finish",
    title: "You're all set",
    description: "Explore the hub at your pace — everything you need is in the sidebar.",
    footnote: "You can replay this tour anytime from the sidebar footer.",
    cta: { label: "Open dashboard", href: "/dashboard" },
  };
}

export function getHubTourSteps(role: AppRole | null, program: Program | null): HubTourStep[] {
  const order: (keyof typeof STEP)[] = ["welcome", "dashboard", "curriculum"];

  if (role === "admin") {
    order.push("admin", "people");
  }
  if (role === "mentor" || role === "admin") {
    if (program === "vanguard" || role === "admin") order.push("presentations");
    if (role === "mentor") order.push("tracking", "workbook");
    if (role === "admin" || role === "mentor") order.push("email");
  }
  if (role === "mentee") {
    order.push("workbook");
  }

  order.push("calendar", "messages", "announcements", "resources");

  const steps = order.map((k) => STEP[k]).filter(Boolean);
  steps.push(finalStep(role, program));
  return steps;
}
