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
import { Activity, ArrowRight, CheckCircle2, Heart, Send, Target, TrendingUp, Upload } from 'lucide-react';

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
    <div className="app-page">
      <PageHeader
        title={`${greeting}, ${firstName}. Your job search signal is improving.`}
        subtitle="Build your CV. Match any job. Know your interview signal."
        actions={
          <>
            <Link href="/cv" className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted">
              Upload CV
            </Link>
            <Link href="/jd-match-tool" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
              Match a JD <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
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
        <div className="mt-6 panel-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">Priority queue</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Today&apos;s next best actions</h2>
            </div>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {actions.length} recommended
            </span>
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {actions.map((a, i) => (
              <li key={a} className="flex items-start gap-3 rounded-md border border-border bg-card p-3 text-sm text-foreground">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{i + 1}</span>
                <span className="leading-6">{a}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-8">
        <ProbabilityMap entries={probabilityMap} onboardingComplete={candidate.onboardingComplete ?? false} />
      </div>

      {candidate.careerGoal && (
        <div className="mt-6 panel-surface p-5">
          <p className="eyebrow">North star</p>
          <h2 className="mt-1 font-semibold text-foreground">Career goal</h2>
          <p className="mt-2 text-sm text-muted-foreground">{candidate.careerGoal}</p>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel-surface p-5">
          <p className="eyebrow">CV quality</p>
          <h2 className="mt-1 font-semibold">Improvement areas</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {['Make AI product ownership more visible', 'Clarify visa and relocation preferences', 'Add stronger business impact metrics'].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link href="/resume-score" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Full CV Score <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="panel-surface p-5">
          <p className="eyebrow">Operating rhythm</p>
          <h2 className="mt-1 font-semibold">Progress timeline</h2>
          <ul className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              ['Week 1', 'Fix CV'],
              ['Week 2', 'Apply to high-match jobs'],
              ['Week 3', 'Recruiter outreach'],
              ['Week 4', 'Interview prep'],
            ].map(([week, item]) => (
              <li key={week} className="rounded-md border border-border bg-card p-3">
                <strong className="block text-foreground">{week}</strong>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {topMatches.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="eyebrow">Opportunity feed</p>
              <h2 className="mt-1 text-lg font-semibold">High-fit jobs</h2>
            </div>
            <Link href="/recommended" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {topMatches.map((m) => m.job ? <JobCard key={m.job.id} job={{ ...m.job, match_score: m.interview_signal ?? m.final_score }} showMatch /> : null)}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mt-8 panel-surface p-5">
          <p className="eyebrow">Profile graph</p>
          <h2 className="mt-1 font-semibold">Skills in profile</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {skills.slice(0, 12).map((s) => (
              <span key={s.id} className="rounded-md border border-border bg-muted px-3 py-1 text-sm font-medium">{s.skillName}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
