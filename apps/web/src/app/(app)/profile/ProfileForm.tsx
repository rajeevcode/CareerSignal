'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CandidateProfile, RemotePreference } from '@careersignal/shared';

interface Props {
  profile: CandidateProfile;
}

export function ProfileForm({ profile }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    current_title: profile.current_title || '',
    location: profile.location || '',
    total_experience_years: profile.total_experience_years?.toString() || '',
    salary_expectation: profile.salary_expectation?.toString() || '',
    notice_period: profile.notice_period || '',
    visa_status: profile.visa_status || '',
    remote_preference: profile.remote_preference || 'any',
    target_roles: (profile.target_roles || []).join(', '),
    profile_summary: profile.profile_summary || '',
    linkedin_url: profile.linkedin_url || '',
    github_url: profile.github_url || '',
    portfolio_url: profile.portfolio_url || '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        total_experience_years: form.total_experience_years ? parseFloat(form.total_experience_years) : null,
        salary_expectation: form.salary_expectation ? parseFloat(form.salary_expectation) : null,
        target_roles: form.target_roles.split(',').map((s) => s.trim()).filter(Boolean),
        remote_preference: form.remote_preference as RemotePreference,
      }),
    });

    if (res.ok) {
      setMessage('Profile updated successfully');
      router.refresh();
    } else {
      setMessage('Failed to update profile');
    }
    setLoading(false);
  }

  const fields = [
    { key: 'current_title', label: 'Current title' },
    { key: 'location', label: 'Location' },
    { key: 'total_experience_years', label: 'Total experience (years)', type: 'number' },
    { key: 'salary_expectation', label: 'Salary expectation (INR)', type: 'number' },
    { key: 'notice_period', label: 'Notice period' },
    { key: 'visa_status', label: 'Visa / work authorization status' },
    { key: 'linkedin_url', label: 'LinkedIn URL' },
    { key: 'github_url', label: 'GitHub URL' },
    { key: 'portfolio_url', label: 'Portfolio URL' },
  ] as const;

  return (
    <>
      <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
      <p className="mt-1 text-muted-foreground">Update your preferences to improve job matching</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {message && (
          <p className={`rounded-lg p-3 text-sm ${message.includes('success') ? 'bg-success-soft text-success' : 'bg-risk-soft text-risk'}`}>
            {message}
          </p>
        )}

        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-sm font-medium text-foreground">{field.label}</label>
            <input
              type={'type' in field ? field.type : 'text'}
              value={form[field.key]}
              onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </div>
        ))}

        <div>
          <label className="text-sm font-medium text-foreground">Remote preference</label>
          <select
            value={form.remote_preference}
            onChange={(e) => setForm({ ...form, remote_preference: e.target.value as RemotePreference })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="any">Any</option>
            <option value="remote">Remote only</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Target roles (comma-separated)</label>
          <input
            type="text"
            value={form.target_roles}
            onChange={(e) => setForm({ ...form, target_roles: e.target.value })}
            placeholder="AI Product Manager, Senior PM"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Profile summary</label>
          <textarea
            value={form.profile_summary}
            onChange={(e) => setForm({ ...form, profile_summary: e.target.value })}
            rows={4}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </>
  );
}
