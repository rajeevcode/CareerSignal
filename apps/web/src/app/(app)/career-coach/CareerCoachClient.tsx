'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';

const PROMPTS = [
  'Which jobs should I apply to today?',
  'Why am I not getting interviews?',
  'Rewrite my CV for this JD.',
  'Prepare me for this interview.',
  'What skills am I missing for AI Product Manager roles?',
  'Build a 30-day job search plan.',
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function CareerCoachClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/career-coach').then((r) => r.json()).then((d) => {
      if (d.messages) setMessages(d.messages);
    }).catch(() => null);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);
    const res = await fetch('/api/career-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    setMessages((m) => [...m, { role: 'assistant', content: data.response || data.error || 'Sorry, try again.' }]);
    setLoading(false);
  }

  return (
    <>
      <PageHeader title="Career Coach" subtitle="Action-oriented AI assistant for your job search" />
      <div className="mb-4 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button key={p} type="button" onClick={() => send(p)} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:bg-surface-muted">
            {p}
          </button>
        ))}
      </div>
      <div className="card-surface flex h-[480px] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">Ask anything about your CV, jobs, or interview prep.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-xl px-4 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-surface-muted text-foreground'}`}>
              {m.content}
            </div>
          ))}
          {loading && <p className="text-sm text-muted-foreground">Thinking...</p>}
          <div ref={bottomRef} />
        </div>
        <form
          className="flex gap-2 border-t border-border p-4"
          onSubmit={(e) => { e.preventDefault(); send(input); }}
        >
          <input value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 rounded-lg border border-border px-3 py-2 text-sm" placeholder="Ask your career coach..." />
          <button type="submit" disabled={loading} className="btn-primary px-4 py-2 text-sm disabled:opacity-50">Send</button>
        </form>
      </div>
      <div className="mt-4 flex gap-3 text-sm">
        <Link href="/jd-match-tool" className="text-primary hover:underline">JD Match →</Link>
        <Link href="/applications" className="text-primary hover:underline">Applications →</Link>
        <Link href="/cv-builder" className="text-primary hover:underline">CV Builder →</Link>
      </div>
    </>
  );
}
