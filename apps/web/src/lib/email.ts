import { getAppUrl } from '@/lib/utils';

export interface ApplicationConfirmationEmail {
  to: string;
  candidateName: string;
  jobTitle: string;
  companyName: string;
  interviewSignal?: number | null;
}

export async function sendApplicationConfirmationEmail(
  input: ApplicationConfirmationEmail,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'CareerSignal <onboarding@resend.dev>';

  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[email] RESEND_API_KEY not set — skipping application confirmation to', input.to);
    }
    return { sent: false, reason: 'email_not_configured' };
  }

  const appUrl = getAppUrl();
  const signalLine =
    input.interviewSignal != null
      ? `<p style="margin:0 0 16px;color:#334155;">Your Interview Signal for this role: <strong>${Math.round(input.interviewSignal)}%</strong></p>`
      : '';

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.candidateName)},</p>
      <p style="margin:0 0 16px;color:#334155;">
        Your application to <strong>${escapeHtml(input.jobTitle)}</strong> at
        <strong>${escapeHtml(input.companyName)}</strong> has been recorded in CareerSignal.
      </p>
      ${signalLine}
      <p style="margin:0 0 20px;color:#334155;">
        Track status updates and follow-up reminders from your Applied Jobs dashboard.
      </p>
      <a href="${appUrl}/applied" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">
        View Applied Jobs
      </a>
      <p style="margin:24px 0 0;font-size:12px;color:#64748b;">
        CareerSignal — Build your CV. Match any job. Know your interview signal.
      </p>
    </div>
  `.trim();

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: `Application recorded: ${input.jobTitle} at ${input.companyName}`,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => 'unknown error');
    console.error('[email] Failed to send application confirmation:', detail);
    return { sent: false, reason: 'send_failed' };
  }

  return { sent: true };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
