import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getCandidateRowByUserId, listMatchScoresForCandidate } from '@/lib/queries';
import { ensureBatchMatch } from '@/lib/matching';
import { RecommendedClient } from './RecommendedClient';

export default async function RecommendedPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const candidate = await getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  await ensureBatchMatch(candidate.id);
  const matches = await listMatchScoresForCandidate(candidate.id);

  const rows = matches.filter((m) => m.job);
  const bestMatch = rows.filter((m) => m.final_score >= 70).map((m) => ({ final_score: m.final_score, job: m.job! }));
  const stretch = rows.filter((m) => m.final_score >= 50 && m.final_score < 70).map((m) => ({ final_score: m.final_score, job: m.job! }));
  const visaFriendly = rows.filter((m) => m.job!.visa_sponsorship && m.final_score >= 55).map((m) => ({ final_score: m.final_score, job: m.job! }));

  return <RecommendedClient bestMatch={bestMatch} stretch={stretch} visaFriendly={visaFriendly} />;
}
