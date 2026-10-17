'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CareerWorkspaceData } from '@/lib/career-workspace';
import { record } from '@/lib/career-intelligence';
import { PageHeader } from '@/components/ui/PageHeader';

const tabs = [
  'capture',
  'network',
  'stories',
  'insights',
  'history',
  'connections',
] as const;
type Tab = (typeof tabs)[number];
const field =
  'mt-1 block w-full rounded-md border border-border bg-background p-2 text-sm text-foreground';
const button =
  'rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50';
export function CareerWorkspaceClient({
  data,
  initialTab,
  connectionResult,
}: {
  data: CareerWorkspaceData;
  initialTab?: string;
  connectionResult?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(
    tabs.includes(initialTab as Tab) ? (initialTab as Tab) : 'capture',
  );
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const [capture, setCapture] = useState({
    url: '',
    title: '',
    company: '',
    description: '',
    country: '',
  });
  const [consent, setConsent] = useState(false),
    [sourceCvId, setSourceCvId] = useState(data.cvs[0]?.id ?? '');
  const [reviewApps, setReviewApps] = useState<Record<string, string>>({});
  useEffect(() => {
    const readCapture = () => {
      const hash = new URLSearchParams(window.location.hash.slice(1)).get(
        'capture',
      );
      if (!hash) return;
      try {
        const payload = record(
          JSON.parse(
            new TextDecoder().decode(
              Uint8Array.from(atob(hash), (c) => c.charCodeAt(0)),
            ),
          ),
        );
        setCapture({
          url:
            typeof payload.url === 'string' ? payload.url.slice(0, 2048) : '',
          title:
            typeof payload.title === 'string'
              ? payload.title.slice(0, 300)
              : '',
          company:
            typeof payload.company === 'string'
              ? payload.company.slice(0, 300)
              : '',
          description:
            typeof payload.description === 'string'
              ? payload.description.slice(0, 50_000)
              : '',
          country:
            typeof payload.country === 'string'
              ? payload.country.slice(0, 100)
              : '',
        });
        setTab('capture');
      } catch {
        setError('Unable to read captured job. Paste the details below.');
      }
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search,
      );
    };
    const timer = window.setTimeout(readCapture, 0);
    window.addEventListener('hashchange', readCapture);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('hashchange', readCapture);
    };
  }, []);
  const send = useCallback(
    async (url: string, body: unknown, method = 'POST') => {
      setBusy(true);
      setError('');
      setMessage('');
      try {
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method === 'DELETE' ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(90_000),
        });
        const result = record(await response.json());
        if (!response.ok)
          throw new Error(
            typeof result.error === 'string' ? result.error : 'Request failed',
          );
        router.refresh();
        return result;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : 'Unable to save. Try again.',
        );
        return null;
      } finally {
        setBusy(false);
      }
    },
    [router],
  );
  const submit = async (
    event: React.FormEvent<HTMLFormElement>,
    action: string,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    const result = await send('/api/career', {
      ...values,
      action,
      verified: values.verified === 'on',
    });
    if (result) {
      setMessage('Saved.');
      form.reset();
    }
  };
  const source = data.cvs.find((cv) => cv.id === sourceCvId);
  const comparisons = useMemo(
    () =>
      data.history.map((entry, index) => {
        const prior = entry.jobFingerprint
          ? data.history
              .slice(index + 1)
              .find((old) => old.jobFingerprint === entry.jobFingerprint)
          : undefined;
        return {
          ...entry,
          prior,
          delta:
            prior?.score != null && entry.score != null
              ? Math.round((entry.score - prior.score) * 10) / 10
              : null,
        };
      }),
    [data.history],
  );
  return (
    <div className="app-page">
      <PageHeader
        title="Career workspace"
        subtitle="Capture opportunities, keep evidence, and review your progress."
      />
      <nav
        aria-label="Career workspace sections"
        className="mb-6 flex flex-wrap gap-2"
      >
        {tabs.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-2 text-sm capitalize ${tab === value ? 'bg-primary text-primary-foreground' : 'border border-border bg-card'}`}
          >
            {value}
          </button>
        ))}
      </nav>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-risk p-3 text-sm text-risk"
        >
          {error}
        </p>
      )}
      <p role="status" className="mb-3 text-sm text-muted-foreground">
        {busy ? 'Working…' : message}
      </p>
      {data.notifications.length > 0 && (
        <p className="mb-4 rounded-md border border-border p-3 text-sm">
          {data.notifications.length} durable follow-up reminder
          {data.notifications.length === 1 ? '' : 's'} recorded.{' '}
          <Link href="/dashboard" className="text-primary underline">
            Review due actions
          </Link>
          .
        </p>
      )}
      {tab === 'capture' && (
        <section>
          <h2 className="text-lg font-semibold">Capture a job</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste the job details or use the browser capture extension. Review
            the source before saving. Captured jobs stay private.
          </p>
          <form
            className="mt-4 grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await send('/api/career', {
                action: 'capture',
                ...capture,
              });
              if (result)
                setMessage(
                  result.duplicate
                    ? 'This job is already captured.'
                    : 'Captured. Move it to Applied in its workspace after you submit your application.',
                );
            }}
          >
            {(['url', 'title', 'company', 'country'] as const).map((key) => (
              <label key={key} className="text-sm capitalize">
                {key === 'url' ? 'Source URL' : key}
                <input
                  className={field}
                  required={key !== 'country'}
                  type={key === 'url' ? 'url' : 'text'}
                  maxLength={key === 'url' ? 2048 : 300}
                  value={capture[key]}
                  onChange={(e) =>
                    setCapture({ ...capture, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label className="text-sm md:col-span-2">
              Job description
              <textarea
                className={field}
                rows={7}
                required
                maxLength={50_000}
                value={capture.description}
                onChange={(e) =>
                  setCapture({ ...capture, description: e.target.value })
                }
              />
            </label>
            <button disabled={busy} className={button}>
              Save captured job
            </button>
          </form>
          <ul className="mt-5 space-y-3">
            {data.captured.map((job) => (
              <li
                key={job.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <strong>{job.title}</strong>
                <p className="text-sm text-muted-foreground">
                  {job.company} · {job.country || 'Country not recorded'}
                </p>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mr-4 text-sm text-primary underline"
                >
                  Original posting
                </a>
                <Link
                  className="text-sm text-primary underline"
                  href={`/applications/${data.applications.find((a) => a.jobId === job.jobId)?.id ?? ''}`}
                >
                  Open application workspace
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === 'network' && (
        <section>
          <h2 className="text-lg font-semibold">Networking contacts</h2>
          <form
            className="mt-4 grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2"
            onSubmit={(e) => void submit(e, 'contact')}
          >
            {['name', 'email', 'company', 'notes', 'nextContactAt'].map(
              (key) => (
                <label key={key} className="text-sm">
                  {key === 'nextContactAt' ? 'Next contact date (UTC)' : key}
                  <input
                    name={key}
                    className={field}
                    type={
                      key === 'email'
                        ? 'email'
                        : key === 'nextContactAt'
                          ? 'date'
                          : 'text'
                    }
                    required={key === 'name'}
                    maxLength={2000}
                  />
                </label>
              ),
            )}
            <label className="text-sm">
              Related application
              <select name="applicationId" className={field}>
                <option value="">None</option>
                {data.applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    {data.captured.find((job) => job.jobId === app.jobId)
                      ?.title ?? app.id}
                  </option>
                ))}
              </select>
            </label>
            <button disabled={busy} className={button}>
              Save contact
            </button>
          </form>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {data.contacts.map((contact) => (
              <li
                key={contact.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <strong>{contact.name}</strong>
                <p>{contact.company}</p>
                <p className="text-sm">{contact.email}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {contact.notes}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Next contact:{' '}
                  {contact.nextContactAt?.slice(0, 10) || 'Not scheduled'}
                </p>
                <button
                  disabled={busy || !contact.nextContactAt}
                  onClick={() =>
                    void send('/api/career', {
                      action: 'contact-complete',
                      id: contact.id,
                    })
                  }
                  className="mr-4 mt-2 text-sm text-primary underline disabled:opacity-50"
                >
                  Mark contacted
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void send('/api/career', {
                      action: 'delete-contact',
                      id: contact.id,
                    })
                  }
                  className="mt-2 text-sm text-primary underline"
                >
                  Remove contact
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === 'stories' && (
        <section>
          <h2 className="text-lg font-semibold">
            Source-backed interview stories
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Quote a real CV achievement. You confirm accuracy; this does not
            imply third-party verification. Stories are available in interview
            preparation.
          </p>
          <form
            className="mt-4 grid gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-2"
            onSubmit={(e) => void submit(e, 'story')}
          >
            <label className="text-sm">
              Source CV
              <select
                name="sourceCvId"
                className={field}
                value={sourceCvId}
                onChange={(e) => setSourceCvId(e.target.value)}
                required
              >
                <option value="">Select a CV</option>
                {data.cvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Title
              <input name="title" className={field} required maxLength={300} />
            </label>
            <details className="md:col-span-2">
              <summary className="cursor-pointer text-sm text-primary">
                Read source CV text
              </summary>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-md border border-border p-3 text-xs">
                {source?.text ||
                  'No parsed text available. Upload a CV with readable text.'}
              </pre>
            </details>
            {[
              'sourceExcerpt',
              'situation',
              'task',
              'storyAction',
              'result',
            ].map((key) => (
              <label key={key} className="text-sm">
                {key === 'sourceExcerpt'
                  ? 'Exact source excerpt (at least 20 characters)'
                  : key === 'storyAction'
                    ? 'Action'
                    : key}
                <textarea
                  name={key}
                  required
                  maxLength={3000}
                  rows={3}
                  className={field}
                />
              </label>
            ))}
            <label className="text-sm">
              <input type="checkbox" name="verified" required /> I checked this
              story against my source and confirm it is accurate.
            </label>
            <button disabled={busy || !source?.text} className={button}>
              Save verified story
            </button>
          </form>
          <ul className="mt-5 space-y-3">
            {data.stories.map((story) => (
              <li
                key={story.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <h3 className="font-semibold">{story.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {story.candidateVerifiedAt
                    ? 'Candidate reviewed with source evidence'
                    : 'Legacy story — source verification not recorded'}
                </p>
                {[
                  ['Situation', story.situation],
                  ['Task', story.task],
                  ['Action', story.action],
                  ['Result', story.result],
                ].map(([label, value]) => (
                  <p key={label} className="mt-2 text-sm">
                    <strong>{label}: </strong>
                    {value}
                  </p>
                ))}
                {story.sourceExcerpt && (
                  <blockquote className="mt-3 border-l-2 border-primary pl-3 text-sm">
                    {story.sourceExcerpt}
                  </blockquote>
                )}
                <button
                  disabled={busy}
                  onClick={() =>
                    void send('/api/career', {
                      action: 'delete-story',
                      id: story.id,
                    })
                  }
                  className="mt-3 text-sm text-primary underline"
                >
                  Remove story
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === 'insights' && (
        <section>
          <h2 className="text-lg font-semibold">Application outcome cohorts</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Counts use immutable submission data and recorded stage history.
            Historical submissions without snapshots stay Unknown. These
            comparisons do not establish causation.
          </p>
          {(['source', 'country', 'cv'] as const).map((dimension) => (
            <div
              key={dimension}
              className="mt-5 overflow-x-auto rounded-lg border border-border bg-card"
            >
              <table className="w-full text-left text-sm">
                <caption className="p-3 text-left font-semibold capitalize">
                  By {dimension === 'cv' ? 'submitted CV version' : dimension}
                </caption>
                <thead>
                  <tr>
                    <th className="p-3">Cohort</th>
                    <th className="p-3">Submitted</th>
                    <th className="p-3">Interview / offer</th>
                    <th className="p-3">Open</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cohorts[dimension].map((group) => (
                    <tr key={group.label} className="border-t border-border">
                      <th className="max-w-xs break-all p-3 font-normal">
                        {group.label}
                      </th>
                      <td className="p-3">{group.total}</td>
                      <td className="p-3">{group.interviews}</td>
                      <td className="p-3">{group.pending}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <h3 className="mt-6 font-semibold">Observed score calibration</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Only closed applications at least 14 days old are included. Rates
            require 30 observations per score band. Intervals show 95% Wilson
            uncertainty. This describes your recorded outcomes, not your
            probability for a new job.
          </p>
          <ul className="mt-3 space-y-2">
            {data.calibration.map((band) => (
              <li
                key={band.band}
                className="rounded-md border border-border p-3 text-sm"
              >
                Score {band.band}: {band.sample} observations ·{' '}
                {band.rate === null
                  ? 'Insufficient data'
                  : `${band.rate}% interviewed; interval ${band.interval?.join('–')}%`}
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab === 'history' && (
        <section>
          <h2 className="text-lg font-semibold">Score history and changes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Latest 50 recorded analyses. Changes compare the same source job
            text. CV or scoring-version differences are shown separately; a
            score change does not prove improved interview odds.
          </p>
          <ul className="mt-4 space-y-3">
            {comparisons.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <h3 className="font-semibold">{entry.title || 'Pasted job'}</h3>
                <p className="text-sm">
                  {entry.score ?? 'Unknown'}/100 ·{' '}
                  {entry.createdAt.slice(0, 10)} · {entry.version}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  CV:{' '}
                  {entry.cvFingerprint
                    ? entry.cvFingerprint.slice(0, 12)
                    : 'Unknown'}
                </p>
                {entry.prior && (
                  <p className="mt-2 text-sm">
                    Change since previous analysis of this job:{' '}
                    {entry.delta ?? 'Unknown'} points.{' '}
                    {!entry.cvFingerprint || !entry.prior.cvFingerprint
                      ? 'CV change is unknown.'
                      : entry.cvFingerprint !== entry.prior.cvFingerprint
                        ? 'CV content changed.'
                        : 'CV content fingerprint unchanged.'}{' '}
                    {entry.version !== entry.prior.version
                      ? 'Scoring version changed.'
                      : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {comparisons.length === 0 && (
            <p className="mt-4 text-sm">
              No analyses recorded.{' '}
              <Link href="/jd-match-tool" className="text-primary underline">
                Analyze a job description
              </Link>
              .
            </p>
          )}
        </section>
      )}
      {tab === 'connections' && (
        <section>
          <h2 className="text-lg font-semibold">
            Inbox and calendar connections
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Google access is read-only. Inbox sync reads up to 25 career-related
            messages from the last 30 days; calendar sync reads up to 50
            primary-calendar events for the next 30 days. Titles and short
            excerpts are stored for your review. No emails are sent and no
            calendar events are changed.
          </p>
          {connectionResult && (
            <p role="status" className="mt-3 text-sm">
              Connection result: {connectionResult}
            </p>
          )}
          {!data.googleConfigured && (
            <p className="mt-3 rounded-md border border-border p-3 text-sm">
              Google connections need server OAuth configuration before an
              account can be connected.
            </p>
          )}
          <label className="mt-4 block text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />{' '}
            I consent to importing these records for application review. I can
            disconnect and delete the imported records at any time.
          </label>
          <div className="mt-3 flex flex-wrap gap-3">
            {(['inbox', 'calendar'] as const).map((kind) => (
              <button
                key={kind}
                disabled={busy || !consent || !data.googleConfigured}
                className={button}
                onClick={async () => {
                  const result = await send('/api/connections/google/start', {
                    kind,
                    consent,
                  });
                  if (typeof result?.url === 'string')
                    window.location.assign(result.url);
                }}
              >
                Connect Google {kind}
              </button>
            ))}
          </div>
          <ul className="mt-5 space-y-3">
            {data.connections.map((connection) => (
              <li
                key={connection.id}
                className="rounded-lg border border-border bg-card p-4"
              >
                <strong className="capitalize">Google {connection.kind}</strong>
                <p className="text-xs text-muted-foreground">
                  Last sync: {connection.lastSyncedAt || 'Never'}
                </p>
                <div className="mt-3 flex gap-4">
                  <button
                    disabled={busy}
                    className="text-sm text-primary underline"
                    onClick={async () => {
                      const result = await send(
                        `/api/connections/${connection.id}`,
                        {},
                      );
                      if (result)
                        setMessage(
                          `${result.imported} new, ${result.updated} updated, ${result.cancelled} cancelled. ${result.coverage}${result.truncated ? ' Additional results exist beyond this bounded sync.' : ''}`,
                        );
                    }}
                  >
                    Sync now
                  </button>
                  <button
                    disabled={busy}
                    className="text-sm text-primary underline"
                    onClick={async () => {
                      const result = await send(
                        `/api/connections/${connection.id}`,
                        {},
                        'DELETE',
                      );
                      if (result)
                        setMessage(
                          result.providerRevoked
                            ? 'Disconnected and provider access revoked.'
                            : 'Disconnected locally. If provider revocation was unavailable, remove access in your Google account settings.',
                        );
                    }}
                  >
                    Disconnect and delete imports
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 font-semibold">Review imported records</h3>
          <ul className="mt-3 space-y-3">
            {data.items
              .filter((item) => !item.reviewedAt)
              .map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm">{item.excerpt}</p>
                  {item.startsAt && (
                    <p className="mt-1 text-sm">
                      {item.allDay
                        ? 'All-day event (time unspecified):'
                        : 'Event starts:'}{' '}
                      {item.allDay ? item.startsAt.slice(0, 10) : item.startsAt}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Suggested stage:{' '}
                    {item.proposedStatus || 'None — review manually'}.
                    Suggestions can be wrong.
                  </p>
                  {item.proposedStatus && (
                    <label className="mt-3 block text-sm">
                      Application
                      <select
                        className={field}
                        value={reviewApps[item.id] ?? ''}
                        onChange={(e) =>
                          setReviewApps({
                            ...reviewApps,
                            [item.id]: e.target.value,
                          })
                        }
                      >
                        <option value="">Select application</option>
                        {data.applications.map((app) => (
                          <option key={app.id} value={app.id}>
                            {data.captured.find(
                              (job) => job.jobId === app.jobId,
                            )?.title ?? app.id}{' '}
                            — {app.status}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="mt-3 flex gap-4">
                    {item.proposedStatus && (
                      <button
                        disabled={busy || !reviewApps[item.id]}
                        className="text-sm text-primary underline"
                        onClick={() =>
                          void send('/api/connections/review', {
                            id: item.id,
                            expectedUpdatedAt: item.updatedAt,
                            applicationId: reviewApps[item.id],
                          })
                        }
                      >
                        Approve stage suggestion
                      </button>
                    )}
                    <button
                      disabled={busy}
                      className="text-sm text-primary underline"
                      onClick={() =>
                        void send('/api/connections/review', {
                          id: item.id,
                          expectedUpdatedAt: item.updatedAt,
                          dismiss: true,
                        })
                      }
                    >
                      Dismiss item
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
