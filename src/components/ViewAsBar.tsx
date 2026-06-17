import { useUserContext, setViewAs, type AppRole, type Program } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

export function ViewAsBar() {
  const { realRole, viewAs } = useUserContext();
  if (realRole !== "admin" || !viewAs) return null;
  return (
    <div className="sticky top-16 z-30 border-b border-program/40 bg-program/10 text-foreground">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs sm:px-6">
        <Eye className="h-3.5 w-3.5 text-program" />
        <span>
          Previewing as <span className="font-semibold capitalize">{viewAs.role}</span>
          {viewAs.program ? <> · <span className="capitalize">{viewAs.program}</span></> : null}
        </span>
        <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => setViewAs(null)}>
          <X className="mr-1 h-3.5 w-3.5" /> Exit preview
        </Button>
      </div>
    </div>
  );
}

const ROLES: AppRole[] = ["mentor", "mentee", "parent"];
const PROGRAMS: Program[] = ["vanguard", "flow"];

export function ViewAsPicker() {
  const { realRole, viewAs } = useUserContext();
  if (realRole !== "admin") return null;
  const current = viewAs;
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</p>
        <div className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={current?.role === r ? "default" : "outline"}
              className="capitalize"
              onClick={() => setViewAs({ role: r, program: current?.program ?? "vanguard" })}
            >
              {r}
            </Button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Program</p>
        <div className="flex flex-wrap gap-1.5">
          {PROGRAMS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={current?.program === p ? "default" : "outline"}
              className="capitalize"
              disabled={!current}
              onClick={() => current && setViewAs({ role: current.role, program: p })}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>
      {current && (
        <Button size="sm" variant="ghost" onClick={() => setViewAs(null)}>
          Exit preview mode
        </Button>
      )}
    </div>
  );
}
