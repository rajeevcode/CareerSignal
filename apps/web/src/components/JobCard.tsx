'use client';

import Link from 'next/link';
import type { Job } from '@careersignal/shared';
import { getProbabilityLabel } from '@careersignal/shared';
import { MapPin, Building2, Clock, Lock } from 'lucide-react';
import { JobMatchBadge } from './JobMatchBadge';
import { useAuthGate } from '@/components/auth/AuthGate';
import { formatSalary, formatDate } from '@/lib/utils';

interface Props {
  job: Job & { match_score?: number | null; missing_skills?: string[] };
  showMatch?: boolean;
  /** Guest preview: locked match, no save/improve, CTAs route to signup. */
  guestPreview?: boolean;
}

/** Shared inner content (no anchor) so the guest variant can avoid nested <a>. */
function CardBody({ job, showMatch }: { job: Props['job']; showMatch: boolean }) {
  const company = job.company;
  const score = job.match_score;
  const probLabel = score != null ? getProbabilityLabel(score) : null;
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold leading-snug text-foreground sm:text-lg">{job.title}</h3>
            {showMatch && score != null && <JobMatchBadge score={score} />}
            {showMatch && probLabel && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                score! >= 75 ? 'bg-success-soft text-success' :
                score! >= 50 ? 'bg-warning-soft text-warning-foreground' :
                'bg-muted text-muted-foreground'
              }`}>
                Interview: {probLabel}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {company.name}
                {company.verified && <span className="text-success">✓</span>}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            )}
            <span className="capitalize rounded-full bg-muted px-2 py-0.5 text-xs">{job.remote_type}</span>
            {job.visa_sponsorship && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">Visa sponsorship</span>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{job.description.slice(0, 180)}...</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(job.required_skills || []).slice(0, 4).map((skill) => (
              <span key={skill} className="rounded-md border border-border bg-accent px-2 py-1 text-xs font-medium text-accent-foreground">{skill}</span>
            ))}
          </div>
          {showMatch && job.missing_skills && job.missing_skills.length > 0 && (
            <p className="mt-2 text-xs text-warning-foreground">
              Missing: {job.missing_skills.slice(0, 3).join(', ')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(job.posted_at)}
        </span>
      </div>
    </>
  );
}

export function JobCard({ job, showMatch = false, guestPreview = false }: Props) {
  const authGate = useAuthGate();

  if (guestPreview) {
    return (
      <div className="panel-surface block p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Preview
          </span>
          {/* Locked match sample — real scores require an account. */}
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            <Lock className="h-3 w-3" /> Match locked
          </span>
        </div>

        <CardBody job={job} showMatch={false} />

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => authGate.open({ reason: 'Create a free account to see your full match for this role.', redirect: `/jobs/${job.id}` })}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover sm:w-auto"
          >
            Sign up to view full match
          </button>
          <Link
            href={`/jobs/${job.id}`}
            className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-primary hover:underline"
          >
            Preview job
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/jobs/${job.id}`} className="panel-surface block p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
      <CardBody job={job} showMatch={showMatch} />
    </Link>
  );
}
