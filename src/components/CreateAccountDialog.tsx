import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createAccount } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, CheckCircle2 } from "lucide-react";

type Role = "admin" | "mentor" | "mentee" | "parent";

export function CreateAccountDialog({
  open,
  onOpenChange,
  defaultRole = "mentee",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultRole?: Role;
}) {
  const qc = useQueryClient();
  const createFn = useServerFn(createAccount);
  const [role, setRole] = useState<Role>(defaultRole);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [program, setProgram] = useState<"vanguard" | "flow" | "">("");
  const [mentorId, setMentorId] = useState<string>("");
  const [parentId, setParentId] = useState<string>("");
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);

  const { data: helpers } = useQuery({
    queryKey: ["account-helpers"],
    enabled: open,
    queryFn: async () => {
      const [{ data: roles }, { data: profiles }] = await Promise.all([
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, full_name, program"),
      ]);
      const map = new Map<string, string[]>();
      roles?.forEach((r) => {
        const a = map.get(r.user_id) ?? [];
        a.push(r.role);
        map.set(r.user_id, a);
      });
      const mentors = (profiles ?? []).filter((p) => map.get(p.id)?.includes("mentor"));
      const parents = (profiles ?? []).filter((p) => map.get(p.id)?.includes("parent"));
      return { mentors, parents };
    },
  });

  const mutate = useMutation({
    mutationFn: async () =>
      createFn({
        data: {
          email,
          fullName,
          role,
          program: program || null,
          assignedMentorId: mentorId || null,
          parentId: parentId || null,
        },
      }),
    onSuccess: (r) => {
      toast.success("Account created.");
      setResult({ email: r.email, tempPassword: r.tempPassword });
      qc.invalidateQueries({ queryKey: ["all-profiles"] });
      qc.invalidateQueries({ queryKey: ["account-helpers"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reset = () => {
    setEmail("");
    setFullName("");
    setProgram("");
    setMentorId("");
    setParentId("");
    setResult(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>An account will be created and a temporary password generated.</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Account ready
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <Row label="Email" value={result.email} />
                <Row label="Temporary password" value={result.tempPassword} mono />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Share these credentials with the user. They can change the password after sign in.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { reset(); }}>
                Create another
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="mentee">Mentee</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Field label="Full name" value={fullName} onChange={setFullName} />
            <Field label="Email" type="email" value={email} onChange={setEmail} />

            {(role === "mentor" || role === "mentee") && (
              <div className="space-y-1.5">
                <Label>Program</Label>
                <Select value={program} onValueChange={(v) => setProgram(v as "vanguard" | "flow")}>
                  <SelectTrigger><SelectValue placeholder="Choose program" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vanguard">Vanguard Brotherhood</SelectItem>
                    <SelectItem value="flow">Flow Collective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {role === "mentee" && (
              <>
                <div className="space-y-1.5">
                  <Label>Assigned mentor (optional)</Label>
                  <Select value={mentorId} onValueChange={setMentorId}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {(helpers?.mentors ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.program ?? "no program"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Parent (optional)</Label>
                  <Select value={parentId} onValueChange={setParentId}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      {(helpers?.parents ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => mutate.mutate()}
                disabled={mutate.isPending || !email || !fullName}
              >
                {mutate.isPending ? "Creating..." : "Create account"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <code className={mono ? "rounded bg-background px-1.5 py-0.5 font-mono text-xs" : "text-xs"}>{value}</code>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => {
            navigator.clipboard.writeText(value);
            toast.success("Copied.");
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
