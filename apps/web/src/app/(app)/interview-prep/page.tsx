import { redirect } from 'next/navigation';
import { eq, desc } from 'drizzle-orm';
import { getDb, starStories, interviewSessions, mapInterviewSession } from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId, listApplicationsWithJobs } from '@/lib/queries';
import { InterviewPrepClient } from './InterviewPrepClient';
import { MockInterviewPanel } from './MockInterviewPanel';

export default async function InterviewPrepPage({ searchParams }: { searchParams: Promise<{ job_id?: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  const db = getDb();
  const apps = await listApplicationsWithJobs(candidate.id);
  const jobOptions = apps.flatMap((app) => app.job ? [{ id: app.job.id, title: app.job.title, company: app.job.company?.name ?? 'Unknown company' }] : []);
  const { job_id } = await searchParams;
  const initialJobId = jobOptions.some((job) => job.id === job_id) ? job_id : undefined;

  const sessionRows = await db
    .select()
    .from(interviewSessions)
    .where(eq(interviewSessions.candidateId, candidate.id))
    .orderBy(desc(interviewSessions.createdAt));
  const sessions = sessionRows.map(mapInterviewSession);

  const stories=await db.select().from(starStories).where(eq(starStories.candidateId,candidate.id));

  return (
    <>
      <InterviewPrepClient key={initialJobId} jobs={jobOptions} initialJobId={initialJobId} />
      <section className="mt-6 panel-surface p-5"><h2 className="text-lg font-semibold">Your reusable interview evidence</h2><p className="mt-2 text-sm text-muted-foreground">Candidate-reviewed stories with source excerpts. Use these facts when preparing answers.</p><ul className="mt-3 space-y-3">{stories.filter(story=>story.candidateVerifiedAt&&story.sourceExcerpt).map(story=><li key={story.id} className="rounded-md border border-border p-3"><h3 className="font-semibold">{story.title}</h3><p className="mt-1 text-sm">Situation: {story.situation}</p><p className="text-sm">Task: {story.task}</p><p className="text-sm">Action: {story.action}</p><p className="text-sm">Result: {story.result}</p><blockquote className="mt-2 border-l-2 border-primary pl-3 text-sm">{story.sourceExcerpt}</blockquote></li>)}</ul><a href="/career?tab=stories" className="mt-3 inline-block text-sm text-primary underline">Manage source-backed stories</a></section>
      <MockInterviewPanel sessions={sessions} />
    </>
  );
}
