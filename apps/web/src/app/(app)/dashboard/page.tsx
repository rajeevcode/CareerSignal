import Link from 'next/link';
import { eq, and, isNotNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { parseJsonArray, parseJsonObject, getDb, careerContacts, careerIntegrationItems } from '@careersignal/db';
import { JobCard } from '@/components/JobCard';
import { ProbabilityMap } from '@/components/ProbabilityMap';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { getCurrentUser } from '@/lib/auth/session';
import { ApplicationControls } from '@/components/applications/ApplicationControls';
import { applicationAnalytics, buildCareerActions } from '@/lib/career-actions';
import { ensureBatchMatch } from '@/lib/matching';
import {
  getCandidateRowByUserId,
  countMatchScores,
  listApplicationsWithJobs,
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

  const matching = candidate.cvScore != null ? await ensureBatchMatch(candidate.id) : 'ready';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user.full_name?.split(' ')[0] || 'there';
  const [highProbCount, apps, matches, skills, probabilityMap] = await Promise.all([
    countMatchScores(candidate.id, 70), listApplicationsWithJobs(candidate.id),
    listMatchScoresForCandidate(candidate.id), listCandidateSkills(candidate.id),
    getProbabilityMapByCategory(candidate.id),
  ]);
  const analytics = applicationAnalytics(apps);
  const cvScore = candidate.cvScore == null ? null : Math.round(candidate.cvScore);
  const roles = parseJsonArray<string>(candidate.targetRoles);
  const topMatches = matches.filter((m) => m.final_score >= 70).slice(0, 5);
  const renderTime=new Date().getTime();
  const [contacts,calendar]=await Promise.all([
    getDb().select().from(careerContacts).where(eq(careerContacts.candidateId,candidate.id)),
    getDb().select().from(careerIntegrationItems).where(and(eq(careerIntegrationItems.candidateId,candidate.id),eq(careerIntegrationItems.kind,'calendar'),isNotNull(careerIntegrationItems.reviewedAt))),
  ]);
  const actions = [...buildCareerActions(apps, cvScore).map(action=>{
    const id=action.id.replace(/^prepare-/, '');const event=calendar.find(item=>item.applicationId===id&&item.startsAt&&Date.parse(item.startsAt)>renderTime);
    return event?{...action,reason:event.allDay?`Recorded all-day calendar event: ${event.startsAt?.slice(0,10)} (time unspecified)`:`Recorded calendar event: ${event.startsAt}`} : action;
  }),...contacts.filter(contact=>contact.nextContactAt&&Date.parse(contact.nextContactAt)<=renderTime).map(contact=>({
    id:`contact-${contact.id}`,label:`Contact ${contact.name}`,reason:`Recorded networking follow-up: ${contact.nextContactAt?.slice(0,10)}`,href:'/career?tab=network',application:undefined,
  }))];
  const feedback = parseJsonObject<Record<string, unknown>>(candidate.cvFeedbackJson);
  const improvements = Array.isArray(feedback?.weak) ? feedback.weak.filter((item): item is string => typeof item === 'string') : [];

  return (
    <div className="app-page">
      <PageHeader
        title={`${greeting}, ${firstName}. Your job search at a glance.`}
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
        <MetricCard label="Employer Responses" value={analytics.responded} icon={Heart} accent="success" />
        <MetricCard label="CV Score" value={cvScore != null ? `${cvScore}/100` : '—'} icon={Upload} accent="primary" />
        <MetricCard label="Best Role Fit" value={roles[0] || '—'} icon={Target} accent="primary" />
        <MetricCard label="High-Match Jobs" value={highProbCount} icon={TrendingUp} accent="success" />
        <MetricCard label="Applications" value={analytics.total} icon={Send} accent="neutral" />
        <MetricCard label="Follow-ups Due" value={analytics.followUpsDue} icon={Activity} accent="warning" />
      </div>

      {matching === 'unavailable' && <p role="status" className="mt-4 rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
        Job matching is temporarily unavailable. Refresh to retry; your existing applications are still available.
      </p>}

      {actions.length === 0 && <p className="mt-6 panel-surface p-5 text-sm text-muted-foreground">No follow-ups or preparation tasks are due from your recorded applications. <Link href="/jobs" className="font-medium text-primary hover:underline">Explore jobs</Link></p>}
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
              <li key={a.id} className="flex items-start gap-3 rounded-md border border-border bg-card p-3 text-sm text-foreground">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={a.href} className="font-medium leading-6 text-primary hover:underline">{a.label}</Link>
                  <p className="text-xs text-muted-foreground">{a.reason}</p>
                  {a.application && <ApplicationControls application={a.application} compact />}
                </div>
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
            {improvements.slice(0, 5).map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {improvements.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No specific improvement feedback has been recorded. Open your CV report to review available results.</p>}
          <Link href="/resume-score" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            Full CV Score <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="panel-surface p-5">
          <p className="eyebrow">Operating rhythm</p>
          <h2 className="mt-1 font-semibold">Suggested weekly routine</h2>
          <p className="mt-2 text-xs text-muted-foreground">A suggested routine, not recorded progress.</p>
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
