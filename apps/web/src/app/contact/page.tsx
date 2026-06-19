'use client';

import { Mail, MessageSquare, Building2, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/components/ToastProvider';

type Topic = 'support' | 'sales' | 'partnerships' | 'other';
type Values = { name: string; email: string; topic: Topic | ''; message: string };
type Errors = Partial<Record<keyof Values, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function topicLabel(t: Topic) {
  return { support: 'support', sales: 'sales', partnerships: 'partnerships', other: 'your inquiry' }[t];
}

export default function ContactPage() {
  const { showToast } = useToast();
  const [values, setValues] = useState<Values>({ name: '', email: '', topic: '', message: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Values | null>(null);

  function set<K extends keyof Values>(k: K, v: Values[K]) {
    setValues((p) => ({ ...p, [k]: v }));
  }

  function validate(): Errors {
    const e: Errors = {};
    if (values.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!EMAIL_RE.test(values.email.trim())) e.email = 'Enter a valid email address';
    if (!values.topic) e.topic = 'Select a topic';
    if (values.message.trim().length < 10) e.message = 'Message must be at least 10 characters';
    return e;
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSubmitting(true);
    // Simulated send. Replace with a server function or email integration later.
    await new Promise((r) => setTimeout(r, 700));
    setSubmitted(values);
    showToast({ title: 'Message sent', description: "We'll be in touch soon." });
    setValues({ name: '', email: '', topic: '', message: '' });
    setSubmitting(false);
  }

  const messageLen = values.message.length;
  const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground';

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Contact us</h1>
      <p className="mt-4 text-base text-muted-foreground">
        We usually reply within one business day. Pick the channel that fits your question best, or send a note below.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <ContactCard icon={<MessageSquare className="h-5 w-5" />} title="Support" href="mailto:support@careersignal.app" label="support@careersignal.app" />
        <ContactCard icon={<Building2 className="h-5 w-5" />} title="Sales" href="mailto:sales@careersignal.app" label="sales@careersignal.app" />
        <ContactCard icon={<Mail className="h-5 w-5" />} title="Partnerships" href="mailto:hello@careersignal.app" label="hello@careersignal.app" />
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
        {submitted ? (
          <div className="flex flex-col items-start gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Thanks, {submitted.name.split(' ')[0]} — message received
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ve logged your note about{' '}
                <span className="font-medium text-foreground">{topicLabel(submitted.topic as Topic)}</span>. A reply
                will land at <span className="font-medium text-foreground">{submitted.email}</span> within one business
                day.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSubmitted(null)}
              className="mt-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="name" label="Name" required error={errors.name}>
                <input id="name" autoComplete="name" className={inputCls} value={values.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field id="email" label="Email" required error={errors.email}>
                <input id="email" type="email" autoComplete="email" className={inputCls} value={values.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
            </div>

            <Field id="topic" label="Topic" required error={errors.topic}>
              <select id="topic" className={inputCls} value={values.topic} onChange={(e) => set('topic', e.target.value as Topic)}>
                <option value="">Choose a topic</option>
                <option value="support">Support</option>
                <option value="sales">Sales</option>
                <option value="partnerships">Partnerships</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field id="message" label="Message" required error={errors.message} hint={`${messageLen}/1000`}>
              <textarea
                id="message"
                rows={6}
                maxLength={1000}
                className={inputCls}
                value={values.message}
                onChange={(e) => set('message', e.target.value)}
              />
            </Field>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send message
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function ContactCard({ icon, title, href, label }: { icon: React.ReactNode; title: string; href: string; label: string }) {
  return (
    <a href={href} className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent">
      <div className="flex items-center gap-2 text-foreground">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-foreground group-hover:text-primary">{label}</p>
    </a>
  );
}
