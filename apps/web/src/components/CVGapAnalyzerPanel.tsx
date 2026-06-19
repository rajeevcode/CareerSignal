'use client';

import type { BulletRewrite, CvGapAnalysis, RewriteMode, RoleStyle } from '@careersignal/shared';
import { ROLE_STYLES, PLACEHOLDER_REGEX } from '@careersignal/shared';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Loader2,
  RefreshCw,
  Scissors,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ToastProvider';

interface Props {
  candidateId: string;
  jobId: string;
  jobTitle?: string;
  initialGap?: CvGapAnalysis;
  standalone?: boolean;
}

const DRAFT_KEY = 'cv-builder-draft';

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

function addBulletToDraft(bullet: string) {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    const draft = raw ? JSON.parse(raw) : { summary: '', experience: [], skills: [] };
    draft.experience = Array.isArray(draft.experience) ? draft.experience : [];
    if (!draft.experience.includes(bullet)) draft.experience.push(bullet);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage unavailable — non-fatal
  }
}

export function CVGapAnalyzerPanel({ candidateId, jobId, jobTitle, initialGap, standalone }: Props) {
  const { showToast } = useToast();
  const [gap, setGap] = useState<CvGapAnalysis | null>(initialGap || null);
  const [rewrites, setRewrites] = useState<BulletRewrite[]>(initialGap?.bullet_rewrites ?? []);
  const [roleStyle, setRoleStyle] = useState<RoleStyle>(initialGap?.role_style ?? 'ai_product_manager');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Record<string, RewriteMode | null>>({});
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: candidateId, job_id: jobId, role_style: roleStyle }),
      });
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

  function applyBullet(card: BulletRewrite) {
    addBulletToDraft(card.after);
    showToast({
      title: 'Bullet added to your CV draft',
      description: 'Open the CV Builder to refine and save it.',
      action: { label: 'Open CV Builder', href: '/cv-builder' },
    });
  }

  const hasCards = rewrites.length > 0;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/10 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Improve my CV for this job</h3>
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
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : gap ? (
                'Re-analyze'
              ) : (
                'Analyze CV fit'
              )}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {gap && (
        <div className="mt-4 space-y-5">
          {/* Score header */}
          <div className="flex flex-wrap gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{Math.round(gap.current_fit)}%</p>
              <p className="text-xs text-muted-foreground">Current JD Match</p>
            </div>
            <div className="self-center text-2xl text-muted-foreground">→</div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">
                {Math.min(100, Math.round(gap.projected_fit))}%
              </p>
              <p className="text-xs text-muted-foreground">Potential after rewrite</p>
            </div>
            {gap.ats_match_score > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {Math.min(100, Math.round(gap.ats_match_score))}%
                </p>
                <p className="text-xs text-muted-foreground">ATS keyword match</p>
              </div>
            )}
          </div>

          {/* Truthfulness warning */}
          {gap.truthfulness_warning && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{gap.truthfulness_warning}</span>
            </div>
          )}

          {/* Suggested summary */}
          {gap.suggested_summary && (
            <div>
              <h4 className="text-sm font-semibold text-foreground">Suggested summary</h4>
              <p className="mt-1 rounded-lg bg-card p-3 text-sm text-foreground">
                {renderWithPlaceholders(gap.suggested_summary)}
              </p>
            </div>
          )}

          {/* Before → after rewrite cards */}
          {hasCards ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">FAANG-style bullet rewrites</h4>
              {rewrites.map((card) => {
                const cardBusy = busy[card.id] ?? null;
                return (
                  <div key={card.id} className="rounded-xl border border-border bg-card p-4">
                    {card.before && (
                      <div className="text-sm">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Before
                        </span>
                        <p className="mt-1 text-muted-foreground line-through decoration-muted-foreground/40">
                          {card.before}
                        </p>
                      </div>
                    )}
                    {card.issue && (
                      <p className="mt-2 flex items-start gap-1.5 text-xs text-warning-foreground">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {card.issue}
                      </p>
                    )}

                    <div className="mt-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-success">
                        Suggested rewrite
                      </span>
                      <p className="mt-1 rounded-lg bg-success-soft/50 p-3 text-sm font-medium text-foreground">
                        {renderWithPlaceholders(card.after)}
                      </p>
                    </div>

                    {card.keywords_added.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Keywords added:</span>
                        {card.keywords_added.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 font-medium text-success">
                        <TrendingUp className="h-3 w-3" /> JD Match +{card.score_impact.jd_match}
                      </span>
                      <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
                        ATS +{card.score_impact.ats}
                      </span>
                      <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
                        Recruiter Scan +{card.score_impact.recruiter_scan}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => applyBullet(card)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                      >
                        <Check className="h-3.5 w-3.5" /> Use this bullet
                      </button>
                      <ActionButton
                        label="Regenerate"
                        icon={RefreshCw}
                        active={cardBusy === 'regenerate'}
                        disabled={!!cardBusy}
                        onClick={() => runBulletAction(card, 'regenerate')}
                      />
                      <ActionButton
                        label="Make more senior"
                        icon={ArrowUpRight}
                        active={cardBusy === 'senior'}
                        disabled={!!cardBusy}
                        onClick={() => runBulletAction(card, 'senior')}
                      />
                      <ActionButton
                        label="Make more concise"
                        icon={Scissors}
                        active={cardBusy === 'concise'}
                        disabled={!!cardBusy}
                        onClick={() => runBulletAction(card, 'concise')}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Backward-compatible legacy rendering for old persisted analyses.
            <LegacyLists gap={gap} />
          )}

          {gap.skills_to_add?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground">Skills to add (if truthful)</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {gap.skills_to_add.map((s) => (
                  <span key={s} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {gap.missing_keywords?.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground">Missing keywords</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {gap.missing_keywords.map((kw) => (
                  <span key={kw} className="rounded-full bg-risk-soft px-2.5 py-0.5 text-xs text-risk">
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
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
              <li key={b} className="text-sm text-muted-foreground">
                • {b}
              </li>
            ))}
          </ul>
        </div>
      )}
      {gap.suggested_bullets?.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-foreground">Suggested experience bullets</h4>
          <ul className="mt-1 space-y-1">
            {gap.suggested_bullets.map((b, i) => (
              <li key={i} className="rounded-lg bg-card p-2 text-sm text-foreground">
                • {b}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
