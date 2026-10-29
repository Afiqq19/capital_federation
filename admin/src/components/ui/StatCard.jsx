const TONES = {
  gold: { glow: 'rgba(245,185,66,.16)', bg: 'rgba(245,185,66,.12)', fg: '#f5b942', bd: 'rgba(245,185,66,.3)' },
  emerald: { glow: 'rgba(52,211,153,.14)', bg: 'rgba(52,211,153,.12)', fg: '#34d399', bd: 'rgba(52,211,153,.3)' },
  sky: { glow: 'rgba(56,189,248,.14)', bg: 'rgba(56,189,248,.12)', fg: '#38bdf8', bd: 'rgba(56,189,248,.3)' },
  violet: { glow: 'rgba(167,139,250,.16)', bg: 'rgba(167,139,250,.14)', fg: '#a78bfa', bd: 'rgba(167,139,250,.32)' },
  amber: { glow: 'rgba(251,191,36,.15)', bg: 'rgba(251,191,36,.13)', fg: '#fbbf24', bd: 'rgba(251,191,36,.32)' },
  rose: { glow: 'rgba(251,113,133,.15)', bg: 'rgba(251,113,133,.13)', fg: '#fb7185', bd: 'rgba(251,113,133,.34)' },
};

export default function StatCard({ label, value, hint, subValue, icon: Icon, tone = 'sky' }) {
  const t = TONES[tone] || TONES.sky;
  return (
    <div
      className="card stat"
      style={{ '--glow': t.glow, '--icon-bg': t.bg, '--icon-fg': t.fg, '--icon-bd': t.bd }}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="stat-label">{label}</p>
          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
            <span
              className="stat-value text-xl lg:text-2xl font-black font-mono tracking-tight leading-none"
              style={{ color: tone === 'gold' || tone === 'rose' || tone === 'amber' || tone === 'emerald' ? t.fg : undefined }}
              title={typeof value === 'string' ? value : undefined}
            >
              {value}
            </span>
          </div>
          {subValue && (
            <p className="text-[11px] font-mono text-slate-400 mt-1 whitespace-nowrap" title={subValue}>
              {subValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className="stat-icon shrink-0">
            <Icon size={18} />
          </div>
        )}
      </div>
      {hint && <p className="stat-hint">{hint}</p>}
    </div>
  );
}
