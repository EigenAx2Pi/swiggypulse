interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function Card({ children, title, subtitle, actions, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl bg-slate-850 border border-slate-800 ${className}`}>
      {(title || actions) && (
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className={title ? 'px-5 pb-5' : 'p-5'}>{children}</div>
    </div>
  );
}
