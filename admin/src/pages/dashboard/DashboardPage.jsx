import { useState, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { ib, ibShort, changePct, signedPct, timeOnly } from '../../lib/format';
import {
  TrendingUp,
  Landmark,
  Building2,
  Users,
  AlertTriangle,
  Ban,
  Radio,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  ShieldCheck,
  Coins,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

function renderSparkline(history, isUp) {
  if (!history || history.length < 2) return null;
  const pts = history.map((h) => Number(h.points) || 0);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const w = 220;
  const h = 48;
  const pad = 4;

  const coords = pts.map((val, idx) => {
    const x = pad + (idx / (pts.length - 1)) * (w - pad * 2);
    const y = h - pad - ((val - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const areaD = `M ${coords[0]} L ${coords.join(' L ')} L ${coords[coords.length - 1].split(',')[0]},${h} L ${coords[0].split(',')[0]},${h} Z`;
  const strokeColor = isUp ? '#10b981' : '#f43f5e';

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${isUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${isUp ? 'up' : 'down'})`} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardPage({ onNavigate }) {
  const { overview, marketIndex, companies, users, bank, oversight, transactions, feed, actions } = useAdmin();
  const [isInjectingQE, setIsInjectingQE] = useState(false);
  const [moversTab, setMoversTab] = useState('ALL'); // 'ALL', 'GAINERS', 'LOSERS'

  // Hitung total kapitalisasi pasar dari list emiten atau overview
  const totalMarketCap = useMemo(() => {
    if (overview?.totalMarketCap && overview.totalMarketCap > 0) return overview.totalMarketCap;
    return (companies || []).reduce(
      (acc, c) => acc + (Number(c.current_price || 0) * Number(c.total_shares || 0)),
      0
    );
  }, [companies, overview?.totalMarketCap]);

  // Data IPMC Composite Index
  const mkt = marketIndex || overview?.marketIndex || null;
  const ipmcPoints = mkt?.points ? Number(mkt.points) : 6080.0;
  const ipmcChangePct = mkt?.changePct ? Number(mkt.changePct) : 0;
  const ipmcChangePts = mkt?.changePts ? Number(mkt.changePts) : 0;
  const isIndexUp = ipmcChangePct >= 0;

  // Breadth emiten: naik, flat, turun
  const breadthUp = mkt?.breadth?.up ?? (companies || []).filter((c) => changePct(c) > 0).length;
  const breadthFlat = mkt?.breadth?.flat ?? (companies || []).filter((c) => changePct(c) === 0).length;
  const breadthDown = mkt?.breadth?.down ?? (companies || []).filter((c) => changePct(c) < 0).length;
  const totalBreadth = Math.max(1, breadthUp + breadthFlat + breadthDown);
  const pctUp = ((breadthUp / totalBreadth) * 100).toFixed(0);
  const pctFlat = ((breadthFlat / totalBreadth) * 100).toFixed(0);
  const pctDown = (100 - Number(pctUp) - Number(pctFlat)).toFixed(0);

  // Top gainers & losers
  const sortedCompanies = useMemo(() => {
    return [...(companies || [])].sort((a, b) => changePct(b) - changePct(a));
  }, [companies]);

  const topGainers = useMemo(() => {
    const list = sortedCompanies.filter((c) => changePct(c) > 0);
    return (list.length > 0 ? list : sortedCompanies).slice(0, 5);
  }, [sortedCompanies]);

  const topLosers = useMemo(() => {
    const sortedAsc = [...(companies || [])].sort((a, b) => changePct(a) - changePct(b));
    const list = sortedAsc.filter((c) => changePct(c) < 0);
    return (list.length > 0 ? list : sortedAsc).slice(0, 5);
  }, [companies]);

  // Gabungan audit live feed (socket feed + transaksi bursa)
  const auditList = useMemo(() => {
    const combined = [];
    if (Array.isArray(feed) && feed.length > 0) {
      feed.forEach((f) => {
        combined.push({
          id: f.id,
          text: f.text,
          time: f.time,
          type: f.type || 'info',
        });
      });
    }
    if (Array.isArray(transactions) && transactions.length > 0) {
      transactions.slice(0, 15).forEach((t) => {
        const price = Number(t.price_per_share || t.price || 0);
        const total = Number(t.total_amount || t.total_amount_ib || (t.lots * 100 * price) || 0);
        combined.push({
          id: `tx-${t.id || Math.random()}`,
          text: `⚡ ${t.username || 'Pemain'} eksekusi ${t.type || 'ORDER'} ${t.lots || 0} lot ${t.symbol} @ ${ib(price)} (${ibShort(total)})`,
          time: t.created_at,
          type: t.type === 'BUY' ? 'emerald' : t.type === 'SELL' ? 'rose' : 'sky',
        });
      });
    }
    combined.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    return combined.slice(0, 15);
  }, [feed, transactions]);

  // Handler suntik likuiditas darurat
  const handleQE = async () => {
    try {
      setIsInjectingQE(true);
      await actions.liquidityInjection();
    } finally {
      setIsInjectingQE(false);
    }
  };

  // Active macro event
  const activeEvent = overview?.activeEvent || (overview?.activeEvents && overview.activeEvents[0]) || null;

  return (
    <div className="space-y-6 page-enter">
      {/* 1. HERO COMPOSITE INDEX & REALTIME MARKET SNAPSHOT */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800/90 shadow-2xl p-5 md:p-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Sisi Kiri: Indeks Acuan IPMC & Sparkline */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  Bursa Efek Capital Federation • Sesi Live
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                <span>IPMC Composite Index</span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  CFX-100
                </span>
              </h2>
              <div className="flex items-baseline gap-3 mt-1.5 flex-wrap">
                <span className="text-3xl md:text-4xl font-black font-mono tracking-tight text-white">
                  {ipmcPoints.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={`text-sm md:text-base font-bold font-mono px-2.5 py-0.5 rounded-lg flex items-center gap-1 ${
                    isIndexUp
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {isIndexUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  {ipmcChangePts >= 0 ? '+' : ''}
                  {ipmcChangePts.toFixed(2)} ({signedPct(ipmcChangePct)})
                </span>
              </div>
            </div>

            {/* Sparkline Visual Trend */}
            <div className="hidden sm:block pl-2 border-l border-slate-800">
              <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Tren Intraday (50 Tick)</div>
              {renderSparkline(mkt?.history, isIndexUp)}
            </div>
          </div>

          {/* Sisi Kanan: Market Breadth Bar & Arus Modal Asing */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4 lg:gap-6 border-t lg:border-t-0 lg:border-l border-slate-800 pt-4 lg:pt-0 lg:pl-6">
            {/* Market Breadth */}
            <div className="space-y-2 min-w-[200px]">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 font-semibold">Distribusi Emiten</span>
                <span className="text-slate-300 font-bold">{companies?.length || 107} Emiten</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-slate-800 border border-slate-700/50">
                <div style={{ width: `${pctUp}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`${breadthUp} Naik`} />
                <div style={{ width: `${pctFlat}%` }} className="bg-slate-500 h-full transition-all duration-500" title={`${breadthFlat} Tetap`} />
                <div style={{ width: `${pctDown}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`${breadthDown} Turun`} />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                <span className="text-emerald-400 font-bold">▲ {breadthUp} Naik</span>
                <span className="text-slate-400">■ {breadthFlat} Tetap</span>
                <span className="text-rose-400 font-bold">▼ {breadthDown} Turun</span>
              </div>
            </div>

            {/* Turnover & Foreign Flow */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5 text-xs font-mono min-w-[190px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Turnover Harian:</span>
                <span className="text-amber-400 font-bold">{ibShort(mkt?.stats?.totalTurnoverIb || overview?.marketVolumeIb || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Modal Asing (Net):</span>
                <span className={`font-bold ${(mkt?.stats?.foreignNetIb ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(mkt?.stats?.foreignNetIb ?? 0) >= 0 ? '+' : ''}
                  {ibShort(mkt?.stats?.foreignNetIb || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span>Frekuensi:</span>
                <span className="text-slate-200">{(mkt?.stats?.tradeFrequency || 0).toLocaleString()}x order</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MACRO CRISIS / EMERGENCY EVENT BANNER */}
      {activeEvent && (
        <div className="card p-4 bg-gradient-to-r from-amber-500/20 via-amber-600/10 to-slate-950 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/20">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0 mt-0.5 sm:mt-0">
              <Zap size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono">
                  Peristiwa Makro Sedang Berlangsung
                </span>
                <Badge tone="amber" pulse>AKTIF</Badge>
                {activeEvent.affected_sector && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300">
                    Sektor: {activeEvent.affected_sector}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-100 mt-0.5">{activeEvent.title}</h4>
              <p className="text-xs text-slate-300 line-clamp-1">{activeEvent.description}</p>
            </div>
          </div>
          <Button variant="amber" size="sm" onClick={() => onNavigate('macro')} icon={Zap} className="shrink-0">
            Kelola Makro
          </Button>
        </div>
      )}

      {/* 3. SIX PRIMARY STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          label="Kapitalisasi Bursa"
          value={ibShort(totalMarketCap)}
          hint={`${companies?.length || 107} Emiten Terdaftar`}
          icon={TrendingUp}
          tone="gold"
        />
        <StatCard
          label="Cadangan Kas Negara"
          value={ibShort(overview?.treasuryBalance || 50000000000)}
          hint="Brankas Fiskal Federasi"
          icon={Coins}
          tone="emerald"
        />
        <StatCard
          label="Bunga Acuan BCF"
          value={`${bank?.interest_rate ?? 5.5}%`}
          hint="Kebijakan Moneter"
          icon={Landmark}
          tone="sky"
        />
        <StatCard
          label="Konglomerat"
          value={users?.length || 0}
          hint="Akun Pemain Aktif"
          icon={Users}
          tone="violet"
        />
        <StatCard
          label="Radar UMA"
          value={oversight?.umaList?.length || 0}
          hint="Volatilitas Tidak Wajar"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Saham Suspensi"
          value={oversight?.suspensionList?.length || 0}
          hint="Perdagangan Dibekukan"
          icon={Ban}
          tone="rose"
        />
      </div>

      {/* 4. MAIN WORKSPACE GRID: MOVERS (LEFT) & MONETARY / AUDIT (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Top Movers & Surveillance Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Pergerakan Saham Utama (Movers)"
              subtitle="Emiten dengan persentase perubahan harga tertinggi dan terendah hari ini"
              icon={TrendingUp}
              tone="var(--gold)"
              action={
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-[11px] font-mono">
                    <button
                      onClick={() => setMoversTab('ALL')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        moversTab === 'ALL' ? 'bg-slate-800 text-slate-100 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setMoversTab('GAINERS')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        moversTab === 'GAINERS' ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Top Gainers
                    </button>
                    <button
                      onClick={() => setMoversTab('LOSERS')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${
                        moversTab === 'LOSERS' ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Top Losers
                    </button>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => onNavigate('companies')}>
                    Lihat Semua
                  </Button>
                </div>
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gainers List */}
              {(moversTab === 'ALL' || moversTab === 'GAINERS') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono px-1">
                    <span className="flex items-center gap-1.5">
                      <ArrowUpRight size={15} />
                      Top Gainers (Penguatan)
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Harga & %</span>
                  </div>
                  <div className="space-y-2">
                    {topGainers.map((c) => {
                      const chg = changePct(c);
                      const isUma = c.uma_flag === 1 || c.is_uma;
                      const isSuspended = Boolean(c.suspend_until && new Date(c.suspend_until) > new Date()) || Boolean(c.suspended_at) || c.is_suspended;
                      const isBumn = c.is_bumn === 1;

                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-100 font-mono">{c.symbol}</span>
                              {isUma && <Badge tone="amber">UMA</Badge>}
                              {isSuspended && <Badge tone="rose">BEKU</Badge>}
                              {isBumn && <Badge tone="sky">BUMF</Badge>}
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                {c.sector || 'Umum'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                              {c.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-mono font-bold text-slate-200">
                              {ib(c.current_price)}
                            </div>
                            <div className="text-[11px] font-mono font-bold text-emerald-400">
                              {signedPct(chg)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Losers List */}
              {(moversTab === 'ALL' || moversTab === 'LOSERS') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-400 font-mono px-1">
                    <span className="flex items-center gap-1.5">
                      <ArrowDownRight size={15} />
                      Top Losers (Pelemahan)
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">Harga & %</span>
                  </div>
                  <div className="space-y-2">
                    {topLosers.map((c) => {
                      const chg = changePct(c);
                      const isUma = c.uma_flag === 1 || c.is_uma;
                      const isSuspended = Boolean(c.suspend_until && new Date(c.suspend_until) > new Date()) || Boolean(c.suspended_at) || c.is_suspended;
                      const isBumn = c.is_bumn === 1;

                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs text-slate-100 font-mono">{c.symbol}</span>
                              {isUma && <Badge tone="amber">UMA</Badge>}
                              {isSuspended && <Badge tone="rose">BEKU</Badge>}
                              {isBumn && <Badge tone="sky">BUMF</Badge>}
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                {c.sector || 'Umum'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 truncate block mt-0.5">
                              {c.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-mono font-bold text-slate-200">
                              {ib(c.current_price)}
                            </div>
                            <div className="text-[11px] font-mono font-bold text-rose-400">
                              {signedPct(chg)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Surveillance Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-transparent border-amber-500/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                      <AlertTriangle size={16} />
                    </span>
                    <h4 className="text-sm font-bold text-amber-300 font-mono">
                      Radar UMA ({oversight?.umaList?.length || 0})
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Sinyalkan peringatan pergerakan tidak wajar kepada investor ritel. Perdagangan tetap berjalan normal.
                  </p>
                </div>
                <Button variant="amber" size="sm" onClick={() => onNavigate('uma')} className="shrink-0">
                  Buka Radar
                </Button>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-rose-500/10 via-slate-900/60 to-transparent border-rose-500/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300">
                      <Ban size={16} />
                    </span>
                    <h4 className="text-sm font-bold text-rose-300 font-mono">
                      Suspensi Saham ({oversight?.suspensionList?.length || 0})
                    </h4>
                  </div>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Bekukan order beli & jual emiten bermasalah untuk mendinginkan pasar dan melindungi stabilitas modal.
                  </p>
                </div>
                <Button variant="rose" size="sm" onClick={() => onNavigate('suspension')} className="shrink-0">
                  Kelola Suspensi
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Kolom Kanan: Bank Sentral BCF & Live Audit Stream */}
        <div className="space-y-6">
          {/* Card Bank Sentral */}
          <Card>
            <CardHeader
              title="Bank Sentral BCF"
              subtitle="Kondisi likuiditas moneter & kredit perbankan"
              icon={Landmark}
              tone="var(--emerald)"
              action={
                <Button variant="emerald" size="sm" onClick={() => onNavigate('bank')}>
                  Kelola
                </Button>
              }
            />

            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Suku Bunga Acuan:</span>
                  <span className="font-bold text-emerald-400">{bank?.interest_rate ?? 5.5}% p.a.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Kredit Disalurkan:</span>
                  <span className="font-bold text-slate-200">{ibShort(bank?.total_issued || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Sisa Hutang Beredar:</span>
                  <span className="font-bold text-amber-300">{ibShort(bank?.total_outstanding || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Kredit Macet (NPL):</span>
                  <span className="font-bold text-rose-400">{bank?.npl_count || 0} Debitur</span>
                </div>
              </div>

              <Button
                variant="primary"
                block
                size="sm"
                onClick={handleQE}
                disabled={isInjectingQE}
                icon={Zap}
              >
                {isInjectingQE ? 'Memproses Intervensi...' : 'Injeksi Likuiditas Darurat (QE)'}
              </Button>
            </div>
          </Card>

          {/* Card Live Terminal Feed & Audit Stream */}
          <Card>
            <CardHeader
              title="Live Terminal Feed"
              subtitle="Siaran aktivitas perdagangan, audit order & bursa realtime"
              icon={Radio}
              tone="var(--sky)"
            />

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {auditList.length > 0 ? (
                auditList.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.type === 'emerald' ? 'bg-emerald-400' : item.type === 'rose' ? 'bg-rose-400' : 'bg-sky-400'
                        }`} />
                        <span>{timeOnly(item.time)}</span>
                      </span>
                    </div>
                    <p className="text-slate-200 leading-snug font-mono text-[11px]">{item.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-6 font-mono">
                  Menunggu siaran aktivitas bursa berikutnya...
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
