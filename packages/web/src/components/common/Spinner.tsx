export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
  return (
    <div className={`${sz} animate-spin rounded-full border-2 border-slate-700 border-t-accent`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl bg-slate-850 border border-slate-800 p-5">
      <div className="h-3 w-24 bg-slate-700 rounded mb-3" />
      <div className="h-7 w-32 bg-slate-700 rounded" />
    </div>
  );
}
