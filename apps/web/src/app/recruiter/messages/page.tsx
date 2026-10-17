import { redirect } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { getSession } from '@/lib/auth/session';

const stubThreads = [
  { id: '1', candidate: 'Priya Sharma', role: 'Senior PM', preview: 'Thanks for reaching out about the role…', unread: true },
  { id: '2', candidate: 'Alex Chen', role: 'Staff Engineer', preview: 'I wanted to follow up on my application.', unread: false },
];

export default async function RecruiterMessagesPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'recruiter') redirect('/dashboard');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">Candidate conversations (preview)</p>

      <div className="mt-8 space-y-3">
        {stubThreads.map((thread) => (
          <div key={thread.id} className="card-surface flex cursor-default gap-4 p-4">
            <div className="rounded-lg bg-primary-muted p-2">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{thread.candidate}</p>
                {thread.unread && (
                  <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    New
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{thread.role}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{thread.preview}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">Messaging inbox will connect to your shortlist pipeline.</p>
    </div>
  );
}
