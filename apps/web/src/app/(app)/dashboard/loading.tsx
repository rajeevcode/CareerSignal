export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-secondary" />
        <div className="h-4 w-96 rounded bg-secondary" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    </div>
  );
}
