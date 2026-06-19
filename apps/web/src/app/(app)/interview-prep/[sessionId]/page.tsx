import { redirect, notFound } from 'next/navigation';
import { eq, and, asc } from 'drizzle-orm';
import {
  getDb,
  interviewSessions,
  interviewMessages,
  mapInterviewSession,
  mapInterviewMessage,
} from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { InterviewChatClient } from './InterviewChatClient';

export default async function InterviewSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const { sessionId } = await params;

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  const db = getDb();
  const s = (
    await db
      .select()
      .from(interviewSessions)
      .where(and(eq(interviewSessions.id, sessionId), eq(interviewSessions.candidateId, candidate.id)))
      .limit(1)
  )[0];
  if (!s) notFound();

  const messages = await db
    .select()
    .from(interviewMessages)
    .where(eq(interviewMessages.sessionId, sessionId))
    .orderBy(asc(interviewMessages.turnIndex));

  return (
    <InterviewChatClient
      sessionId={sessionId}
      session={mapInterviewSession(s)}
      initialMessages={messages.map(mapInterviewMessage)}
    />
  );
}
