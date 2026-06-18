import Link from 'next/link';

interface Props {
  step: 1 | 2 | 3;
  title: string;
  children: React.ReactNode;
}

export function OnboardingLayout({ step, title, children }: Props) {
  const steps = [
    { num: 1, label: 'Upload CV' },
    { num: 2, label: 'Review profile' },
    { num: 3, label: 'Target roles' },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="text-lg font-bold text-indigo-600">CareerSignal</Link>
          <span className="text-sm text-slate-500">Step {step} of 3</span>
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
          <div className="flex gap-2">
            {steps.map((s) => (
              <div key={s.num} className="flex-1">
                <div className={`h-1.5 rounded-full ${s.num <= step ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                <p className={`mt-1 text-xs ${s.num === step ? 'font-medium text-indigo-600' : 'text-slate-400'}`}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}
