'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Company } from '@careersignal/shared';

interface Props {
  companies: Company[];
  apiPath?: string;
  redirectPath?: string;
  showCompanyPicker?: boolean;
}

export function NewJobForm({
  companies,
  apiPath = '/api/admin/jobs',
  redirectPath = '/admin/jobs',
  showCompanyPicker = true,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCompany, setNewCompany] = useState('');
  const [form, setForm] = useState({
    company_id: companies[0]?.id || '',
    title: '',
    description: '',
    location: '',
    remote_type: 'hybrid',
    salary_min: '',
    salary_max: '',
    salary_currency: 'INR',
    experience_min: '',
    experience_max: '',
    required_skills: '',
    nice_to_have_skills: '',
    employment_type: 'full_time',
    visa_sponsorship: false,
    function_tag: 'Product',
    tech_stack: '',
    status: 'published',
  });

  async function createCompany() {
    if (!newCompany.trim()) return;
    const res = await fetch('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCompany.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setForm({ ...form, company_id: data.id });
      setNewCompany('');
      router.refresh();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        salary_min: form.salary_min ? parseFloat(form.salary_min) : null,
        salary_max: form.salary_max ? parseFloat(form.salary_max) : null,
        experience_min: form.experience_min ? parseInt(form.experience_min) : null,
        experience_max: form.experience_max ? parseInt(form.experience_max) : null,
        required_skills: form.required_skills.split(',').map((s) => s.trim()).filter(Boolean),
        nice_to_have_skills: form.nice_to_have_skills.split(',').map((s) => s.trim()).filter(Boolean),
        tech_stack: form.tech_stack.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });

    if (res.ok) {
      router.push(redirectPath);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to create job');
    }
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Post New Job</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {error && <p className="rounded-lg bg-risk-soft p-3 text-sm text-risk">{error}</p>}

        {showCompanyPicker ? (
        <div>
          <label className="text-sm font-medium">Company</label>
          <select
            value={form.company_id}
            onChange={(e) => setForm({ ...form, company_id: e.target.value })}
            required
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="New company name"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button type="button" onClick={createCompany} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">
              Add
            </button>
          </div>
        </div>
        ) : companies[0] && (
          <input type="hidden" name="company_id" value={form.company_id} />
        )}

        <div>
          <label className="text-sm font-medium">Job title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea required rows={8} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Location</label>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Remote type</label>
            <select value={form.remote_type} onChange={(e) => setForm({ ...form, remote_type: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Salary min</label>
            <input type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Salary max</label>
            <input type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Currency</label>
            <select value={form.salary_currency} onChange={(e) => setForm({ ...form, salary_currency: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Experience min (years)</label>
            <input type="number" value={form.experience_min} onChange={(e) => setForm({ ...form, experience_min: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Experience max (years)</label>
            <input type="number" value={form.experience_max} onChange={(e) => setForm({ ...form, experience_max: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Required skills (comma-separated)</label>
          <input value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })}
            placeholder="Product Management, AI, SQL"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium">Nice-to-have skills</label>
          <input value={form.nice_to_have_skills} onChange={(e) => setForm({ ...form, nice_to_have_skills: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-sm font-medium">Tech stack</label>
          <input value={form.tech_stack} onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Function</label>
            <select value={form.function_tag} onChange={(e) => setForm({ ...form, function_tag: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="Product">Product</option>
              <option value="Engineering">Engineering</option>
              <option value="Data">Data</option>
              <option value="AI/ML">AI/ML</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.visa_sponsorship}
            onChange={(e) => setForm({ ...form, visa_sponsorship: e.target.checked })} />
          Visa sponsorship available
        </label>

        <button type="submit" disabled={loading}
          className="btn-primary px-6 py-2.5 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create job'}
        </button>
      </form>
    </div>
  );
}
