/** "or continue with email" divider used between social buttons and the form. */
export function AuthDivider({ label = 'or continue with email' }: { label?: string }) {
  return (
    <div className="my-5 flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-border" aria-hidden />
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}
