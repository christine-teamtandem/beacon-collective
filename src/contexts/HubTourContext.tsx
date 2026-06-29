import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { getHubTourSteps, tourStorageKey, type HubTourStep } from "@/lib/hub-tour";
import { HubOnboardingTour } from "@/components/HubOnboardingTour";

type HubTourContextValue = {
  active: boolean;
  steps: HubTourStep[];
  startTour: () => void;
  dismissTour: () => void;
};

const HubTourContext = createContext<HubTourContextValue | null>(null);

export function HubTourProvider({ children }: { children: ReactNode }) {
  const { user, role, program, loading } = useUserContext();
  const navigate = useNavigate();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [manual, setManual] = useState(false);

  const steps = useMemo(() => getHubTourSteps(role, program), [role, program]);

  const dismissTour = useCallback(() => {
    setActive(false);
    if (user?.id) {
      try {
        localStorage.setItem(tourStorageKey(user.id), "completed");
      } catch {
        /* ignore */
      }
    }
  }, [user?.id]);

  const startTour = useCallback(() => {
    setManual(true);
    setActive(true);
  }, []);

  useEffect(() => {
    if (loading || !user?.id || manual) return;
    try {
      const done = localStorage.getItem(tourStorageKey(user.id));
      if (!done) {
        const t = window.setTimeout(() => setActive(true), 900);
        return () => window.clearTimeout(t);
      }
    } catch {
      setActive(true);
    }
  }, [loading, user?.id, manual]);

  const handleCta = useCallback(
    (href: string) => {
      dismissTour();
      const weekMatch = /^\/curriculum\/(\d+)$/.exec(href);
      if (weekMatch) {
        navigate({ to: "/curriculum/$week", params: { week: weekMatch[1] } });
        return;
      }
      router.history.push(href);
    },
    [dismissTour, navigate, router],
  );

  return (
    <HubTourContext.Provider value={{ active, steps, startTour, dismissTour }}>
      {children}
      {active && steps.length > 0 && (
        <HubOnboardingTour
          steps={steps}
          onClose={dismissTour}
          onCta={handleCta}
        />
      )}
    </HubTourContext.Provider>
  );
}

export function useHubTour() {
  const ctx = useContext(HubTourContext);
  if (!ctx) throw new Error("useHubTour must be used within HubTourProvider");
  return ctx;
}
