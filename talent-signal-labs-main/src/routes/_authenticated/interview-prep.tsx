import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Play, GraduationCap, Trophy } from "lucide-react";
import { AppShell } from "@/components/cs/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { startInterview, listInterviewSessions } from "@/lib/interview.functions";

export const Route = createFileRoute("/_authenticated/interview-prep")({
  head: () => ({
    meta: [
      { title: "Interview Prep — CareerSignal" },
      { name: "description", content: "AI mock interviews with STAR-based scoring." },
    ],
  }),
  component: InterviewPrepPage,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn't load interview prep</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </Card>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <Card className="p-8 text-center text-sm text-muted-foreground">Not found.</Card>
    </AppShell>
  ),
});

function InterviewPrepPage() {
  const qc = useQueryClient();
  const startFn = useServerFn(startInterview);
  const listFn = useServerFn(listInterviewSessions);
  const { data: sessions } = useQuery({ queryKey: ["interview-sessions"], queryFn: () => listFn() });
  const navigate = Route.useNavigate();

  const [roleTitle, setRoleTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [mode, setMode] = useState<"behavioral" | "technical" | "company">("behavioral");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");

  const start = useMutation({
    mutationFn: () =>
      startFn({
        data: {
          roleTitle: roleTitle.trim(),
          companyName: companyName.trim() || undefined,
          mode,
          difficulty,
        },
      }),
    onSuccess: ({ session }) => {
      qc.invalidateQueries({ queryKey: ["interview-sessions"] });
      navigate({ to: "/interview-prep/$sessionId", params: { sessionId: session.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Interview Prep Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Run AI mock interviews. Get STAR-based scoring and concrete improvements after every answer.
          </p>
        </header>

        <Card className="p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Role you're prepping for (e.g. Senior PM)" value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
            <Input placeholder="Company (optional)" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Mode</p>
              <div className="flex gap-2">
                {(["behavioral", "technical", "company"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize ${
                      mode === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Difficulty</p>
              <div className="flex gap-2">
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`rounded-full border px-3 py-1 text-xs capitalize ${
                      difficulty === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button
            className="mt-4 gap-2"
            onClick={() => start.mutate()}
            disabled={start.isPending || !roleTitle.trim()}
          >
            <Play className="h-4 w-4" /> {start.isPending ? "Starting…" : "Start mock interview"}
          </Button>
        </Card>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Past sessions</h2>
          {(sessions ?? []).length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No sessions yet. Start your first mock above.
            </Card>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {(sessions ?? []).map((s) => (
              <Link
                key={s.id}
                to="/interview-prep/$sessionId"
                params={{ sessionId: s.id }}
                className="rounded-lg border border-border bg-card p-4 transition hover:border-primary"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{s.role_title}</p>
                    <p className="text-xs text-muted-foreground">{s.company_name ?? "—"}</p>
                  </div>
                  {s.overall_score != null ? (
                    <div className="flex items-center gap-1 text-sm font-bold text-primary">
                      <Trophy className="h-4 w-4" /> {s.overall_score}
                    </div>
                  ) : (
                    <Badge variant="secondary">In progress</Badge>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <GraduationCap className="h-3 w-3" />
                  <span className="capitalize">{s.mode}</span>
                  <span>·</span>
                  <span className="capitalize">{s.difficulty}</span>
                  <span>·</span>
                  <span>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
