export default function Card({ className = '', pad = true, children, ...rest }) {
  return (
    <div className={`card ${pad ? 'card-pad' : ''} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon: Icon, action, tone }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4">
      <div className="flex items-start gap-3 min-w-0 w-full sm:w-auto">
        {Icon && (
          <div className="mt-0.5 shrink-0" style={{ color: tone || 'var(--gold)' }}>
            <Icon size={18} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="card-sub">{subtitle}</p>}
        </div>
      </div>
      {action && (
        <div className="w-full sm:w-auto shrink-0 flex flex-wrap sm:flex-nowrap items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
