import { createFileRoute, Link } from "@tanstack/react-router";
import { useUserContext } from "@/hooks/useSession";
import { CohortPresentationViewer } from "@/components/CohortPresentationViewer";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/presentations")({
  component: PresentationsPage,
  head: () => ({
    meta: [
      { title: "Cohort Presentation Viewer — Vanguard Brotherhood" },
      {
        name: "description",
        content: "12-week slide decks, lobby etiquette, and silent Zoom icebreakers for Vanguard cohort sessions.",
      },
    ],
  }),
});

function PresentationsPage() {
  const { role, program } = useUserContext();
  const allowed =
    role === "admin" || role === "mentor" || (program === "vanguard" && role !== "parent");

  if (!allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vanguard presentations</CardTitle>
          <CardDescription>
            This operational asset is available to Vanguard mentors and admins.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (role !== "admin" && program && program !== "vanguard") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gold" /> Vanguard Brotherhood only
          </CardTitle>
          <CardDescription>
            The Cohort Presentation Viewer is built for The Vanguard Brotherhood curriculum.
          </CardDescription>
          <Button asChild variant="outline" className="w-fit mt-2">
            <Link to="/curriculum">View your program curriculum</Link>
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4 -mx-2 sm:mx-0">
      <CohortPresentationViewer />
    </div>
  );
}
