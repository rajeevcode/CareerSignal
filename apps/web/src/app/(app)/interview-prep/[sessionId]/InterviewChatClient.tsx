'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { ScoreRing, ScoreBar } from '@/components/ui/ScoreRing';

interface Star {
  situation?: number;
  task?: number;
  action?: number;
  result?: number;
}
interface Feedback {
  strengths?: string[];
  improvements?: string[];
  star?: Star;
}
interface Message {
  id: string;
  turn_index: number;
  question: string;
  answer: string | null;
  feedback: Feedback | Record<string, unknown> | null;
  score: number | null;
}

function asFeedback(f: Message['feedback']): { strengths: string[]; improvements: string[]; star: Required<Star> } | null {
  if (!f || typeof f !== 'object') return null;
  const fb = f as Feedback;
  const star = fb.star ?? {};
  return {
    strengths: Array.isArray(fb.strengths) ? fb.strengths : [],
    improvements: Array.isArray(fb.improvements) ? fb.improvements : [],
    star: {
      situation: star.situation ?? 0,
      task: star.task ?? 0,
      action: star.action ?? 0,
      result: star.result ?? 0,
    },
  };
}
interface SessionInfo {
  role_title: string;
  company_name: string | null;
  mode: string;
  difficulty: string;
  overall_score: number | null;
  summary: string | null;
}

export function InterviewChatClient({
  sessionId,
  session,
  initialMessages,
}: {
  sessionId: string;
  session: SessionInfo;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [overallScore, setOverallScore] = useState<number | null>(session.overall_score);
  const [summary, setSummary] = useState<string | null>(session.summary);
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  const current = [...messages].reverse().find((m) => !m.answer) ?? null;
  const done = overallScore != null;

  async function submit() {
    if (!answer.trim() || !current) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/interview/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      const data = await res.json();
      if (!res.ok) return;

      // attach feedback+answer to the current turn
      setMessages((prev) =>
        prev.map((m) =>
          m.id === current.id ? { ...m, answer, score: data.score ?? null, feedback: data.feedback ?? null } : m,
        ),
      );
      setAnswer('');

      if (data.done) {
        setOverallScore(data.overall_score ?? 0);
        setSummary(data.summary ?? '');
      } else if (data.next_question) {
        setMessages((prev) => [
          ...prev,
          { id: `tmp-${prev.length}`, turn_index: current.turn_index + 1, question: data.next_question, answer: null, feedback: null, score: null },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link href="/interview-prep" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Interview Prep
      </Link>
      <PageHeader
        title={`Mock interview · ${session.role_title}`}
        subtitle={`${session.mode} · ${session.difficulty}${session.company_name ? ` · ${session.company_name}` : ''}`}
      />

      <div className="space-y-5">
        {messages.map((m, i) => (
          <div key={m.id} className="card-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question {i + 1}</p>
            <p className="mt-1 font-medium text-foreground">{m.question}</p>

            {m.answer && (
              <div className="mt-3 rounded-lg bg-muted p-3 text-sm text-foreground">{m.answer}</div>
            )}

            {(() => {
              const fb = asFeedback(m.feedback);
              if (!fb) return null;
              return (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    {m.score != null && (
                      <p className="text-sm font-semibold text-foreground">Answer score: <span className="text-primary">{m.score}/100</span></p>
                    )}
                    <div className="mt-2 space-y-1">
                      <ScoreBar score={fb.star.situation} label="Situation" />
                      <ScoreBar score={fb.star.task} label="Task" />
                      <ScoreBar score={fb.star.action} label="Action" />
                      <ScoreBar score={fb.star.result} label="Result" />
                    </div>
                  </div>
                  <div className="text-sm">
                    {fb.strengths.length > 0 && (
                      <>
                        <p className="font-semibold text-success">Strengths</p>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground">
                          {fb.strengths.map((s, j) => <li key={j}>• {s}</li>)}
                        </ul>
                      </>
                    )}
                    {fb.improvements.length > 0 && (
                      <>
                        <p className="mt-2 font-semibold text-warning-foreground">Improve</p>
                        <ul className="mt-1 space-y-0.5 text-muted-foreground">
                          {fb.improvements.map((s, j) => <li key={j}>• {s}</li>)}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        ))}

        {/* Answer box for the open question */}
        {!done && current && (
          <div className="card-surface p-5">
            <label className="text-sm font-medium text-foreground">Your answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="Answer using the STAR framework: Situation, Task, Action, Result…"
              className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={submit}
              disabled={busy || !answer.trim()}
              className="btn-primary mt-3 inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit answer
            </button>
          </div>
        )}

        {/* Session summary */}
        {done && (
          <div className="card-surface flex flex-wrap items-center gap-6 p-6">
            <ScoreRing score={overallScore ?? 0} label="Readiness" size="lg" />
            <div className="min-w-48 flex-1">
              <h3 className="font-semibold text-foreground">Session complete</h3>
              {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
              <Link href="/interview-prep" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
                Start another mock interview →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
