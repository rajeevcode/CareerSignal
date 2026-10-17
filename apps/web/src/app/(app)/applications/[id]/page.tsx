import { notFound, redirect } from 'next/navigation';
import { and, eq, desc } from 'drizzle-orm';
import {
  getDb,
  applications,
  applicationSnapshots,
  applicationEvents,
  jobs,
  companies,
  mapApplication,
  mapJob,
  mapCompany,
  coverLetters,
  careerContacts,
} from '@careersignal/db';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId } from '@/lib/queries';
import { record } from '@/lib/career-intelligence';
import { ApplicationControls } from '@/components/applications/ApplicationControls';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ApplicationWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');
  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = getDb();
  const [row] = await db
    .select({ app: applications, job: jobs, company: companies })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(
      and(eq(applications.id, id), eq(applications.candidateId, candidate.id)),
    );
  if (!row) notFound();
  const [snapshots, events, letters, contacts] = await Promise.all([
    db
      .select()
      .from(applicationSnapshots)
      .where(
        and(
          eq(applicationSnapshots.applicationId, id),
          eq(applicationSnapshots.candidateId, candidate.id),
        ),
      ),
    db
      .select()
      .from(applicationEvents)
      .where(
        and(
          eq(applicationEvents.applicationId, id),
          eq(applicationEvents.candidateId, candidate.id),
        ),
      )
      .orderBy(desc(applicationEvents.createdAt)),
    db
      .select()
      .from(coverLetters)
      .where(
        and(
          eq(coverLetters.applicationId, id),
          eq(coverLetters.candidateId, candidate.id),
        ),
      ),
    db
      .select()
      .from(careerContacts)
      .where(
        and(
          eq(careerContacts.applicationId, id),
          eq(careerContacts.candidateId, candidate.id),
        ),
      ),
  ]);
  const snapshot = snapshots[0],
    snapshotJob = record(snapshot?.jobJson),
    snapshotCv = record(snapshot?.cvJson);
  return (
    <div className="app-page">
      <PageHeader
        title={
          typeof snapshotJob.title === 'string'
            ? snapshotJob.title
            : row.job.title
        }
        subtitle="Application workspace — submission evidence and recorded history"
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel-surface p-5">
          <h2 className="font-semibold">Manage application</h2>
          <ApplicationControls
            key={row.app.updatedAt}
            application={mapApplication(
              row.app,
              mapJob(row.job, mapCompany(row.company)),
              { includePrivateNotes: true },
            )}
          />
        </section>
        <section className="panel-surface p-5">
          <h2 className="font-semibold">Stage history</h2>
          <ol className="mt-3 space-y-3">
            {events.map((event) => (
              <li key={event.id} className="text-sm">
                <strong>
                  {event.fromStatus ? `${event.fromStatus} → ` : ''}
                  {event.toStatus}
                </strong>
                <p className="text-xs text-muted-foreground">
                  {event.createdAt} ·{' '}
                  {event.kind === 'baseline'
                    ? 'Baseline when history recording began; earlier stages unknown'
                    : event.kind}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="mt-5 panel-surface p-5">
        <h2 className="font-semibold">Immutable submission snapshot</h2>
        {snapshot ? (
          <>
            <p className="mt-2 text-xs text-muted-foreground">
              Captured {snapshot.createdAt} · {snapshot.scoringVersion} · CV
              fingerprint: {snapshot.cvFingerprint || 'No CV recorded'}
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">
                Submitted job description
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm">
                {typeof snapshotJob.description === 'string'
                  ? snapshotJob.description
                  : 'Unavailable'}
              </p>
            </details>
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">
                Submitted CV content
              </summary>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap text-xs">
                {typeof snapshotCv.text === 'string'
                  ? snapshotCv.text
                  : snapshot.cvJson
                    ? JSON.stringify(snapshotCv.content ?? snapshotCv, null, 2)
                    : 'No source CV was selected at submission.'}
              </pre>
            </details>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {row.app.status === 'saved'
              ? 'A snapshot will be captured when you mark this application as submitted.'
              : 'This application predates snapshot recording. Its original submitted content is unknown.'}
          </p>
        )}
      </section>
      <section className="mt-5 panel-surface p-5">
        <h2 className="font-semibold">Related contacts</h2>
        {contacts.length ? (
          contacts.map((contact) => (
            <p key={contact.id} className="mt-2 text-sm">
              {contact.name} ·{' '}
              {contact.email ||
                contact.company ||
                'No contact details recorded'}
            </p>
          ))
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No contacts linked. Add one in the Career workspace.
          </p>
        )}
      </section>
      <section className="mt-5 panel-surface p-5">
        <h2 className="font-semibold">Linked cover letters</h2>
        {letters.length ? (
          letters.map((letter) => (
            <details key={letter.id} className="mt-3">
              <summary className="cursor-pointer">
                Cover letter · {letter.createdAt.slice(0, 10)}
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm">
                {letter.content}
              </p>
            </details>
          ))
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            No cover letter has been linked to this application.
          </p>
        )}
      </section>
    </div>
  );
}
