import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InterviewSession = {
  id: string;
  role_title: string;
  company_name: string | null;
  mode: string;
  difficulty: string;
  overall_score: number | null;
  summary: string | null;
  job_id: string | null;
  application_id: string | null;
  created_at: string;
  updated_at: string;
};

export type InterviewMessage = {
  id: string;
  session_id: string;
  turn_index: number;
  question: string;
  answer: string | null;
  feedback: { strengths: string[]; improvements: string[]; star: { situation: number; task: number; action: number; result: number } } | null;
  score: number | null;
  created_at: string;
};

const StartInput = z.object({
  roleTitle: z.string().min(1),
  companyName: z.string().optional(),
  mode: z.enum(["behavioral", "technical", "company"]).default("behavioral"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  applicationId: z.string().uuid().optional(),
  jobId: z.string().uuid().optional(),
});

export const startInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StartInput.parse(input))
  .handler(async ({ data, context }): Promise<{ session: InterviewSession; firstMessage: InterviewMessage }> => {
    const { supabase, userId } = context;
    const { callGatewayJSON } = await import("./ai-gateway.server");

    const ai = await callGatewayJSON<{ question: string }>({
      messages: [
        {
          role: "system",
          content:
            "You are a senior interviewer. Generate the first interview question. Output STRICT JSON: {\"question\": string}.",
        },
        {
          role: "user",
          content: `Role: ${data.roleTitle}${data.companyName ? ` at ${data.companyName}` : ""}\nMode: ${data.mode}\nDifficulty: ${data.difficulty}\n\nAsk ONE strong opener question appropriate for this mode.`,
        },
      ],
      temperature: 0.7,
    });

    const { data: session, error } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: userId,
        role_title: data.roleTitle,
        company_name: data.companyName ?? null,
        mode: data.mode,
        difficulty: data.difficulty,
        application_id: data.applicationId ?? null,
        job_id: data.jobId ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;

    const { data: msg, error: mErr } = await supabase
      .from("interview_messages")
      .insert({
        session_id: session.id,
        user_id: userId,
        turn_index: 0,
        question: ai.question,
      })
      .select("*")
      .single();
    if (mErr) throw mErr;

    return { session: session as InterviewSession, firstMessage: msg as unknown as InterviewMessage };
  });

const AnswerInput = z.object({
  sessionId: z.string().uuid(),
  messageId: z.string().uuid(),
  answer: z.string().min(1),
});

export const submitAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnswerInput.parse(input))
  .handler(async ({ data, context }): Promise<{ scored: InterviewMessage; next: InterviewMessage | null; done: boolean }> => {
    const { supabase, userId } = context;
    const { callGatewayJSON } = await import("./ai-gateway.server");

    const { data: session } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .single();
    if (!session) throw new Error("Session not found");

    const { data: existing } = await supabase
      .from("interview_messages")
      .select("*")
      .eq("session_id", data.sessionId)
      .eq("user_id", userId)
      .order("turn_index", { ascending: true });
    const turns = existing ?? [];

    const current = turns.find((t) => t.id === data.messageId);
    if (!current) throw new Error("Message not found");

    // Score answer
    const scoring = await callGatewayJSON<{
      score: number;
      strengths: string[];
      improvements: string[];
      star: { situation: number; task: number; action: number; result: number };
    }>({
      messages: [
        {
          role: "system",
          content:
            "You are an interview coach. Score the candidate's answer using STAR (Situation, Task, Action, Result) plus clarity and specificity. Output STRICT JSON: {\"score\": 0-100, \"strengths\": string[2-4], \"improvements\": string[2-4], \"star\": {\"situation\":0-100,\"task\":0-100,\"action\":0-100,\"result\":0-100}}.",
        },
        {
          role: "user",
          content: `Role: ${session.role_title}\nMode: ${session.mode}\nQUESTION: ${current.question}\nANSWER: ${data.answer}`,
        },
      ],
    });

    await supabase
      .from("interview_messages")
      .update({
        answer: data.answer,
        score: scoring.score,
        feedback: scoring as never,
      })
      .eq("id", data.messageId)
      .eq("user_id", userId);

    const { data: scored } = await supabase
      .from("interview_messages")
      .select("*")
      .eq("id", data.messageId)
      .single();

    const TOTAL_TURNS = 5;
    const nextIndex = current.turn_index + 1;
    if (nextIndex >= TOTAL_TURNS) {
      // Compute overall and summary
      const scores = [...turns.filter((t) => t.id !== data.messageId).map((t) => t.score ?? 0), scoring.score].filter((n) => n > 0);
      const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : scoring.score;
      const summary = await callGatewayJSON<{ summary: string }>({
        messages: [
          { role: "system", content: "Summarize this interview in 2-3 sentences. Honest, actionable. JSON: {\"summary\": string}." },
          {
            role: "user",
            content: `Role: ${session.role_title}\nTurns: ${turns.length + 1}\nScores: ${scores.join(", ")}`,
          },
        ],
      }).catch(() => ({ summary: "Session complete." }));
      await supabase
        .from("interview_sessions")
        .update({ overall_score: overall, summary: summary.summary })
        .eq("id", data.sessionId)
        .eq("user_id", userId);
      return { scored: scored as unknown as InterviewMessage, next: null, done: true };
    }

    // Generate next question
    const askedSoFar = [...turns.map((t) => t.question), current.question].join("\n- ");
    const nextQ = await callGatewayJSON<{ question: string }>({
      messages: [
        {
          role: "system",
          content:
            "You are a senior interviewer. Continue the interview. Avoid repeating themes. Output STRICT JSON: {\"question\": string}.",
        },
        {
          role: "user",
          content: `Role: ${session.role_title}\nMode: ${session.mode}\nDifficulty: ${session.difficulty}\nQuestions asked:\n- ${askedSoFar}\n\nAsk the NEXT question.`,
        },
      ],
      temperature: 0.7,
    });

    const { data: next, error: nErr } = await supabase
      .from("interview_messages")
      .insert({
        session_id: data.sessionId,
        user_id: userId,
        turn_index: nextIndex,
        question: nextQ.question,
      })
      .select("*")
      .single();
    if (nErr) throw nErr;

    return {
      scored: scored as unknown as InterviewMessage,
      next: next as unknown as InterviewMessage,
      done: false,
    };
  });

export const listInterviewSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InterviewSession[]> => {
    const { data, error } = await context.supabase
      .from("interview_sessions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []) as InterviewSession[];
  });

const GetInput = z.object({ sessionId: z.string().uuid() });
export const getInterviewSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GetInput.parse(input))
  .handler(async ({ data, context }): Promise<{ session: InterviewSession; messages: InterviewMessage[] }> => {
    const { supabase, userId } = context;
    const { data: session, error: sErr } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .single();
    if (sErr || !session) throw new Error("Session not found");
    const { data: messages, error: mErr } = await supabase
      .from("interview_messages")
      .select("*")
      .eq("session_id", data.sessionId)
      .eq("user_id", userId)
      .order("turn_index", { ascending: true });
    if (mErr) throw mErr;
    return {
      session: session as InterviewSession,
      messages: (messages ?? []) as unknown as InterviewMessage[],
    };
  });
