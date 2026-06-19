import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Send, ChevronLeft, Trophy, Sparkles } from "lucide-react";
import { AppShell } from "@/components/cs/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getInterviewSession,
  submitAnswer,
  type InterviewMessage,
} from "@/lib/interview.functions";

export const Route = createFileRoute("/_authenticated/interview-prep/$sessionId")({
  head: () => ({ meta: [{ title: "Mock Interview — CareerSignal" }] }),
  component: SessionPage,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold">Couldn't load session</h2>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={reset}>Retry</Button>
      </Card>
    </AppShell>
  ),
  notFoundComponent: () => (
    <AppShell>
      <Card className="p-8 text-center text-sm text-muted-foreground">Session not found.</Card>
    </AppShell>
  ),
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getInterviewSession);
  const answerFn = useServerFn(submitAnswer);

  const { data, isLoading } = useQuery({
    queryKey: ["interview-session", sessionId],
    queryFn: () => getFn({ data: { sessionId } }),
  });

  const [answer, setAnswer] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const sub = useMutation({
    mutationFn: (msg: InterviewMessage) =>
      answerFn({ data: { sessionId, messageId: msg.id, answer } }),
    onSuccess: () => {
      setAnswer("");
      qc.invalidateQueries({ queryKey: ["interview-session", sessionId] });
      qc.invalidateQueries({ queryKey: ["interview-sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data]);

  if (isLoading || !data) {
    return (
      <AppShell>
        <Skeleton className="h-96" />
      </AppShell>
    );
  }

  const { session, messages } = data;
  const pending = messages.find((m) => !m.answer);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link to="/interview-prep" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> All sessions
        </Link>

        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{session.role_title}</h1>
              <p className="text-sm text-muted-foreground">{session.company_name ?? "Generic"}</p>
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary" className="capitalize">{session.mode}</Badge>
                <Badge variant="outline" className="capitalize">{session.difficulty}</Badge>
              </div>
            </div>
            {session.overall_score != null && (
              <div className="text-right">
                <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                  <Trophy className="h-5 w-5" /> {session.overall_score}
                </div>
                <p className="text-xs text-muted-foreground">Final score</p>
              </div>
            )}
          </div>
          {session.summary && (
            <p className="mt-4 rounded-md bg-muted/50 p-3 text-sm">{session.summary}</p>
          )}
        </Card>

        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className="space-y-3">
              <Card className="bg-primary/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Q{m.turn_index + 1} · Interviewer
                </p>
                <p className="mt-2 text-sm">{m.question}</p>
              </Card>

              {m.answer && (
                <Card className="ml-6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your answer</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{m.answer}</p>
                  {m.feedback && (
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                          <Sparkles className="h-3 w-3" /> AI feedback
                        </span>
                        <span className="text-lg font-bold text-primary">{m.score}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {(["situation", "task", "action", "result"] as const).map((k) => (
                          <div key={k}>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</p>
                            <Progress value={m.feedback?.star?.[k] ?? 0} className="mt-1 h-1.5" />
                          </div>
                        ))}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold text-emerald-600">Strengths</p>
                          <ul className="mt-1 space-y-1 text-xs">
                            {(m.feedback.strengths ?? []).map((s, i) => <li key={i}>• {s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-600">Improve</p>
                          <ul className="mt-1 space-y-1 text-xs">
                            {(m.feedback.improvements ?? []).map((s, i) => <li key={i}>• {s}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {pending && (
          <Card className="sticky bottom-4 p-4 shadow-lg">
            <Textarea
              rows={4}
              placeholder="Type your answer. Use STAR: Situation, Task, Action, Result…"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={sub.isPending}
            />
            <div className="mt-2 flex justify-end">
              <Button
                onClick={() => sub.mutate(pending)}
                disabled={sub.isPending || !answer.trim()}
                className="gap-2"
              >
                <Send className="h-4 w-4" /> {sub.isPending ? "Scoring…" : "Submit answer"}
              </Button>
            </div>
          </Card>
        )}

        {!pending && session.overall_score != null && (
          <Card className="p-5 text-center">
            <Trophy className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 font-semibold">Session complete</p>
            <Link to="/interview-prep" className="text-sm text-primary hover:underline">Start another →</Link>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
