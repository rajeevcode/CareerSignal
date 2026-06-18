'use client';

import Link from 'next/link';
import type { Job } from '@careersignal/shared';
import { getProbabilityLabel } from '@careersignal/shared';
import { MapPin, Building2, Clock } from 'lucide-react';
import { JobMatchBadge } from './JobMatchBadge';
import { formatSalary, formatDate } from '@/lib/utils';

interface Props {
  job: Job & { match_score?: number | null; missing_skills?: string[] };
  showMatch?: boolean;
}

export function JobCard({ job, showMatch = false }: Props) {
  const company = job.company;
  const score = job.match_score;
  const probLabel = score != null ? getProbabilityLabel(score) : null;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
            {showMatch && score != null && <JobMatchBadge score={score} />}
            {showMatch && probLabel && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                score! >= 75 ? 'bg-emerald-100 text-emerald-800' :
                score! >= 50 ? 'bg-amber-100 text-amber-800' :
                'bg-slate-100 text-slate-600'
              }`}>
                Interview: {probLabel}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            {company && (
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {company.name}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            )}
            <span className="capitalize rounded-full bg-slate-100 px-2 py-0.5 text-xs">{job.remote_type}</span>
            {job.visa_sponsorship && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">Visa sponsorship</span>
            )}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{job.description.slice(0, 180)}...</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(job.required_skills || []).slice(0, 4).map((skill) => (
              <span key={skill} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">{skill}</span>
            ))}
          </div>
          {showMatch && job.missing_skills && job.missing_skills.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">
              Missing: {job.missing_skills.slice(0, 3).join(', ')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDate(job.posted_at)}
        </span>
      </div>
    </Link>
  );
}
