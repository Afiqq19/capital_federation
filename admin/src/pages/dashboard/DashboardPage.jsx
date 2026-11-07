import { useState, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import IpmcMarketHero from './components/IpmcMarketHero';
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
      {/* 1. HERO COMPOSITE INDEX & REALTIME MARKET TERMINAL (1:1 DENGAN APK TERKINI) */}
      <IpmcMarketHero marketIndex={marketIndex} overview={overview} companies={companies} />

      {/* 2. MACRO CRISIS / EMERGENCY EVENT BANNER */}
      {activeEvent && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-slate-950/90 border border-amber-500/50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl shadow-amber-950/30 backdrop-blur-xl">
          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-400 to-amber-600" />
          <div className="flex items-start sm:items-center gap-3.5 pl-2">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 shadow-lg shadow-amber-500/10">
              <Zap size={22} className="animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-mono">
                  Peristiwa Makro Sedang Berlangsung
                </span>
                <Badge tone="amber" pulse>AKTIF</Badge>
                {activeEvent.affected_sector && (
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Sektor: {activeEvent.affected_sector}
                  </span>
                )}
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-white mt-1">{activeEvent.title}</h4>
              <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">{activeEvent.description}</p>
            </div>
          </div>
          <Button variant="amber" size="sm" onClick={() => onNavigate('macro')} icon={Zap} className="shrink-0 shadow-lg shadow-amber-500/20 font-bold">
            Kelola Makro
          </Button>
        </div>
      )}

      {/* 3. SIX PRIMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Kapitalisasi Bursa"
          value={ibShort(totalMarketCap)}
          hint={`${companies?.length || 363} Emiten Terdaftar`}
          icon={TrendingUp}
          tone="gold"
        />
        {(() => {
          const treasuryBal = Number(overview?.treasuryBalance !== undefined ? overview.treasuryBalance : 50000000000);
          const isDeficit = treasuryBal < 0;
          return (
            <StatCard
              label="Cadangan Kas Negara"
              value={ibShort(treasuryBal)}
              hint={isDeficit ? '⚠️ Defisit Fiskal Kas Negara' : 'Brankas Fiskal Federasi'}
              icon={Coins}
              tone={isDeficit ? 'rose' : 'emerald'}
            />
          );
        })()}
        <StatCard
          label="Bunga Acuan BCF"
          value={`${bank?.interest_rate ?? 18}%`}
          hint="Kebijakan Moneter"
          icon={Landmark}
          tone="sky"
        />
        <StatCard
          label="Konglomerat"
          value={(overview?.totalPlayers || users?.length || 1053).toLocaleString('id-ID')}
          hint={
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {(users?.filter((u) => u.is_online).length || 0)} Live Online
            </span>
          }
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
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
