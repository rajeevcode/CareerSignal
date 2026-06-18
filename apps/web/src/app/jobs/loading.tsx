export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-slate-200" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
