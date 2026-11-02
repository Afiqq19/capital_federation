import { useState, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import { FormField, Input, Select, Textarea } from '../../components/ui/Form';
import { ib, ibShort, changePct, signedPct } from '../../lib/format';
import {
  Building2,
  TrendingUp,
  Cpu,
  AlertTriangle,
  Ban,
  CheckCircle,
  Unlock,
  Gavel,
  Landmark,
  User,
  ShieldAlert,
  Trash2,
  RefreshCw,
  Zap,
  ArrowUpDown,
  FileText,
  Sliders,
} from 'lucide-react';

const BOT_STATUSES = [
  { value: 'AGGRESSIVE', label: 'Aggressive (Bullish)', tone: 'emerald' },
  { value: 'MODERATE', label: 'Moderate (Stabil)', tone: 'sky' },
  { value: 'PASSIVE', label: 'Passive (Volume Rendah)', tone: 'slate' },
  { value: 'DEFENSIVE', label: 'Defensive (Tahan Banting)', tone: 'violet' },
  { value: 'CRASH_MODE', label: 'Crash Mode (Panic Sell)', tone: 'rose' },
];

export default function CompaniesPage() {
  const { companies, actions, notify } = useAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('PRICE_DESC');
  const [loadingSeize, setLoadingSeize] = useState(null);

  // Modal State: Intervensi Regulasi / Normalisasi Harga Manipulasi Saham
  const [normalizeModalCompany, setNormalizeModalCompany] = useState(null);
  const [targetNormPrice, setTargetNormPrice] = useState(2500);
  const [seizeManipulator, setSeizeManipulator] = useState(false);
  const [applyHaircutNotice, setApplyHaircutNotice] = useState(true);
  const [normReason, setNormReason] = useState('Intervensi Pengawas Bursa: Normalisasi Manipulasi Saham Gorengan');
  const [isNormalizing, setIsNormalizing] = useState(false);

  // Modal State: Normalisasi Massal Saham Gorengan (> 20.000)
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchThreshold, setBatchThreshold] = useState(20000);
  const [batchFairPrice, setBatchFairPrice] = useState(2500);
  const [batchSeize, setBatchSeize] = useState(false);
  const [isBatchNormalizing, setIsBatchNormalizing] = useState(false);

  // Modal State: Sita Perusahaan
  const [seizeModalCompany, setSeizeModalCompany] = useState(null);
  const [seizeReasonPreset, setSeizeReasonPreset] = useState('Gagal bayar kredit sindikasi BIF & Eksekusi PNAF');
  const [seizeCustomReason, setSeizeCustomReason] = useState('');
  const [submittingSeize, setSubmittingSeize] = useState(false);

  // Modal State: Hapus Perusahaan Permanen
  const [deleteModalCompany, setDeleteModalCompany] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Hitung berapa emiten yang saat ini harganya > 20.000 (saham gorengan ekstrem)
  const overpricedCount = useMemo(() => {
    return (companies || []).filter((c) => (Number(c.current_price) || 0) >= 20000).length;
  }, [companies]);

  const handleOpenNormalize = (company) => {
    setNormalizeModalCompany(company);
    // Tentukan estimasi harga fundamental sehat (IB 1.500 - 3.500)
    const fundFactor = Math.max(0.7, Math.min(1.5, (company.fundamental_score || 70) / 70));
    const estimated = Math.round(2500 * fundFactor);
    setTargetNormPrice(estimated);
    setSeizeManipulator(Number(company.current_price || 0) >= 20000);
    setApplyHaircutNotice(true);
    setNormReason(
      `Intervensi Otoritas Bursa IPMC & PNAF: Terbukti praktik goreng saham manipulatif dari IB ${(Number(company.current_price) || 0).toLocaleString('id-ID')} ke nilai fundamental IB ${estimated.toLocaleString('id-ID')}.`
    );
  };

  const handleConfirmNormalize = async (e) => {
    if (e) e.preventDefault();
    if (!normalizeModalCompany) return;
    try {
      setIsNormalizing(true);
      await actions.normalizeCompanyPrice({
        companyId: normalizeModalCompany.id,
        targetPrice: targetNormPrice,
        seizeManipulator,
        applyHaircutNotice,
        reason: normReason,
      });
      setNormalizeModalCompany(null);
    } catch (err) {
      alert(`❌ Gagal menormalisasi harga: ${err.message}`);
    } finally {
      setIsNormalizing(false);
    }
  };

  const handleConfirmBatchNormalize = async (e) => {
    if (e) e.preventDefault();
    try {
      setIsBatchNormalizing(true);
      await actions.batchNormalizeOverpriced({
        thresholdPrice: batchThreshold,
        targetFairPrice: batchFairPrice,
        seizeManipulators: batchSeize,
      });
      setShowBatchModal(false);
    } catch (err) {
      alert(`❌ Gagal normalisasi massal: ${err.message}`);
    } finally {
      setIsBatchNormalizing(false);
    }
  };

  const handleConfirmDeleteCompany = async () => {
    if (!deleteModalCompany || deleteConfirmText !== 'HAPUS') return;
    try {
      setIsDeleting(true);
      await actions.deleteCompany(deleteModalCompany.id);
      setDeleteModalCompany(null);
      setDeleteConfirmText('');
    } catch (err) {
      notify?.({ message: 'Gagal menghapus emiten: ' + err.message, tone: 'rose' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenSeize = (company) => {
    setSeizeModalCompany(company);
    setSeizeReasonPreset('Gagal bayar kredit sindikasi BIF & Eksekusi PNAF');
    setSeizeCustomReason('');
  };

  const handleConfirmSeize = async (e) => {
    e.preventDefault();
    if (!seizeModalCompany) return;
    const finalReason = seizeCustomReason.trim() || seizeReasonPreset;
    try {
      setSubmittingSeize(true);
      await actions.seizeCompany(seizeModalCompany.id, finalReason);
      setSeizeModalCompany(null);
    } catch (err) {
      alert(`❌ Gagal menyita perseroan: ${err.message}`);
    } finally {
      setSubmittingSeize(false);
    }
  };

  const handleUnseize = async (company) => {
    if (!window.confirm(`Cabut status sitaan untuk ${company.name} (${company.symbol})? Kendali manajemen akan dikembalikan.`)) return;
    try {
      setLoadingSeize(company.id);
      await actions.unseizeCompany(company.id);
    } catch (err) {
      alert(`❌ Gagal mencabut sitaan: ${err.message}`);
    } finally {
      setLoadingSeize(null);
    }
  };

  const handleToggleBumf = async (company) => {
    const msg = company.is_bumn
      ? `Cabut status Badan Usaha Milik Federasi (BUMF) dari ${company.name}?`
      : `Konversi ${company.name} (${company.symbol}) menjadi BUMF Federasi (Saham Milik Negara)?`;
    if (!window.confirm(msg)) return;
    try {
      await actions.convertBumn(company.id);
    } catch (err) {
      alert(`❌ Gagal mengubah status BUMF: ${err.message}`);
    }
  };

  const sectors = Array.from(new Set((companies || []).map((c) => c.sector).filter(Boolean)));

  const filteredAndSorted = useMemo(() => {
    const list = (companies || []).filter((c) => {
      const matchesSearch =
        !search ||
        (c.symbol && c.symbol.toLowerCase().includes(search.toLowerCase())) ||
        (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
        (c.owner_username && c.owner_username.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'NORMAL' && !c.is_uma && !c.is_suspended && !c.is_seized) ||
        (statusFilter === 'UMA' && c.is_uma) ||
        (statusFilter === 'SUSPENDED' && c.is_suspended) ||
        (statusFilter === 'SEIZED' && c.is_seized) ||
        (statusFilter === 'BUMF' && c.is_bumn);

      const matchesSector = sectorFilter === 'ALL' || c.sector === sectorFilter;

      return matchesSearch && matchesStatus && matchesSector;
    });

    return list.sort((a, b) => {
      if (sortBy === 'PRICE_DESC') {
        return (Number(b.current_price) || 0) - (Number(a.current_price) || 0);
      }
      if (sortBy === 'PRICE_ASC') {
        return (Number(a.current_price) || 0) - (Number(b.current_price) || 0);
      }
      if (sortBy === 'MARKET_CAP_DESC') {
        const mcA = (Number(a.current_price) || 0) * (Number(a.total_shares) || 0);
        const mcB = (Number(b.current_price) || 0) * (Number(b.total_shares) || 0);
        return mcB - mcA;
      }
      if (sortBy === 'CHANGE_DESC') {
        return changePct(b) - changePct(a);
      }
      if (sortBy === 'SYMBOL_ASC') {
        return (a.symbol || '').localeCompare(b.symbol || '');
      }
      return 0;
    });
  }, [companies, search, statusFilter, sectorFilter, sortBy]);

  return (
    <div className="space-y-5 page-enter">
      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Emiten Tercatat"
          value={companies?.length || 0}
          hint="Portofolio Bursa IPMC"
          icon={Building2}
          tone="sky"
        />
        <StatCard
          label="Status Normal"
          value={(companies || []).filter((c) => !c.is_uma && !c.is_suspended && !c.is_seized).length}
          hint="Perdagangan Reguler Aktif"
          icon={CheckCircle}
          tone="emerald"
        />
        <StatCard
          label="Radar UMA / Suspensi"
          value={(companies || []).filter((c) => c.is_uma || c.is_suspended).length}
          hint="Volatilitas Tidak Wajar"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Saham Gorengan (> 20k)"
          value={overpricedCount}
          hint="Perlu Intervensi Normalisasi"
          icon={Zap}
          tone={overpricedCount > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* 2. Companies Directory Table (High-Density Bloomberg Terminal View) */}
      <Card>
        <CardHeader
          title="Direktori Emiten & Intervensi Regulasi Bursa"
          subtitle="Kendali terpadu saham emiten, normalisasi manipulasi harga, sita eksekusi PNAF, dan manajemen kuotasi bursa"
          icon={Building2}
          tone="var(--sky)"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              {overpricedCount > 0 && (
                <Button
                  variant="rose"
                  size="xs"
                  icon={Zap}
                  onClick={() => setShowBatchModal(true)}
                  title="Stabilkan dan normalisasi seluruh saham gorengan di atas IB 20.000 sekaligus!"
                >
                  ⚡ Normalisasi Saham Gorengan ({overpricedCount})
                </Button>
              )}
              <Button
                variant="amber"
                size="xs"
                icon={RefreshCw}
                onClick={() => actions.rolloverMarket()}
                title="Buka Sesi Perdagangan Baru (Reset Batas ARA/ARB)"
              >
                Buka Sesi Baru Bursa
              </Button>
            </div>
          }
        />

        {/* Compact Filters & Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 mb-3 pb-3 border-b border-slate-800/80">
          <div className="sm:col-span-4">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Cari simbol, nama perseroan, pemilik..."
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="select text-xs py-1.5 px-2.5 bg-slate-900 border-slate-800 rounded-lg w-full text-slate-200"
            >
              <option value="ALL">Semua Sektor ({sectors.length})</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select text-xs py-1.5 px-2.5 bg-slate-900 border-slate-800 rounded-lg w-full text-slate-200"
            >
              <option value="ALL">Semua Status Pengawasan</option>
              <option value="NORMAL">Normal</option>
              <option value="UMA">Radar UMA</option>
              <option value="SUSPENDED">Disuspensi</option>
              <option value="SEIZED">Disita Negara (PNAF)</option>
              <option value="BUMF">BUMF Federasi</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="select text-xs py-1.5 px-2.5 bg-slate-900 border-slate-800 rounded-lg w-full text-amber-300 font-medium"
            >
              <option value="PRICE_DESC">⚡ Harga: Tertinggi</option>
              <option value="PRICE_ASC">Harga: Terendah</option>
              <option value="MARKET_CAP_DESC">💎 Market Cap Terbesar</option>
              <option value="CHANGE_DESC">📈 Perubahan % Tertinggi</option>
              <option value="SYMBOL_ASC">🔤 Simbol (A-Z)</option>
            </select>
          </div>
        </div>

        {filteredAndSorted.length === 0 ? (
          <EmptyState
            title="Tidak Ada Emiten Ditemukan"
            description={
              search
                ? `Tidak ditemukan emiten yang sesuai kriteria pencarian "${search}"`
                : 'Belum ada emiten yang terdaftar di bursa.'
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800/80">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-900/90 text-[11px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 min-w-[190px]">Emiten & Pemilik</th>
                  <th className="py-2.5 px-2.5 w-24">Sektor</th>
                  <th className="py-2.5 px-2.5 text-right w-28">Harga / Lot</th>
                  <th className="py-2.5 px-2 text-right w-20">24 Jam</th>
                  <th className="py-2.5 px-2.5 text-right w-24">Market Cap</th>
                  <th className="py-2.5 px-2.5 text-center w-28">Status</th>
                  <th className="py-2.5 px-2 w-36">Bot Algoritma</th>
                  <th className="py-2.5 px-3 text-right min-w-[280px]">Tindakan Otoritas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-normal">
                {filteredAndSorted.map((c) => {
                  const chg = changePct(c);
                  const price = Number(c.current_price) || 0;
                  const lotVal = price * 100;
                  const marketCap = price * (Number(c.total_shares) || 0);
                  const isOverblown = price >= 20000;

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-800/30 transition-colors ${
                        isOverblown ? 'bg-rose-950/15' : ''
                      }`}
                    >
                      {/* Emiten & Pemilik */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 text-[13px] tracking-wide font-mono">
                            {c.symbol}
                          </span>
                          {isOverblown && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                              PUMPED!
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-500">#{c.id.slice(0, 6)}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium truncate max-w-[200px]" title={c.name}>
                          {c.name}
                        </div>
                        <div className="text-[10px] flex items-center gap-1 mt-0.5">
                          {c.owner_username ? (
                            <span className="text-amber-400 font-medium flex items-center gap-0.5">
                              <User size={9} /> @{c.owner_username}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">🤖 Publik Bursa</span>
                          )}
                        </div>
                      </td>

                      {/* Sektor */}
                      <td className="py-2 px-2.5">
                        <span className="text-[10px] text-slate-300 font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-800/90 whitespace-nowrap">
                          {c.sector || 'Umum'}
                        </span>
                      </td>

                      {/* Harga / Lot */}
                      <td className="py-2 px-2.5 text-right font-mono">
                        <div className={`font-bold ${isOverblown ? 'text-rose-400 text-[13px]' : 'text-slate-100'}`}>
                          {ib(price)}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          1 Lot = {ibShort(lotVal)}
                        </div>
                      </td>

                      {/* Perubahan 24 Jam */}
                      <td className="py-2 px-2 text-right font-mono font-bold">
                        <span className={chg >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {signedPct(chg)}
                        </span>
                      </td>

                      {/* Market Cap */}
                      <td className="py-2 px-2.5 text-right font-mono text-slate-300">
                        {ibShort(marketCap)}
                      </td>

                      {/* Status Bursa */}
                      <td className="py-2 px-2.5 text-center">
                        {c.is_seized ? (
                          <Badge tone="rose" pulse>⚖️ DISITA</Badge>
                        ) : c.is_bumn ? (
                          <Badge tone="sky">🏛️ BUMF</Badge>
                        ) : c.is_suspended ? (
                          <Badge tone="rose" pulse>🔒 SUSPENSI</Badge>
                        ) : c.is_uma ? (
                          <Badge tone={c.uma_direction === 'DOWN' ? 'rose' : 'emerald'}>
                            {c.uma_direction === 'DOWN' ? 'UMA ▼' : 'UMA ▲'}
                          </Badge>
                        ) : (
                          <Badge tone="emerald">NORMAL</Badge>
                        )}
                      </td>

                      {/* Algoritma Bot Market Maker */}
                      <td className="py-2 px-2">
                        <select
                          value={c.bot_status || 'MODERATE'}
                          onChange={(e) => actions.setBotStatus(c.id, e.target.value)}
                          className="select text-[10px] py-1 px-1.5 bg-slate-900 border-slate-800 rounded w-full text-slate-200"
                        >
                          {BOT_STATUSES.map((b) => (
                            <option key={b.value} value={b.value}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Kolom Aksi Terpadu & Rapi */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-nowrap">
                          {/* 1. Tombol Normalisasi Intervensi Harga (Selalu Mudah Dijangkau) */}
                          <Button
                            variant={isOverblown ? "rose" : "amber"}
                            size="xs"
                            icon={Zap}
                            onClick={() => handleOpenNormalize(c)}
                            title="Normalisasi harga manipulasi goreng saham ke nilai fundamental wajar"
                          >
                            Normalisasi
                          </Button>

                          {/* 2. Suspensi */}
                          {c.is_suspended ? (
                            <Button
                              variant="emerald"
                              size="xs"
                              icon={Unlock}
                              onClick={() => actions.liftSuspension(c.id)}
                              title="Buka kembali suspensi perdagangan saham"
                            >
                              Buka
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={Ban}
                              onClick={() =>
                                actions.suspend(
                                  c.id,
                                  new Date(Date.now() + 86400000).toISOString(),
                                  'Suspensi cepat otoritas bursa'
                                )
                              }
                              title="Bekukan perdagangan saham sementara"
                            >
                              Bekukan
                            </Button>
                          )}

                          {/* 3. Sita Negara */}
                          {c.is_seized ? (
                            <Button
                              variant="emerald"
                              size="xs"
                              icon={Landmark}
                              onClick={() => handleUnseize(c)}
                              disabled={loadingSeize === c.id}
                              title="Cabut status sitaan dan pulihkan emiten"
                            >
                              Cabut
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="xs"
                              icon={Gavel}
                              onClick={() => handleOpenSeize(c)}
                              disabled={loadingSeize === c.id}
                              title="Sita perseroan oleh PNAF & Kurator Negara"
                            >
                              Sita
                            </Button>
                          )}

                          {/* 4. BUMF */}
                          <Button
                            variant={c.is_bumn ? "sky" : "ghost"}
                            size="xs"
                            onClick={() => handleToggleBumf(c)}
                            title={c.is_bumn ? "Cabut status BUMF Federasi" : "Jadikan BUMF Federasi (Saham Milik Negara)"}
                          >
                            {c.is_bumn ? "BUMF" : "+BUMF"}
                          </Button>

                          {/* 5. Hapus PT */}
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={Trash2}
                            onClick={() => {
                              setDeleteModalCompany(c);
                              setDeleteConfirmText('');
                            }}
                            title="Hapus perusahaan dan seluruh saham investor permanen"
                          >
                            Hapus
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: INTERVENSI REGULASI & NORMALISASI HARGA MANIPULASI SAHAM        */}
      {/* ========================================================================= */}
      <Modal
        open={Boolean(normalizeModalCompany)}
        onClose={() => setNormalizeModalCompany(null)}
        title="⚡ Intervensi Regulasi: Normalisasi Harga Manipulasi Saham"
        subtitle={`Mengatur penurunan paksa harga saham gorengan ${normalizeModalCompany?.symbol} ke level fundamental wajar`}
        icon={Zap}
        tone="var(--rose)"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setNormalizeModalCompany(null)} disabled={isNormalizing}>
              Batal
            </Button>
            <Button
              variant="rose"
              onClick={handleConfirmNormalize}
              disabled={isNormalizing}
              icon={Zap}
            >
              {isNormalizing ? 'Mengeksekusi Normalisasi...' : '⚡ Eksekusi Normalisasi Harga'}
            </Button>
          </div>
        }
      >
        {normalizeModalCompany && (
          <form onSubmit={handleConfirmNormalize} className="space-y-4 text-xs">
            {/* Info Rincian Saham */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-slate-100 text-sm">
                    {normalizeModalCompany.name} ({normalizeModalCompany.symbol})
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Pemilik / Founder: <span className="text-amber-400 font-semibold">{normalizeModalCompany.owner_username || 'Publik Bursa'}</span>
                  </div>
                </div>
                <Badge tone={Number(normalizeModalCompany.current_price) >= 20000 ? "rose" : "amber"}>
                  {Number(normalizeModalCompany.current_price) >= 20000 ? "GORENGAN EKSTREM" : "OVERBOUGHT"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">Harga Terakhir di Pasar:</span>
                  <span className="text-rose-400 font-bold text-sm">{ib(normalizeModalCompany.current_price)}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Estimasi Nilai Fundamental:</span>
                  <span className="text-emerald-400 font-bold text-sm">IB 2.000 - 3.500</span>
                </div>
              </div>
            </div>

            {/* Input Target Harga Intervensi */}
            <FormField label="Target Harga Wajar Hasil Normalisasi (IB / Lembar)">
              <div className="relative">
                <input
                  type="number"
                  min="50"
                  max="15000"
                  step="25"
                  value={targetNormPrice}
                  onChange={(e) => setTargetNormPrice(Math.max(50, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-mono">
                  1 Lot = {ib(targetNormPrice * 100)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Rekomendasi Otoritas Bursa: Gunakan kisaran <strong>IB 2.000 - 5.000</strong> agar valuasi kembali mencerminkan kondisi riil perseroan.
              </p>
            </FormField>

            {/* Checkbox Penindakan Pelaku & Sita */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seizeManipulator}
                  onChange={(e) => setSeizeManipulator(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-rose-500"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">
                    ⚖️ Sita Perseroan oleh Otoritas Bursa & PNAF (Manipulasi Pasar)
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Manajemen perseroan dibekukan dan dialihkan ke Kurator Negara. Status diubah menjadi CRITICAL.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyHaircutNotice}
                  onChange={(e) => setApplyHaircutNotice(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded bg-slate-950 border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">
                    📢 Terapkan Haircut Spekulan & Kirimkan Surat Resmi ke Seluruh Investor
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Investor yang membeli di pucuk akan menanggung haircut kerugian penurunan harga wajar. Jumlah lembar lot tetap utuh.
                  </span>
                </div>
              </label>
            </div>

            {/* Alasan Resmi Regulasi */}
            <FormField label="Alasan Resmi Penindakan & Siaran Berita Bursa">
              <Textarea
                value={normReason}
                onChange={(e) => setNormReason(e.target.value)}
                rows={2}
                placeholder="Ketik dasar pertimbangan normalisasi..."
                required
              />
            </FormField>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
              <strong>Efek Pasar:</strong> Seluruh order antrean beli/jual yang harganya tidak wajar akan dibersihkan dan dana dikembalikan. Berita resmi penindakan bursa akan disiarkan ke seluruh pemain secara real-time.
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: NORMALISASI MASSAL SAHAM GORENGAN (> IB 20.000)                  */}
      {/* ========================================================================= */}
      <Modal
        open={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        title="⚡ Operasi Stabilisasi Bursa: Normalisasi Massal Saham Gorengan"
        subtitle={`Membersihkan gelembung harga manipulatif pada seluruh emiten dengan lonjakan ekstrem (> IB ${batchThreshold.toLocaleString('id-ID')})`}
        icon={Zap}
        tone="var(--rose)"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setShowBatchModal(false)} disabled={isBatchNormalizing}>
              Batal
            </Button>
            <Button
              variant="rose"
              onClick={handleConfirmBatchNormalize}
              disabled={isBatchNormalizing}
              icon={Zap}
            >
              {isBatchNormalizing ? 'Mengeksekusi Operasi...' : `⚡ Normalisasi Semua Saham (> ${ibShort(batchThreshold)})`}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleConfirmBatchNormalize} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1.5">
            <div className="font-bold text-sm text-rose-200">
              Terdeteksi {overpricedCount} Saham Memenuhi Kriteria Gorengan Ekstrem!
            </div>
            <p className="text-[11px] text-slate-300">
              Operasi ini akan memindai seluruh emiten yang harganya melampaui batas wajar fundamental, memotong antrean manipulasi, dan mengembalikan harga pasar ke titik ekuilibrium sehat.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Ambang Batas Harga Gorengan (IB)">
              <Input
                type="number"
                min="5000"
                step="1000"
                value={batchThreshold}
                onChange={(e) => setBatchThreshold(Number(e.target.value))}
                required
              />
            </FormField>

            <FormField label="Target Harga Wajar Fundamental (IB)">
              <Input
                type="number"
                min="500"
                max="8000"
                step="100"
                value={batchFairPrice}
                onChange={(e) => setBatchFairPrice(Number(e.target.value))}
                required
              />
            </FormField>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={batchSeize}
                onChange={(e) => setBatchSeize(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded bg-slate-950 border-slate-700 text-rose-500 focus:ring-rose-500"
              />
              <div>
                <span className="font-semibold text-slate-200 block">
                  ⚖️ Sita Sekaligus Seluruh Emiten Terkait (PNAF & Pengawas Bursa)
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Jika dicentang, emiten yang dinormalisasi akan diberi status SITA EKSEKUSI PNAF.
                </span>
              </div>
            </label>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: SITA PERUSAHAAN EKSEKUSI NEGARA (PNAF)                           */}
      {/* ========================================================================= */}
      <Modal
        open={Boolean(seizeModalCompany)}
        onClose={() => setSeizeModalCompany(null)}
        title="Eksekusi Sita Perseroan (PNAF & BIF)"
        subtitle={`Penyitaan penuh perseroan ${seizeModalCompany?.name} (${seizeModalCompany?.symbol}) ke kedaulatan negara`}
        icon={Gavel}
        tone="var(--rose)"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setSeizeModalCompany(null)} disabled={submittingSeize}>
              Batal
            </Button>
            <Button
              variant="rose"
              onClick={handleConfirmSeize}
              disabled={submittingSeize}
              icon={Gavel}
            >
              {submittingSeize ? 'Mengeksekusi Sitaan...' : 'Ketuk Palu Sita Perseroan'}
            </Button>
          </div>
        }
      >
        {seizeModalCompany && (
          <form onSubmit={handleConfirmSeize} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <div className="font-bold text-slate-100 text-sm">{seizeModalCompany.name} ({seizeModalCompany.symbol})</div>
              <div className="text-slate-400">
                Pemilik / Founder: <span className="text-amber-400 font-semibold">{seizeModalCompany.owner_username || 'Publik Bursa'}</span>
              </div>
              <div className="text-slate-400">
                Harga Saham Terakhir: <span className="font-mono text-slate-200 font-bold">{ib(seizeModalCompany.current_price)}</span>
              </div>
            </div>

            <FormField label="Dasar Hukum & Alasan Penyitaan">
              <Select value={seizeReasonPreset} onChange={(e) => setSeizeReasonPreset(e.target.value)}>
                <option value="Gagal bayar kredit sindikasi BIF & Eksekusi PNAF">
                  Gagal bayar kredit sindikasi BIF & Eksekusi PNAF
                </option>
                <option value="Pelanggaran Regulasi Bursa & Dugaan Manipulasi Pasar">
                  Pelanggaran Regulasi Bursa & Dugaan Manipulasi Pasar
                </option>
                <option value="Kepailitan Likuiditas & Insolvensi Finansial">
                  Kepailitan Likuiditas & Insolvensi Finansial
                </option>
                <option value="CUSTOM">Alasan Khusus Lainnya</option>
              </Select>
            </FormField>

            {seizeReasonPreset === 'CUSTOM' && (
              <FormField label="Rincian Alasan Resmi">
                <Textarea
                  value={seizeCustomReason}
                  onChange={(e) => setSeizeCustomReason(e.target.value)}
                  rows={2}
                  placeholder="Ketikkan dasar pertimbangan penyitaan eksekusi..."
                  required
                />
              </FormField>
            )}

            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 leading-relaxed">
              <strong>Peringatan Hukum:</strong> Penyitaan ini akan membekukan dividen ke pemilik lama, mengalihkan kendali manajemen ke Kurator Negara, dan menyita pendapatan perseroan ke Kas Kedaulatan Negara.
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: HAPUS PERUSAHAAN PERMANEN (WAJIB KETIK HAPUS)                   */}
      {/* ========================================================================= */}
      <Modal
        open={Boolean(deleteModalCompany)}
        onClose={() => {
          setDeleteModalCompany(null);
          setDeleteConfirmText('');
        }}
        title="⚠️ Konfirmasi Hapus Perusahaan Permanen"
      >
        <div className="space-y-4 text-xs text-slate-300">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-1.5">
            <p className="font-bold text-sm text-rose-200">
              Tindakan ini tidak dapat dibatalkan!
            </p>
            <p>
              Menghapus emiten <strong className="text-white font-mono">{deleteModalCompany?.symbol} ({deleteModalCompany?.name})</strong> akan:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>Menghapus seluruh saham yang dipegang investor/pemain dari portofolio bursa.</li>
              <li>Membatalkan seluruh antrean limit order bursa yang aktif.</li>
              <li>Menghapus seluruh riwayat pergerakan harga dan catatan IPO.</li>
              <li>Jika emiten ini PT Utama pemain, entitas akan dialihkan ke anak perusahaan atau di-reset.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-400">
              Ketik kata <strong className="text-rose-400 font-mono">HAPUS</strong> untuk mengonfirmasi:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Ketik HAPUS di sini..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 font-mono text-sm focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeleteModalCompany(null);
                setDeleteConfirmText('');
              }}
            >
              Batal
            </Button>
            <Button
              variant="rose"
              size="sm"
              icon={Trash2}
              disabled={deleteConfirmText !== 'HAPUS' || isDeleting}
              onClick={handleConfirmDeleteCompany}
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus Perusahaan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
