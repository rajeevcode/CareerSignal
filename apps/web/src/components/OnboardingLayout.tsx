import Link from 'next/link';

interface Props {
  step: number;
  totalSteps?: number;
  title: string;
  children: React.ReactNode;
}

const STEP_LABELS = ['Welcome', 'Upload CV', 'Target roles', 'Market', 'Preferences', 'Analyzing', 'Results'];

export function OnboardingLayout({ step, totalSteps = 7, title, children }: Props) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background">
      <div className="border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold text-primary">CareerSignal</Link>
          <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">Step {step} of {totalSteps}</span>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
          <div className="flex gap-1">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1.5 rounded-full ${i + 1 <= step ? 'bg-primary' : 'bg-surface-muted'}`} />
                <p className={`mt-1 hidden truncate text-[10px] sm:block ${i + 1 === step ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="panel-surface p-5 sm:p-7">
          <p className="eyebrow mb-2">Onboarding</p>
          <h1 className="text-2xl font-semibold leading-tight text-foreground">{title}</h1>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
