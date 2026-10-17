import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAiServiceUrl } from '@/lib/utils';
import { getSession } from '@/lib/auth/session';
import {
  getJobById,
  getCandidateRowByUserId,
  getMatchScore,
  isJobSaved,
  hasApplied,
} from '@/lib/queries';
import { JobDetailClient } from './JobDetailClient';

async function fetchOrComputeMatch(candidateId: string, jobId: string) {
  const existing = await getMatchScore(candidateId, jobId);
  if (existing) {
    const hoursSince = (Date.now() - new Date(existing.computed_at).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) return existing;
  }

  try {
    await fetch(`${getAiServiceUrl()}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, job_id: jobId }),
    });
    return await getMatchScore(candidateId, jobId);
  } catch {
    return existing;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) return { title: 'Job not found' };
  return {
    title: `${job.title} at ${job.company?.name || 'Company'}`,
    description: job.description.slice(0, 160),
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJobById(id);
  if (!job) notFound();

  const session = await getSession();
  let candidateId: string | null = null;
  let matchScore = null;
  let saved = false;
  let applied = false;

  if (session) {
    const candidate = await getCandidateRowByUserId(session.userId);
    if (candidate) {
      candidateId = candidate.id;
      matchScore = await fetchOrComputeMatch(candidate.id, id);
      saved = await isJobSaved(candidate.id, id);
      applied = await hasApplied(candidate.id, id);
    }
  }

  return (
    <JobDetailClient
      job={job}
      matchScore={matchScore}
      candidateId={candidateId}
      isSaved={saved}
      hasApplied={applied}
    />
  );
}
