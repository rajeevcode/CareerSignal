'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { OnboardingLayout } from '@/components/OnboardingLayout';

interface ExperienceRow {
  id: string;
  company: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
}

interface Props {
  profile: {
    current_title: string | null;
    location: string | null;
    total_experience_years: number | null;
    profile_summary: string | null;
    cv_score: number | null;
  };
  skills: string[];
  experience: ExperienceRow[];
}

export function ProfileReviewClient({ profile, skills, experience }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    current_title: profile.current_title || '',
    location: profile.location || '',
    total_experience_years: profile.total_experience_years?.toString() || '',
    profile_summary: profile.profile_summary || '',
  });

  async function handleContinue() {
    setLoading(true);
    const res = await fetch('/api/onboarding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        onboarding_step: 2,
        profile: {
          current_title: form.current_title || null,
          location: form.location || null,
          total_experience_years: form.total_experience_years ? parseFloat(form.total_experience_years) : null,
          profile_summary: form.profile_summary || null,
        },
      }),
    });

    if (res.ok) {
      router.push('/onboarding/roles');
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <OnboardingLayout step={2} title="Review your AI profile">
      <p className="mt-2 text-slate-600">
        We extracted this from your CV. Edit anything that looks off, then continue.
      </p>

      {profile.cv_score != null && (
        <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-sm text-indigo-700">CV Score</p>
          <p className="text-2xl font-bold text-indigo-900">{Math.round(profile.cv_score)}/100</p>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {[
          { key: 'current_title', label: 'Current title', type: 'text' },
          { key: 'location', label: 'Location', type: 'text' },
          { key: 'total_experience_years', label: 'Total experience (years)', type: 'number' },
        ].map(({ key, label, type }) => (
          <div key={key}>
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <input
              type={type}
              value={form[key as keyof typeof form]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </div>
        ))}
        <div>
          <label className="text-sm font-medium text-slate-700">Profile summary</label>
          <textarea
            rows={4}
            value={form.profile_summary}
            onChange={(e) => setForm({ ...form, profile_summary: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
      </div>

      {skills.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700">Skills detected</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {skills.slice(0, 15).map((s) => (
              <span key={s} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">{s}</span>
            ))}
          </div>
        </div>
      )}

      {experience.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700">Experience</h3>
          <div className="mt-2 space-y-3">
            {experience.slice(0, 4).map((exp) => (
              <div key={exp.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="font-medium text-slate-900">{exp.title}</p>
                <p className="text-sm text-slate-600">{exp.company}</p>
                {(exp.start_date || exp.end_date) && (
                  <p className="text-xs text-slate-400">{exp.start_date} – {exp.end_date || 'Present'}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleContinue}
        disabled={loading}
        className="mt-8 w-full rounded-lg bg-indigo-600 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Looks good, continue →'}
      </button>
    </OnboardingLayout>
  );
}
