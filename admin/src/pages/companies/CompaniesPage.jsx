import { useState } from 'react';
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
  const [loadingSeize, setLoadingSeize] = useState(null);

  // Modal State: Sita Perusahaan
  const [seizeModalCompany, setSeizeModalCompany] = useState(null);
  const [seizeReasonPreset, setSeizeReasonPreset] = useState('Gagal bayar kredit sindikasi BIF & Eksekusi PNAF');
  const [seizeCustomReason, setSeizeCustomReason] = useState('');
  const [submittingSeize, setSubmittingSeize] = useState(false);

  // Modal State: Hapus Perusahaan Permanen
  const [deleteModalCompany, setDeleteModalCompany] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const filtered = (companies || []).filter((c) => {
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

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          label="Radar UMA"
          value={(companies || []).filter((c) => c.is_uma).length}
          hint="Volatilitas Tidak Wajar"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Disita / BUMF"
          value={(companies || []).filter((c) => c.is_seized || c.is_bumn).length}
          hint="Eksekusi Hukum & Negara"
          icon={Landmark}
          tone="rose"
        />
      </div>

      {/* 2. Companies Directory Table */}
      <Card>
        <CardHeader
          title="Direktori Emiten & Pengawasan Korporasi"
          subtitle="Daftar emiten tercatat, struktur kepemilikan, kapitalisasi pasar, dan intervensi algoritma market maker"
          icon={Building2}
          tone="var(--sky)"
          action={
            <Button
              variant="amber"
              size="xs"
              icon={RefreshCw}
              onClick={() => actions.rolloverMarket()}
              title="Buka Sesi Perdagangan Baru (Reset Batas ARA/ARB)"
            >
              Buka Sesi Baru Bursa
            </Button>
          }
        />

        {/* Responsive Search & Filter Controls (Mobile-Friendly, Never Overlaps!) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-800/60">
          <div className="w-full sm:max-w-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Cari simbol, nama, konglomerat..."
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="select text-xs py-2 px-3 bg-slate-900 border-slate-800 rounded-xl w-full sm:w-auto text-slate-200"
            >
              <option value="ALL">Semua Sektor ({sectors.length})</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select text-xs py-2 px-3 bg-slate-900 border-slate-800 rounded-xl w-full sm:w-auto text-slate-200"
            >
              <option value="ALL">Semua Status Pengawasan</option>
              <option value="NORMAL">Normal</option>
              <option value="UMA">Radar UMA</option>
              <option value="SUSPENDED">Disuspensi</option>
              <option value="SEIZED">Disita Negara (PNAF)</option>
              <option value="BUMF">BUMF Federasi</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak Ada Emiten Ditemukan"
            description={
              search
                ? `Tidak ditemukan emiten yang sesuai kriteria pencarian "${search}"`
                : 'Belum ada emiten yang terdaftar di bursa.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Emiten & Pemilik</th>
                  <th>Sektor</th>
                  <th>Harga Saat Ini</th>
                  <th>Perubahan 24 Jam</th>
                  <th>Kapitalisasi Pasar</th>
                  <th>Status Bursa</th>
                  <th>Algoritma Bot Market Maker</th>
                  <th className="right">Tindakan Otoritas</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const chg = changePct(c);
                  const marketCap = (Number(c.current_price) || 0) * (Number(c.total_shares) || 0);

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{c.symbol}</span>
                          <span className="text-[10px] font-mono text-slate-500">#{c.id.slice(0, 8)}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium truncate max-w-[200px] mt-0.5">
                          {c.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          {c.owner_username ? (
                            <span className="text-amber-400 flex items-center gap-0.5 font-semibold">
                              <User size={10} /> Milik {c.owner_username}
                            </span>
                          ) : (
                            <span className="text-slate-500">🤖 Publik / Bursa</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="text-xs text-slate-300 font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                          {c.sector || 'Umum'}
                        </span>
                      </td>

                      <td className="num font-bold text-slate-200">
                        {ib(c.current_price)}
                      </td>

                      <td className="num font-bold">
                        <span className={chg >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {signedPct(chg)}
                        </span>
                      </td>

                      <td className="num text-slate-300 font-mono">
                        {ibShort(marketCap)}
                      </td>

                      <td>
                        {c.is_seized ? (
                          <Badge tone="rose" pulse>⚖️ DISITA NEGARA</Badge>
                        ) : c.is_bumn ? (
                          <Badge tone="sky">🏛️ BUMF FEDERASI</Badge>
                        ) : c.is_suspended ? (
                          <Badge tone="rose" pulse>SUSPENSI</Badge>
                        ) : c.is_uma ? (
                          <Badge tone={c.uma_direction === 'DOWN' ? 'rose' : 'emerald'}>
                            {c.uma_direction === 'DOWN' ? 'UMA TURUN ▼' : 'UMA NAIK ▲'}
                          </Badge>
                        ) : (
                          <Badge tone="emerald">NORMAL</Badge>
                        )}
                      </td>

                      <td>
                        <select
                          value={c.bot_status || 'MODERATE'}
                          onChange={(e) => actions.setBotStatus(c.id, e.target.value)}
                          className="select text-[11px] py-1 px-2 bg-slate-900 border-slate-800 rounded-lg max-w-[170px] text-slate-200 focus:border-sky-500"
                        >
                          {BOT_STATUSES.map((b) => (
                            <option key={b.value} value={b.value}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Tombol BUMF Federasi */}
                          <Button
                            variant={c.is_bumn ? "sky" : "ghost"}
                            size="xs"
                            onClick={() => handleToggleBumf(c)}
                            title={c.is_bumn ? "Cabut status BUMF Federasi" : "Jadikan BUMF Federasi"}
                          >
                            {c.is_bumn ? "BUMF" : "+BUMF"}
                          </Button>

                          {/* Tombol Sita / Cabut Sitaan Negara */}
                          {c.is_seized ? (
                            <Button
                              variant="emerald"
                              size="xs"
                              icon={Landmark}
                              onClick={() => handleUnseize(c)}
                              disabled={loadingSeize === c.id}
                            >
                              Cabut Sita
                            </Button>
                          ) : (
                            <Button
                              variant="rose"
                              size="xs"
                              icon={Gavel}
                              onClick={() => handleOpenSeize(c)}
                              disabled={loadingSeize === c.id}
                            >
                              Sita PT
                            </Button>
                          )}

                          {/* Suspensi */}
                          {c.is_suspended ? (
                            <Button
                              variant="emerald"
                              size="xs"
                              icon={Unlock}
                              onClick={() => actions.liftSuspension(c.id)}
                            >
                              Buka Suspensi
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
                            >
                              Bekukan
                            </Button>
                          )}

                          {/* UMA */}
                          {c.is_uma ? (
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => actions.clearUma(c.id)}
                            >
                              Hapus UMA
                            </Button>
                          ) : (
                            <Button
                              variant="amber"
                              size="xs"
                              onClick={() =>
                                actions.flagUma(
                                  c.id,
                                  'Penetapan UMA cepat oleh admin otoritas bursa',
                                  chg >= 0 ? 'UP' : 'DOWN'
                                )
                              }
                            >
                              Beri UMA
                            </Button>
                          )}

                          {/* Hapus Perusahaan Permanen */}
                          <Button
                            variant="rose"
                            size="xs"
                            icon={Trash2}
                            onClick={() => {
                              setDeleteModalCompany(c);
                              setDeleteConfirmText('');
                            }}
                            title="Hapus perusahaan dan seluruh saham investor permanen"
                          >
                            Hapus PT
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

      {/* Modal: Sita Perusahaan Eksekusi Negara */}
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

      {/* Modal: Hapus Perusahaan Permanen (Wajib Ketik HAPUS) */}
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
