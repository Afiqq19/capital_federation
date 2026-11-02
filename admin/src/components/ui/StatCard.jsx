const TONES = {
  gold: {
    glow: 'rgba(245,185,66,.18)',
    bg: 'rgba(245,185,66,.12)',
    fg: '#f5b942',
    bd: 'rgba(245,185,66,.35)',
    topBorder: 'linear-gradient(90deg, #f5b942, rgba(245,185,66,0.15))'
  },
  emerald: {
    glow: 'rgba(52,211,153,.18)',
    bg: 'rgba(52,211,153,.12)',
    fg: '#34d399',
    bd: 'rgba(52,211,153,.35)',
    topBorder: 'linear-gradient(90deg, #34d399, rgba(52,211,153,0.15))'
  },
  sky: {
    glow: 'rgba(56,189,248,.18)',
    bg: 'rgba(56,189,248,.12)',
    fg: '#38bdf8',
    bd: 'rgba(56,189,248,.35)',
    topBorder: 'linear-gradient(90deg, #38bdf8, rgba(56,189,248,0.15))'
  },
  violet: {
    glow: 'rgba(167,139,250,.18)',
    bg: 'rgba(167,139,250,.14)',
    fg: '#a78bfa',
    bd: 'rgba(167,139,250,.35)',
    topBorder: 'linear-gradient(90deg, #a78bfa, rgba(167,139,250,0.15))'
  },
  amber: {
    glow: 'rgba(251,191,36,.18)',
    bg: 'rgba(251,191,36,.14)',
    fg: '#fbbf24',
    bd: 'rgba(251,191,36,.35)',
    topBorder: 'linear-gradient(90deg, #fbbf24, rgba(251,191,36,0.15))'
  },
  rose: {
    glow: 'rgba(251,113,133,.22)',
    bg: 'rgba(251,113,133,.14)',
    fg: '#fb7185',
    bd: 'rgba(251,113,133,.38)',
    topBorder: 'linear-gradient(90deg, #fb7185, rgba(251,113,133,0.15))'
  },
};

export default function StatCard({ label, value, hint, subValue, icon: Icon, tone = 'sky' }) {
  const t = TONES[tone] || TONES.sky;
  return (
    <div
      className="card stat relative overflow-hidden transition-all duration-300 hover:border-slate-700/80 hover:shadow-xl hover:-translate-y-0.5 group"
      style={{
        '--glow': t.glow,
        '--icon-bg': t.bg,
        '--icon-fg': t.fg,
        '--icon-bd': t.bd,
        background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.72) 0%, rgba(8, 13, 25, 0.90) 100%)',
        boxShadow: `0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 16px -4px ${t.glow}`,
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Sleek Glowing Top Colored Highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: t.topBorder }}
      />
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="stat-label text-[10.5px] font-bold tracking-wider text-slate-400 uppercase font-mono truncate">{label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="stat-value text-base sm:text-lg lg:text-xl xl:text-2xl font-black font-mono tracking-tight leading-none whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ color: t.fg, textShadow: `0 0 14px ${t.glow}` }}
              title={typeof value === 'string' ? value : undefined}
            >
              {value}
            </span>
          </div>
          {subValue && (
            <p className="text-[11px] font-mono text-slate-400 mt-1 whitespace-nowrap truncate" title={subValue}>
              {subValue}
            </p>
          )}
        </div>
        {Icon && (
          <div
            className="stat-icon shrink-0 p-2 rounded-xl transition-transform duration-200 group-hover:scale-105"
            style={{
              background: t.bg,
              color: t.fg,
              border: `1px solid ${t.bd}`,
              boxShadow: `0 0 12px ${t.glow}`,
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>
      {hint && (
        <p className="stat-hint text-[11px] font-mono text-slate-400 mt-2 flex items-center gap-1.5">
          {hint}
        </p>
      )}
    </div>
  );
}
