interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warn' | 'info' | 'swiggy';
}

const VARIANTS: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-800 text-slate-200 border-slate-700',
  success: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
  danger: 'bg-red-500/10 text-red-400 border-red-500/30',
  warn: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  swiggy: 'bg-swiggy/10 text-swiggy border-swiggy/30',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-md ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}
