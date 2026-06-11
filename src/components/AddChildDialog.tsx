import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { parentCreateChild } from "@/lib/parent.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, CheckCircle2 } from "lucide-react";

export function AddChildDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const qc = useQueryClient();
  const createFn = useServerFn(parentCreateChild);
  const [mode, setMode] = useState<"invite" | "managed">("invite");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [program, setProgram] = useState<"vanguard" | "flow" | "">("");
  const [result, setResult] = useState<{ email: string | null; tempPassword: string | null } | null>(null);

  const mutate = useMutation({
    mutationFn: async () =>
      createFn({ data: { mode, fullName, email: mode === "invite" ? email : undefined, program: program || null } }),
    onSuccess: (r) => {
      toast.success(mode === "invite" ? "Invitation account created." : "Child profile created.");
      setResult({ email: r.email, tempPassword: r.tempPassword });
      qc.invalidateQueries({ queryKey: ["my-children"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reset = () => {
    setFullName("");
    setEmail("");
    setProgram("");
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a child</DialogTitle>
          <DialogDescription>Choose how you want to set up your kid's account.</DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Child added
              </p>
              {result.email ? (
                <div className="mt-3 space-y-2 text-sm">
                  <Row label="Email" value={result.email} />
                  <Row label="Temporary password" value={result.tempPassword!} mono />
                  <p className="text-xs text-muted-foreground">Share these credentials with your child.</p>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Profile created. You can view and manage their activity from your dashboard.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Add another</Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "invite" | "managed")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invite">Invite with email</TabsTrigger>
              <TabsTrigger value="managed">Manage for them</TabsTrigger>
            </TabsList>

            <TabsContent value="invite" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">Your child will log in with their own email and password.</p>
              <Field label="Child's full name" value={fullName} onChange={setFullName} />
              <Field label="Child's email" type="email" value={email} onChange={setEmail} />
              <ProgramField value={program} onChange={setProgram} />
            </TabsContent>

            <TabsContent value="managed" className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">A profile is created without a login. You manage their hub from your account.</p>
              <Field label="Child's full name" value={fullName} onChange={setFullName} />
              <ProgramField value={program} onChange={setProgram} />
            </TabsContent>

            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={() => mutate.mutate()}
                disabled={mutate.isPending || !fullName || (mode === "invite" && !email)}
              >
                {mutate.isPending ? "Saving..." : "Add child"}
              </Button>
            </DialogFooter>
          </Tabs>
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

function ProgramField({ value, onChange }: { value: string; onChange: (v: "vanguard" | "flow") => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Program (optional)</Label>
      <Select value={value} onValueChange={(v) => onChange(v as "vanguard" | "flow")}>
        <SelectTrigger><SelectValue placeholder="Admin can assign later" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="vanguard">Vanguard Brotherhood</SelectItem>
          <SelectItem value="flow">Flow Collective</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <code className={mono ? "rounded bg-background px-1.5 py-0.5 font-mono text-xs" : "text-xs"}>{value}</code>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { navigator.clipboard.writeText(value); toast.success("Copied."); }}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
