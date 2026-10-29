export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export const FormField = Field;

export function Input({ className = '', ...props }) {
  return <input className={`input ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`textarea ${className}`} {...props} />;
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`select ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-on={checked ? 'true' : 'false'}
      className="switch"
      onClick={() => onChange(!checked)}
    />
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div
      className="inline-flex p-1 rounded-xl gap-1"
      style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)' }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            style={{
              background: active ? 'rgba(245,185,66,.16)' : 'transparent',
              color: active ? 'var(--gold)' : 'var(--text-dim)',
              border: `1px solid ${active ? 'rgba(245,185,66,.3)' : 'transparent'}`,
            }}
          >
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 opacity-70 mono">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
