interface Props {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div className="max-w-3xl">
        <p className="eyebrow mb-2">CareerSignal</p>
        <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
