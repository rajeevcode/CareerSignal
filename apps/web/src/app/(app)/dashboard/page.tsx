import Link from 'next/link';
import { redirect } from 'next/navigation';
import { parseJsonArray } from '@careersignal/db';
import { JobCard } from '@/components/JobCard';
import { ProbabilityMap } from '@/components/ProbabilityMap';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCurrentUser } from '@/lib/auth/session';
import { ensureBatchMatch } from '@/lib/matching';
import {
  getCandidateRowByUserId,
  countMatchScores,
  countApplications,
  listMatchScoresForCandidate,
  listCandidateSkills,
  getProbabilityMapByCategory,
} from '@/lib/queries';
import { Activity, Heart, Send, Target, TrendingUp, Upload } from 'lucide-react';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const candidate = await getCandidateRowByUserId(user.id);
  if (!candidate) redirect('/register');

  if (candidate.cvScore != null) {
    await ensureBatchMatch(candidate.id);
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user.full_name?.split(' ')[0] || 'there';
  const matchCount = await countMatchScores(candidate.id);
  const highProbCount = await countMatchScores(candidate.id, 70);
  const appCount = await countApplications(candidate.id);
  const cvScore = candidate.cvScore ? Math.round(candidate.cvScore) : null;
  const careerHealth = cvScore ? Math.round(cvScore * 0.6 + Math.min(highProbCount * 2, 40)) : null;
  const roles = parseJsonArray<string>(candidate.targetRoles);
  const topMatches = (await listMatchScoresForCandidate(candidate.id)).filter((m) => m.final_score >= 60).slice(0, 5);
  const skills = await listCandidateSkills(candidate.id);
  const probabilityMap = await getProbabilityMapByCategory(candidate.id);

  const actions = [
    highProbCount > 0 && `Apply to ${Math.min(highProbCount, 5)} jobs above 75% match`,
    cvScore && cvScore < 80 && 'Rewrite CV summary for AI Product Manager roles',
    appCount > 0 && 'Follow up on 4 applications with no reply',
    'Prepare STAR stories for 2 upcoming interviews',
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName}. Your job search signal is improving.`}
        subtitle="Build your CV. Match any job. Know your interview signal."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Career Health" value={careerHealth ? `${careerHealth}/100` : '—'} icon={Heart} accent="success" />
        <MetricCard label="CV Score" value={cvScore ? `${cvScore}/100` : '—'} icon={Upload} accent="primary" />
        <MetricCard label="Best Role Fit" value={roles[0] || '—'} icon={Target} accent="primary" />
        <MetricCard label="High-Match Jobs" value={highProbCount || matchCount} icon={TrendingUp} accent="success" />
        <MetricCard label="Applications" value={appCount} icon={Send} accent="neutral" />
        <MetricCard label="Follow-ups Due" value={Math.min(appCount, 4)} icon={Activity} accent="warning" />
      </div>

      {actions.length > 0 && (
        <div className="mt-8 card-surface p-5">
          <h2 className="font-semibold text-foreground">Today&apos;s next best actions</h2>
          <ol className="mt-3 space-y-2">
            {actions.map((a, i) => (
              <li key={a} className="flex gap-2 text-sm text-foreground"><span className="font-semibold text-primary">{i + 1}.</span>{a}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-8">
        <ProbabilityMap entries={probabilityMap} onboardingComplete={candidate.onboardingComplete ?? false} />
      </div>

      {candidate.careerGoal && (
        <div className="mt-8 card-surface p-5">
          <h2 className="font-semibold text-foreground">Career goal</h2>
          <p className="mt-2 text-sm text-muted-foreground">{candidate.careerGoal}</p>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="font-semibold">CV improvement areas</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Make AI product ownership more visible</li>
            <li>• Clarify visa and relocation preferences</li>
            <li>• Add stronger business impact metrics</li>
          </ul>
          <Link href="/resume-score" className="mt-4 inline-block text-sm text-primary hover:underline">Full CV Score →</Link>
        </div>
        <div className="card-surface p-5">
          <h2 className="font-semibold">Progress timeline</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><strong>Week 1:</strong> Fix CV</li>
            <li><strong>Week 2:</strong> Apply to high-match jobs</li>
            <li><strong>Week 3:</strong> Recruiter outreach</li>
            <li><strong>Week 4:</strong> Interview prep</li>
          </ul>
        </div>
      </div>

      {topMatches.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">High-fit jobs</h2>
            <Link href="/recommended" className="text-sm text-primary hover:underline">View all →</Link>
          </div>
          <div className="space-y-4">
            {topMatches.map((m) => m.job ? <JobCard key={m.job.id} job={{ ...m.job, match_score: m.interview_signal ?? m.final_score }} showMatch /> : null)}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mt-8 card-surface p-5">
          <h2 className="font-semibold">Skills in profile</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.slice(0, 12).map((s) => (
              <span key={s.id} className="rounded-full bg-surface-muted px-3 py-1 text-sm">{s.skillName}</span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
