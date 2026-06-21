'use client';

import type { BulletRewrite, CvGapAnalysis, RewriteMode, RoleStyle } from '@careersignal/shared';
import { ROLE_STYLES, PLACEHOLDER_REGEX, getSignalBand } from '@careersignal/shared';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Scissors,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { usePaywall } from '@/components/ui/PaywallModal';
import { useAuthGate } from '@/components/auth/AuthGate';
import { parsePaywallError } from '@/lib/billing';

interface Props {
  candidateId: string | null;
  jobId: string;
  jobTitle?: string;
  companyName?: string;
  requiredSkills?: string[];
  cvScore?: number;
  initialGap?: CvGapAnalysis;
  standalone?: boolean;
  /** Lets the parent lift estimated post-rewrite scores into the Interview Signal card. */
  onEstimate?: (est: { jdMatch: number; ats: number; interviewSignal: number } | null) => void;
}

interface Draft {
  summary: string;
  experience: string[];
  skills: string[];
  keywords: string[];
}

const DRAFT_KEY = 'cv-builder-draft';
const SCORE_CAP = 92;
type MobileTab = 'suggestions' | 'draft' | 'ats';

function emptyDraft(): Draft {
  return { summary: '', experience: [], skills: [], keywords: [] };
}

function hasPlaceholder(text: string): boolean {
  return /\[[^\]]+\]/.test(text);
}

function renderWithPlaceholders(text: string) {
  const parts = text.split(PLACEHOLDER_REGEX);
  const tokens = text.match(PLACEHOLDER_REGEX) ?? [];
  const out: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) out.push(<span key={`t-${i}`}>{part}</span>);
    if (tokens[i]) {
      out.push(
        <span
          key={`p-${i}`}
          className="rounded bg-warning-soft px-1 font-medium text-warning-foreground"
        >
          {tokens[i]}
        </span>,
      );
    }
  });
  return out;
}

/** Mirror the in-page draft into the CV Builder localStorage key so its handoff still works. */
function syncBuilderDraft(draft: Draft) {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ summary: draft.summary, experience: draft.experience, skills: draft.skills }),
    );
  } catch {
    // localStorage unavailable — non-fatal
  }
}

export function CVGapAnalyzerPanel({
  candidateId,
  jobId,
  jobTitle,
  companyName,
  requiredSkills = [],
  cvScore,
  initialGap,
  standalone,
  onEstimate,
}: Props) {
  const { showToast } = useToast();
  const { open: openPaywall } = usePaywall();
  const authGate = useAuthGate();

  const [gap, setGap] = useState<CvGapAnalysis | null>(initialGap || null);
  const [rewrites, setRewrites] = useState<BulletRewrite[]>(initialGap?.bullet_rewrites ?? []);
  const [roleStyle, setRoleStyle] = useState<RoleStyle>(initialGap?.role_style ?? 'ai_product_manager');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Record<string, RewriteMode | null>>({});
  const [error, setError] = useState<string | null>(null);

  // Interactive draft + applied tracking
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [summaryApplied, setSummaryApplied] = useState(false);
  const [appliedBullets, setAppliedBullets] = useState<Set<string>>(new Set());
  const [editingSummary, setEditingSummary] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('suggestions');

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyAck, setApplyAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [versionName, setVersionName] = useState('');

  const isGuest = !candidateId;
  const defaultVersionName = useMemo(() => {
    const role = jobTitle || 'Optimized';
    return companyName ? `${role} — ${companyName} CV` : `${role} CV`;
  }, [jobTitle, companyName]);

  function gateGuest(reason: string): boolean {
    if (isGuest) {
      authGate.open({ reason, redirect: `/jobs/${jobId}` });
      return true;
    }
    return false;
  }

  function commitDraft(next: Draft) {
    setDraft(next);
    setDirty(true);
    syncBuilderDraft(next);
  }

  // --- Estimated post-rewrite scores (local deterministic) ---
  const estimate = useMemo(() => {
    const base = gap?.current_fit ?? 0;
    const baseAts = gap?.ats_match_score ?? 0;
    let jd = 0;
    let ats = 0;
    let recruiter = 0;
    rewrites.forEach((r) => {
      if (appliedBullets.has(r.id)) {
        jd += r.score_impact.jd_match;
        ats += r.score_impact.ats;
        recruiter += r.score_impact.recruiter_scan;
      }
    });
    // Summary + selected keywords give modest deterministic credit.
    if (summaryApplied) {
      jd += 4;
      ats += 3;
      recruiter += 3;
    }
    jd += draft.keywords.length * 2;
    ats += draft.keywords.length * 3;
    const jdMatch = Math.min(SCORE_CAP, Math.round(base + jd));
    const atsMatch = Math.min(SCORE_CAP, Math.round(baseAts + ats));
    // Interview Signal blends JD + ATS + a recruiter-scan nudge.
    const interviewSignal = Math.min(
      SCORE_CAP,
      Math.round(jdMatch * 0.6 + atsMatch * 0.3 + recruiter),
    );
    return { jdMatch, ats: atsMatch, interviewSignal };
  }, [gap, rewrites, appliedBullets, summaryApplied, draft.keywords.length]);

  const anyApplied = summaryApplied || appliedBullets.size > 0 || draft.skills.length > 0 || draft.keywords.length > 0;

  function pushEstimate(active: boolean) {
    onEstimate?.(active ? estimate : null);
  }

  // --- Analysis ---
  async function analyze() {
    if (gateGuest('Create a free account to analyze your CV against this job.')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, job_id: jobId, role_style: roleStyle }),
      });
      if (res.status === 402) {
        const pw = parsePaywallError(await res.json().catch(() => ({})));
        openPaywall({ reason: pw?.reason, feature: pw?.feature });
        return;
      }
      if (!res.ok) throw new Error('Analysis failed');
      const data: CvGapAnalysis = await res.json();
      setGap(data);
      setRewrites(data.bullet_rewrites ?? []);
    } catch {
      setError('Could not analyze CV fit. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function runBulletAction(card: BulletRewrite, mode: RewriteMode) {
    setBusy((b) => ({ ...b, [card.id]: mode }));
    try {
      const res = await fetch('/api/rewrite-bullet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullet: mode === 'regenerate' ? card.before || card.after : card.after,
          job_id: jobId,
          job_title: jobTitle,
          required_skills: gap?.missing_keywords ?? [],
          role_style: roleStyle,
          mode,
        }),
      });
      if (!res.ok) throw new Error('Rewrite failed');
      const data = await res.json();
      setRewrites((prev) =>
        prev.map((r) =>
          r.id === card.id
            ? {
                ...r,
                after: data.after ?? r.after,
                issue: data.issue || r.issue,
                keywords_added: data.keywords_added ?? r.keywords_added,
                score_impact: data.score_impact ?? r.score_impact,
                is_placeholder: data.is_placeholder ?? r.is_placeholder,
              }
            : r,
        ),
      );
    } catch {
      showToast({ title: 'Could not rewrite that bullet', description: 'Please try again.' });
    } finally {
      setBusy((b) => ({ ...b, [card.id]: null }));
    }
  }

  // --- Apply actions ---
  function applySummary() {
    if (!gap?.suggested_summary || gateGuest('Create a free account to build an optimized CV.')) return;
    commitDraft({ ...draft, summary: gap.suggested_summary });
    setSummaryApplied(true);
    pushEstimate(true);
  }

  function applyBullet(card: BulletRewrite) {
    if (gateGuest('Create a free account to build an optimized CV.')) return;
    if (draft.experience.includes(card.after)) return;
    commitDraft({ ...draft, experience: [...draft.experience, card.after] });
    setAppliedBullets((s) => new Set(s).add(card.id));
    pushEstimate(true);
  }

  function toggleSkill(skill: string) {
    if (gateGuest('Create a free account to build an optimized CV.')) return;
    const has = draft.skills.includes(skill);
    commitDraft({
      ...draft,
      skills: has ? draft.skills.filter((s) => s !== skill) : [...draft.skills, skill],
    });
    pushEstimate(true);
  }

  function toggleKeyword(kw: string) {
    if (gateGuest('Create a free account to build an optimized CV.')) return;
    const has = draft.keywords.includes(kw);
    commitDraft({
      ...draft,
      keywords: has ? draft.keywords.filter((k) => k !== kw) : [...draft.keywords, kw],
    });
    pushEstimate(true);
  }

  function confirmApplyAll() {
    if (!gap) return;
    const next: Draft = {
      summary: gap.suggested_summary || draft.summary,
      experience: Array.from(new Set([...draft.experience, ...rewrites.map((r) => r.after)])),
      skills: draft.skills,
      keywords: draft.keywords,
    };
    commitDraft(next);
    setSummaryApplied(Boolean(gap.suggested_summary));
    setAppliedBullets(new Set(rewrites.map((r) => r.id)));
    setShowApplyModal(false);
    setApplyAck(false);
    pushEstimate(true);
    showToast({ title: 'Applied to your CV draft', description: 'Review the draft, then save or export.' });
  }

  function resetDraft() {
    setDraft(emptyDraft());
    setSummaryApplied(false);
    setAppliedBullets(new Set());
    setEditingSummary(false);
    setDirty(false);
    onEstimate?.(null);
  }

  async function copyText(label: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast({ title: `${label} copied` });
    } catch {
      showToast({ title: 'Copy failed', description: 'Your browser blocked clipboard access.' });
    }
  }

  async function saveVersion() {
    if (gateGuest('Create a free account to save your optimized CV.')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/cv-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: versionName.trim() || defaultVersionName,
          target_role: jobTitle ?? null,
          cv_score: estimate.jdMatch,
          content_json: {
            summary: draft.summary,
            experience: draft.experience,
            skills: Array.from(new Set([...draft.skills, ...draft.keywords])),
          },
        }),
      });
      if (res.status === 402) {
        const pw = parsePaywallError(await res.json().catch(() => ({})));
        openPaywall({ reason: pw?.reason, feature: pw?.feature });
        return;
      }
      if (!res.ok) throw new Error('Save failed');
      setDirty(false);
      showToast({
        title: 'CV version saved',
        description: 'Find it in the CV Builder anytime.',
        action: { label: 'Open CV Builder', href: '/cv-builder' },
      });
    } catch {
      showToast({ title: 'Could not save CV version', description: 'Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  async function exportPdf() {
    if (gateGuest('Create a free account to export your optimized CV.')) return;
    setExporting(true);
    try {
      // Persist the draft first so export reflects the current optimization.
      const saveRes = await fetch('/api/cv-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: versionName.trim() || defaultVersionName,
          target_role: jobTitle ?? null,
          cv_score: estimate.jdMatch,
          content_json: {
            summary: draft.summary,
            experience: draft.experience,
            skills: Array.from(new Set([...draft.skills, ...draft.keywords])),
          },
        }),
      });
      if (saveRes.status === 402) {
        const pw = parsePaywallError(await saveRes.json().catch(() => ({})));
        openPaywall({ reason: pw?.reason, feature: pw?.feature });
        return;
      }
      const saved = saveRes.ok ? await saveRes.json().catch(() => null) : null;

      const res = await fetch('/api/export-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: saved?.version?.id }),
      });
      if (res.status === 402) {
        const pw = parsePaywallError(await res.json().catch(() => ({})));
        openPaywall({ reason: pw?.reason, feature: pw?.feature });
        return;
      }
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(versionName.trim() || defaultVersionName).replace(/[^a-z0-9]+/gi, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setDirty(false);
    } catch {
      showToast({ title: 'Could not export CV', description: 'Please try again.' });
    } finally {
      setExporting(false);
    }
  }

  // --- ATS checklist ---
  const atsItems = useMemo(() => buildAtsChecklist(draft, requiredSkills, gap), [draft, requiredSkills, gap]);
  const atsStrength = useMemo(() => {
    const pass = atsItems.filter((i) => i.status === 'pass').length;
    const ratio = atsItems.length ? pass / atsItems.length : 0;
    if (ratio >= 0.7) return 'Strong';
    if (ratio >= 0.4) return 'Moderate';
    return 'Weak';
  }, [atsItems]);

  const hasCards = rewrites.length > 0;
  const placeholderInDraft =
    hasPlaceholder(draft.summary) || draft.experience.some(hasPlaceholder);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/10 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Optimize CV for this job</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="role-style">
            Target role style
          </label>
          <select
            id="role-style"
            value={roleStyle}
            onChange={(e) => setRoleStyle(e.target.value as RoleStyle)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground"
          >
            {ROLE_STYLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {!standalone && (
            <button
              type="button"
              onClick={analyze}
              disabled={loading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : gap ? 'Re-analyze' : 'Analyze CV fit'}
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Apply role-specific improvements, update your CV draft, and re-analyze your ATS and job match
        before applying.
      </p>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {!gap && !loading && (
        <div className="mt-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {isGuest
            ? 'Create a free account and upload a CV to generate tailored optimization suggestions.'
            : 'Upload or create a CV to generate accurate optimization suggestions.'}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/cv" className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">Upload CV</a>
            <a href="/cv-builder" className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted">Create CV manually</a>
          </div>
        </div>
      )}

      {gap && (
        <>
          {/* Score row */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ScoreStat label="Current JD Match" value={Math.round(gap.current_fit)} />
            <ScoreStat
              label="Est. after rewrite"
              value={anyApplied ? estimate.jdMatch : Math.min(100, Math.round(gap.projected_fit))}
              tone="success"
            />
            <ScoreStat label="ATS keyword match" value={anyApplied ? estimate.ats : Math.round(gap.ats_match_score)} tone="primary" />
            <ScoreStat label="CV Score" value={Math.round(cvScore ?? 0)} />
            <div className="rounded-lg bg-card p-3 text-center">
              <p className="text-sm font-bold text-foreground">{getSignalBand(estimate.interviewSignal)}</p>
              <p className="text-xs text-muted-foreground">Interview Signal</p>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Estimated — not a guarantee.</p>

          {/* Primary actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {hasCards && (
              <button
                type="button"
                onClick={() => (gateGuest('Create a free account to build an optimized CV.') ? null : setShowApplyModal(true))}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Check className="h-4 w-4" /> Apply all safe suggestions
              </button>
            )}
            {dirty && (
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <RotateCcw className="h-4 w-4" /> Reset changes
              </button>
            )}
          </div>

          {/* Mobile tabs */}
          <div className="mt-4 flex gap-1 rounded-lg bg-card p-1 lg:hidden">
            {([['suggestions', 'Suggestions'], ['draft', 'CV Draft'], ['ats', 'ATS Check']] as [MobileTab, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMobileTab(key)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                    mobileTab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-5">
            {/* LEFT: suggestions */}
            <div className={`space-y-5 lg:col-span-3 ${mobileTab === 'suggestions' ? '' : 'hidden lg:block'}`}>
              {gap.truthfulness_warning && (
                <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{gap.truthfulness_warning}</span>
                </div>
              )}

              {/* Summary card */}
              {gap.suggested_summary && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">Suggested summary</h4>
                    {summaryApplied && <AppliedBadge />}
                  </div>
                  {editingSummary ? (
                    <textarea
                      value={draft.summary}
                      onChange={(e) => commitDraft({ ...draft, summary: e.target.value })}
                      rows={4}
                      className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="mt-2 rounded-lg bg-muted p-3 text-sm text-foreground">
                      {renderWithPlaceholders(summaryApplied ? draft.summary : gap.suggested_summary)}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={applySummary}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                    >
                      <Check className="h-3.5 w-3.5" /> {summaryApplied ? 'Re-apply' : 'Use this summary'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!summaryApplied) applySummary();
                        setEditingSummary((v) => !v);
                      }}
                      className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      {editingSummary ? 'Done editing' : 'Edit'}
                    </button>
                  </div>
                </div>
              )}

              {/* Bullet cards */}
              {hasCards ? (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">FAANG-style bullet rewrites</h4>
                  {rewrites.map((card) => {
                    const cardBusy = busy[card.id] ?? null;
                    const applied = appliedBullets.has(card.id);
                    return (
                      <div key={card.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          {card.before ? (
                            <div className="text-sm">
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</span>
                              <p className="mt-1 text-muted-foreground line-through decoration-muted-foreground/40">{card.before}</p>
                            </div>
                          ) : <span />}
                          {applied && <AppliedBadge />}
                        </div>
                        {card.issue && (
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-warning-foreground">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {card.issue}
                          </p>
                        )}
                        <div className="mt-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-success">Suggested rewrite</span>
                          <p className="mt-1 rounded-lg bg-success-soft/50 p-3 text-sm font-medium text-foreground">
                            {renderWithPlaceholders(card.after)}
                          </p>
                        </div>
                        {card.keywords_added.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-xs text-muted-foreground">Keywords added:</span>
                            {card.keywords_added.map((kw) => (
                              <span key={kw} className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{kw}</span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 font-medium text-success">
                            <TrendingUp className="h-3 w-3" /> JD Match +{card.score_impact.jd_match}
                          </span>
                          <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">ATS +{card.score_impact.ats}</span>
                          <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">Recruiter Scan +{card.score_impact.recruiter_scan}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => applyBullet(card)}
                            disabled={applied}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" /> {applied ? 'Added' : 'Use this bullet'}
                          </button>
                          <ActionButton label="Regenerate" icon={RefreshCw} active={cardBusy === 'regenerate'} disabled={!!cardBusy} onClick={() => runBulletAction(card, 'regenerate')} />
                          <ActionButton label="Make more senior" icon={ArrowUpRight} active={cardBusy === 'senior'} disabled={!!cardBusy} onClick={() => runBulletAction(card, 'senior')} />
                          <ActionButton label="Make more concise" icon={Scissors} active={cardBusy === 'concise'} disabled={!!cardBusy} onClick={() => runBulletAction(card, 'concise')} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <LegacyLists gap={gap} />
              )}

              {/* Skills */}
              {gap.skills_to_add?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Skills to add (if truthful)</h4>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {gap.skills_to_add.map((s) => (
                      <SelectableChip key={s} label={s} selected={draft.skills.includes(s)} onClick={() => toggleSkill(s)} tone="primary" />
                    ))}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {gap.missing_keywords?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Missing keywords</h4>
                  <p className="text-xs text-muted-foreground">Tap to add to your CV draft.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {gap.missing_keywords.map((kw) => (
                      <SelectableChip key={kw} label={kw} selected={draft.keywords.includes(kw)} onClick={() => toggleKeyword(kw)} tone="risk" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: live preview + ATS */}
            <div className={`space-y-4 lg:col-span-2 ${mobileTab === 'suggestions' ? 'hidden lg:block' : ''}`}>
              {/* Live CV draft preview */}
              <div className={`rounded-xl border border-border bg-card p-4 lg:sticky lg:top-24 ${mobileTab === 'ats' ? 'hidden lg:block' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">Optimized CV draft</h4>
                  </div>
                  {dirty && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-medium text-warning-foreground">Unsaved</span>}
                </div>
                <input
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder={defaultVersionName}
                  aria-label="CV version name"
                  className="mt-3 w-full rounded-lg border border-border px-3 py-1.5 text-sm font-medium"
                />
                <div className="mt-3 max-h-72 space-y-3 overflow-y-auto text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Summary</p>
                    {draft.summary ? (
                      <p className="mt-1 text-foreground">{renderWithPlaceholders(draft.summary)}</p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Apply a summary to add it here.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Experience</p>
                    {draft.experience.length ? (
                      <ul className="mt-1 space-y-1">
                        {draft.experience.map((b, i) => (
                          <li key={i} className="text-foreground">• {renderWithPlaceholders(b)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Apply bullet rewrites to add them here.</p>
                    )}
                  </div>
                  {(draft.skills.length > 0 || draft.keywords.length > 0) && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Skills & keywords</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {Array.from(new Set([...draft.skills, ...draft.keywords])).map((s) => (
                          <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {placeholderInDraft && (
                  <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-warning/30 bg-warning-soft p-2 text-xs text-warning-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Replace placeholder metrics like [X%] with your real numbers before exporting.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={saveVersion} disabled={saving || !anyApplied} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save as job CV
                  </button>
                  <button type="button" onClick={exportPdf} disabled={exporting || !anyApplied} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50">
                    {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export PDF
                  </button>
                  <button type="button" onClick={() => copyText('Summary', draft.summary)} disabled={!draft.summary} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50">
                    <Copy className="h-3.5 w-3.5" /> Copy summary
                  </button>
                  <button type="button" onClick={() => copyText('Bullets', draft.experience.map((b) => `• ${b}`).join('\n'))} disabled={!draft.experience.length} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50">
                    <Copy className="h-3.5 w-3.5" /> Copy bullets
                  </button>
                </div>
              </div>

              {/* ATS checklist */}
              <div className={`rounded-xl border border-border bg-card p-4 ${mobileTab === 'draft' ? 'hidden lg:block' : ''}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">ATS checklist</h4>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${atsStrength === 'Strong' ? 'bg-success-soft text-success' : atsStrength === 'Moderate' ? 'bg-warning-soft text-warning-foreground' : 'bg-risk-soft text-risk'}`}>
                    {atsStrength}
                  </span>
                </div>
                <ul className="mt-3 space-y-2">
                  {atsItems.map((item) => (
                    <li key={item.label} className="flex items-start gap-2 text-xs">
                      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${item.status === 'pass' ? 'bg-success' : item.status === 'warn' ? 'bg-warning' : 'bg-risk'}`} />
                      <div>
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-muted-foreground">{item.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Apply-all confirmation modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowApplyModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Apply suggested CV improvements?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              CareerSignal will update your draft CV with the suggested summary and bullet rewrites. Any
              placeholders like [X%] or [N users] must be replaced with your real numbers before export.
            </p>
            <label className="mt-4 flex items-start gap-2 text-sm text-foreground">
              <input type="checkbox" aria-label="I understand that I must verify all metrics and claims" checked={applyAck} onChange={(e) => setApplyAck(e.target.checked)} className="mt-0.5" />
              I understand that I must verify all metrics and claims.
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowApplyModal(false)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
              <button type="button" disabled={!applyAck} onClick={confirmApplyAll} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">Apply to draft CV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface AtsItem {
  label: string;
  detail: string;
  status: 'pass' | 'warn' | 'fail';
}

function buildAtsChecklist(draft: Draft, requiredSkills: string[], gap: CvGapAnalysis | null): AtsItem[] {
  const draftText = `${draft.summary} ${draft.experience.join(' ')} ${draft.skills.join(' ')} ${draft.keywords.join(' ')}`.toLowerCase();
  const covered = requiredSkills.filter((s) => draftText.includes(s.toLowerCase()));
  const missingKw = (gap?.missing_keywords ?? []).filter((k) => !draftText.includes(k.toLowerCase()));
  const placeholderLeft = hasPlaceholder(draft.summary) || draft.experience.some(hasPlaceholder);
  const bulletsWithMetric = draft.experience.filter((b) => /\d/.test(b) || hasPlaceholder(b)).length;

  return [
    {
      label: 'Required skills coverage',
      detail: requiredSkills.length ? `${covered.length}/${requiredSkills.length} required skills present in draft` : 'No required skills listed',
      status: requiredSkills.length === 0 ? 'warn' : covered.length === requiredSkills.length ? 'pass' : covered.length > 0 ? 'warn' : 'fail',
    },
    {
      label: 'Missing keywords reduced',
      detail: missingKw.length ? `${missingKw.length} keyword(s) still missing` : 'All flagged keywords addressed',
      status: missingKw.length === 0 ? 'pass' : missingKw.length <= 2 ? 'warn' : 'fail',
    },
    {
      label: 'Summary present',
      detail: draft.summary ? 'Role-targeted summary added' : 'No summary applied yet',
      status: draft.summary ? 'pass' : 'fail',
    },
    {
      label: 'Bullets show impact metrics',
      detail: draft.experience.length ? `${bulletsWithMetric}/${draft.experience.length} bullets include a metric` : 'No experience bullets applied',
      status: draft.experience.length === 0 ? 'fail' : bulletsWithMetric === draft.experience.length ? 'pass' : 'warn',
    },
    {
      label: 'No placeholder metrics left',
      detail: placeholderLeft ? 'Replace [bracketed] placeholders with real numbers' : 'No placeholders remaining',
      status: placeholderLeft ? 'warn' : 'pass',
    },
  ];
}

function ScoreStat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'primary' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'primary' ? 'text-primary' : 'text-foreground';
  return (
    <div className="rounded-lg bg-card p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}%</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function AppliedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-medium text-success">
      <Check className="h-3 w-3" /> Applied
    </span>
  );
}

function SelectableChip({ label, selected, onClick, tone }: { label: string; selected: boolean; onClick: () => void; tone: 'primary' | 'risk' }) {
  const base = tone === 'primary' ? 'bg-primary/10 text-primary' : 'bg-risk-soft text-risk';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${selected ? 'bg-success-soft text-success ring-1 ring-success' : base}`}
    >
      {selected && <Check className="h-3 w-3" />}
      {label}
    </button>
  );
}

function ActionButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof RefreshCw;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
    >
      {active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function LegacyLists({ gap }: { gap: CvGapAnalysis }) {
  return (
    <>
      {gap.weak_bullets?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground">Weak bullets to rewrite</h4>
          <ul className="mt-1 space-y-1">
            {gap.weak_bullets.map((b) => (
              <li key={b} className="text-sm text-muted-foreground">• {b}</li>
            ))}
          </ul>
        </div>
      )}
      {gap.suggested_bullets?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground">Suggested experience bullets</h4>
          <ul className="mt-1 space-y-1">
            {gap.suggested_bullets.map((b, i) => (
              <li key={i} className="rounded-lg bg-card p-2 text-sm text-foreground">• {b}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
