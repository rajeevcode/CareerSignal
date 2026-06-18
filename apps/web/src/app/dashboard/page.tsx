import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/DashboardNav';
import { JobCard } from '@/components/JobCard';
import { ProbabilityMap } from '@/components/ProbabilityMap';
import { getSession, getCurrentUser } from '@/lib/auth/session';
import { ensureBatchMatch } from '@/lib/matching';
import {
  getCandidateRowByUserId,
  countMatchScores,
  countApplications,
  listMatchScoresForCandidate,
  listCandidateSkills,
  getProbabilityMapByCategory,
} from '@/lib/queries';
import { Upload, Target, Send, TrendingUp, AlertCircle } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const user = await getCurrentUser();
  const candidate = getCandidateRowByUserId(session.userId);
  if (!candidate) redirect('/register');

  if (candidate.cvScore != null) {
    await ensureBatchMatch(candidate.id);
  }

  const firstName = user?.full_name?.split(' ')[0] || 'there';
  const matchCount = countMatchScores(candidate.id);
  const highProbCount = countMatchScores(candidate.id, 70);
  const appCount = countApplications(candidate.id);
  const topMatches = listMatchScoresForCandidate(candidate.id)
    .filter((m) => m.final_score >= 60)
    .slice(0, 5);
  const skills = listCandidateSkills(candidate.id);
  const probabilityMap = getProbabilityMapByCategory(candidate.id);

  const hasCv = candidate.cvScore !== null;
  const cvScore = candidate.cvScore ? Math.round(candidate.cvScore) : null;

  const recommendedActions: string[] = [];
  if (!hasCv) recommendedActions.push('Upload your CV to unlock match scores and interview probability');
  if (highProbCount > 0) recommendedActions.push(`Apply to ${Math.min(highProbCount, 5)} jobs above 75% probability today`);
  if (hasCv && cvScore && cvScore < 80) recommendedActions.push('Rewrite CV summary for your target AI Product Manager roles');
  if (!candidate.visaStatus) recommendedActions.push('Add visa/relocation clarity to improve location fit scores');
  if (appCount > 0) recommendedActions.push('Follow up on applications with no reply after 7 days');

  const stats = [
    { label: 'High match jobs', value: matchCount, icon: Target, accent: 'text-indigo-600' },
    { label: 'Probability above 70%', value: highProbCount, icon: TrendingUp, accent: 'text-emerald-600' },
    { label: 'CV score', value: cvScore ? `${cvScore}/100` : '—', icon: Upload, accent: 'text-indigo-600' },
    { label: 'Applications sent', value: appCount, icon: Send, accent: 'text-slate-600' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6 lg:pb-8">
      <DashboardNav />

      <div className="mt-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white shadow-lg">
        <p className="text-indigo-200 text-sm">Your career dashboard</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {firstName}, you have {highProbCount || matchCount} high-signal jobs today
        </h1>
        <p className="mt-2 text-indigo-100 text-sm">
          Build your CV. Match any job. Know your interview signal.
        </p>
        <Link href="/recommended" className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
          View best jobs for you →
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Icon className={`h-5 w-5 ${accent}`} />
            <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <ProbabilityMap
          entries={probabilityMap}
          onboardingComplete={candidate.onboardingComplete ?? false}
        />
      </div>

      {recommendedActions.length > 0 && (
        <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50/80 p-5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-indigo-900">Today&apos;s best actions</h2>
          </div>
          <ol className="mt-3 space-y-2">
            {recommendedActions.map((action, i) => (
              <li key={action} className="flex gap-2 text-sm text-indigo-900">
                <span className="font-semibold text-indigo-600">{i + 1}.</span>
                {action}
              </li>
            ))}
          </ol>
        </div>
      )}

      {hasCv && cvScore && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">CV health score</h2>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{cvScore}/100</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${cvScore}%` }} />
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Upload an updated CV or use &quot;Improve my CV&quot; on high-match jobs to raise your score.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">Skills in your profile</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.slice(0, 12).map((s) => (
                <span key={s.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{s.skillName}</span>
              ))}
              {skills.length === 0 && <p className="text-sm text-slate-500">Upload CV to extract skills</p>}
            </div>
          </div>
        </div>
      )}

      {!hasCv && (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <Upload className="mx-auto h-10 w-10 text-slate-400" />
          <h3 className="mt-4 font-semibold text-slate-900">Upload your CV to unlock job intelligence</h3>
          <p className="mt-2 text-sm text-slate-600">We&apos;ll rank jobs by interview probability and show exactly what to improve.</p>
          <Link href="/cv" className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Upload CV and Get Your Score
          </Link>
        </div>
      )}

      {topMatches.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Best jobs for you</h2>
            <Link href="/recommended" className="text-sm text-indigo-600 hover:underline">View all →</Link>
          </div>
          <div className="mt-4 space-y-4">
            {topMatches.map((m) => (
              m.job ? <JobCard key={m.job.id} job={{ ...m.job, match_score: m.final_score }} showMatch /> : null
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
