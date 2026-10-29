import { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import { FormField, Input, Select } from '../../components/ui/Form';
import SeizeAssetModal from './SeizeAssetModal';
import { ib, ibShort, dateTime } from '../../lib/format';
import { adminApi } from '../../api/admin';
import {
  Landmark,
  Percent,
  TrendingDown,
  AlertOctagon,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Clock,
  Coins,
  RotateCcw,
  HeartHandshake,
} from 'lucide-react';

export default function BankCentralPage() {
  const { bank, actions, toast } = useAdmin();
  const [rateInput, setRateInput] = useState(bank?.interest_rate ?? 5.5);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [isInjectingQE, setIsInjectingQE] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLoanForSeizure, setSelectedLoanForSeizure] = useState(null);

  // Pilar 4: Pemutihan Denda & Restrukturisasi
  const [isMassWaiverLoading, setIsMassWaiverLoading] = useState(false);
  const [selectedLoanForRestructure, setSelectedLoanForRestructure] = useState(null);
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [restructureForm, setRestructureForm] = useState({
    extensionDays: '14',
    haircutPct: '25',
    newInterestRate: '2.5',
  });

  useEffect(() => {
    if (bank?.interest_rate != null && bank.interest_rate > 0) {
      setRateInput(bank.interest_rate);
    }
  }, [bank?.interest_rate]);

  const currentRate = bank?.interest_rate ?? 5.5;

  const handleApplyRate = async () => {
    setIsUpdatingRate(true);
    await actions.setRate(Number(rateInput));
    setIsUpdatingRate(false);
  };

  const handleQE = async () => {
    setIsInjectingQE(true);
    await actions.liquidityInjection();
    setIsInjectingQE(false);
  };

  const handleMassPenaltyWaiver = async () => {
    if (!window.confirm('Apakah Anda yakin ingin mengeksekusi Pemutihan Denda Bunga Nasional? Seluruh penalti bunga debitur macet akan dihapuskan dan tenor diperpanjang +7 hari.')) {
      return;
    }
    setIsMassWaiverLoading(true);
    try {
      const res = await adminApi.massPenaltyWaiver();
      toast?.success(res.message);
      actions.refreshOverview();
    } catch (err) {
      toast?.error(err.message || 'Gagal mengeksekusi pemutihan denda');
    } finally {
      setIsMassWaiverLoading(false);
    }
  };

  const handleRestructureSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLoanForRestructure) return;
    setIsRestructuring(true);
    try {
      const res = await adminApi.restructureLoan({
        loanId: selectedLoanForRestructure.id,
        extensionDays: restructureForm.extensionDays,
        haircutPct: restructureForm.haircutPct,
        newInterestRate: restructureForm.newInterestRate,
      });
      toast?.success(res.message);
      setSelectedLoanForRestructure(null);
      actions.refreshOverview();
    } catch (err) {
      toast?.error(err.message || 'Gagal merestrukturisasi kredit');
    } finally {
      setIsRestructuring(false);
    }
  };

  const loans = Array.isArray(bank?.loans) ? bank.loans : [];

  const filteredLoans = loans.filter((loan) => {
    const matchesSearch =
      !search ||
      (loan?.user_name && loan.user_name.toLowerCase().includes(search.toLowerCase())) ||
      (loan?.username && loan.username.toLowerCase().includes(search.toLowerCase())) ||
      (loan?.id && String(loan.id).includes(search));

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && loan?.status === 'ACTIVE') ||
      (statusFilter === 'PAID' && loan?.status === 'PAID') ||
      (statusFilter === 'DEFAULT' && (loan?.status === 'DEFAULT' || loan?.status === 'NPL'));

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Suku Bunga Acuan"
          value={`${currentRate}%`}
          hint="Kebijakan Moneter IPMC"
          icon={Percent}
          tone="emerald"
        />
        <StatCard
          label="Total Kredit Beredar"
          value={ibShort(bank?.total_outstanding || 0)}
          hint={`${loans.length} Pinjaman Terbit`}
          icon={Landmark}
          tone="gold"
        />
        <StatCard
          label="Total Kredit Lunas"
          value={ibShort(bank?.total_paid || 0)}
          hint="Pengembalian Pinjaman"
          icon={CheckCircle2}
          tone="sky"
        />
        <StatCard
          label="Debitur Macet (NPL)"
          value={bank?.npl_count || 0}
          hint="Perlu Eksekusi Sita Jaminan"
          icon={AlertOctagon}
          tone={bank?.npl_count > 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* 2. Monetary Policy & QE Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Suku Bunga Acuan Slider */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Instrumen Moneter: Suku Bunga Acuan (BI-Rate IPMC)"
            subtitle="Menentukan tingkat bunga harian fasilitas pinjaman likuiditas bagi seluruh konglomerat"
            icon={Percent}
            tone="var(--emerald)"
          />

          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  Tingkat Bunga Target:
                </span>
                <span className="text-2xl font-mono font-black text-emerald-400">
                  {rateInput}% <span className="text-xs font-normal text-slate-500">p.a.</span>
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.25"
                value={rateInput}
                onChange={(e) => setRateInput(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />

              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>0.5% (Ultra-Longgar)</span>
                <span>5.5% (Netral)</span>
                <span>15.0% (Ketat)</span>
                <span>25.0% (Ekstrem)</span>
              </div>

              {/* Preset Quick Chips */}
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">
                  Preset Skenario Moneter Cepat:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setRateInput(4.5)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                      rateInput === 4.5
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🌟 Boom: 4.5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateInput(6.5)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                      rateInput === 6.5
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🏛️ Normal: 6.5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateInput(9.5)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                      rateInput === 9.5
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚠️ Ketat: 9.5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateInput(18.0)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                      rateInput === 18.0
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🚨 Krisis Darurat: 18.0%
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="text-xs text-slate-400">
                Perubahan suku bunga langsung memicu broadcast realtime ke seluruh aplikasi pemain.
              </div>
              <Button
                variant="emerald"
                onClick={handleApplyRate}
                disabled={isUpdatingRate || rateInput === currentRate}
              >
                {isUpdatingRate ? 'Menyimpan...' : 'Terapkan Bunga Baru'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Suntik Likuiditas (QE) */}
        <Card className="bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-transparent border-amber-500/30">
          <CardHeader
            title="Operasi Pasar Terbuka (QE)"
            subtitle="Injeksi likuiditas darurat"
            icon={Coins}
            tone="var(--gold)"
          />

          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Injeksi likuiditas tunai ke bursa untuk memicu bot market maker menyerap antrian jual emiten yang terancam auto-reject bawah (ARB).
            </p>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Intervensi:</span>
                <span className="text-slate-200 font-semibold">Emiten Volatil & ARB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tipe Aksi:</span>
                <span className="text-amber-400 font-mono font-bold">Quantitative Easing</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <Button
                variant="primary"
                block
                onClick={handleQE}
                disabled={isInjectingQE}
                icon={Zap}
              >
                {isInjectingQE ? 'Memproses Intervensi...' : 'Injeksi Likuiditas Sekarang'}
              </Button>

              <Button
                variant="outline"
                block
                onClick={handleMassPenaltyWaiver}
                disabled={isMassWaiverLoading}
                icon={RotateCcw}
                className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs"
              >
                {isMassWaiverLoading ? 'Mengeksekusi...' : 'Pemutihan Denda Bunga Massal'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 3. Debtor & Loan Book Management */}
      <Card>
        <CardHeader
          title="Buku Fasilitas Kredit & Pengawasan Debitur"
          subtitle="Daftar seluruh pinjaman fasilitas bank sentral beserta status kelancaran pembayaran"
          icon={Landmark}
          tone="var(--sky)"
          action={
            <div className="flex items-center gap-2">
              <div className="w-48">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Cari debitur / ID..."
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-xl"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif (Berjalan)</option>
                <option value="PAID">Lunas (Paid)</option>
                <option value="DEFAULT">Macet (NPL / Default)</option>
              </select>
            </div>
          }
        />

        {filteredLoans.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Pinjaman"
            description={
              search
                ? `Tidak ditemukan pinjaman dengan kata kunci "${search}"`
                : 'Belum ada fasilitas pinjaman yang disalurkan oleh Bank Sentral IPMC.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table min-w-[860px]">
              <thead>
                <tr>
                  <th>Debitur</th>
                  <th>Pokok Pinjaman</th>
                  <th>Sisa Hutang</th>
                  <th>Bunga p.a.</th>
                  <th>Cicilan Harian</th>
                  <th>Status</th>
                  <th>Tanggal Akad</th>
                  <th className="right">Aksi Otoritas</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.map((loan) => {
                  const isDefault = loan.status === 'DEFAULT' || loan.status === 'NPL';
                  const isPaid = loan.status === 'PAID';
                  const isActive = loan.status === 'ACTIVE';

                  return (
                    <tr key={loan.id}>
                      <td>
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          {loan.user_name || loan.username || `Debitur #${loan.user_id}`}
                          {loan.credit_score > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-mono">
                              ⭐ {loan.credit_score}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {loan.pt_name || 'Konglomerat Terdaftar'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: {loan.id ? String(loan.id).slice(0, 12) : '-'}... • Agunan: {loan.collateral_type || 'Portofolio Saham'}
                        </div>
                      </td>

                      <td className="num font-bold text-slate-200">
                        {ib(loan.principal_ib || loan.principal_amount)}
                      </td>

                      <td className="num font-bold text-amber-300">
                        {ib(loan.remaining_debt_ib || loan.remaining_amount)}
                      </td>

                      <td className="num text-slate-300 font-mono">
                        {loan.interest_rate != null ? `${loan.interest_rate}%` : (loan.interest_rate_pct != null ? `${loan.interest_rate_pct}%` : `${currentRate}%`)}
                      </td>

                      <td className="num text-slate-300">
                        {ib(loan.daily_installment_ib)}
                      </td>

                      <td>
                        {isPaid && <Badge tone="emerald">LUNAS</Badge>}
                        {isActive && !loan.is_overdue && <Badge tone="sky">BERJALAN</Badge>}
                        {(isDefault || loan.is_overdue) && (
                          <Badge tone="rose" pulse>
                            MACET {loan.days_overdue > 0 ? `(${loan.days_overdue} Hari)` : '(NPL)'}
                          </Badge>
                        )}
                      </td>

                      <td className="text-xs text-slate-400">
                        {dateTime(loan.created_at)}
                      </td>

                      <td className="right">
                        {!isPaid && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedLoanForRestructure(loan);
                                setRestructureForm({
                                  extensionDays: '14',
                                  haircutPct: '25',
                                  newInterestRate: '2.5',
                                });
                              }}
                              icon={RotateCcw}
                              className="text-xs text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                            >
                              Restrukturisasi
                            </Button>
                            <Button
                              variant={isDefault || loan.is_overdue ? 'rose' : 'ghost'}
                              size="sm"
                              onClick={() => setSelectedLoanForSeizure(loan)}
                              icon={ShieldAlert}
                            >
                              Sita Jaminan
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal Sita Aset Jaminan */}
      <SeizeAssetModal
        open={Boolean(selectedLoanForSeizure)}
        onClose={() => setSelectedLoanForSeizure(null)}
        loan={selectedLoanForSeizure}
        onConfirm={actions.seizeDebtor}
      />

      {/* Modal Restrukturisasi Kredit Debitur (Pilar 4) */}
      <Modal
        isOpen={Boolean(selectedLoanForRestructure)}
        onClose={() => setSelectedLoanForRestructure(null)}
        title={`Restrukturisasi Kredit Debitur: ${selectedLoanForRestructure?.username || 'Debitur'}`}
      >
        <form onSubmit={handleRestructureSubmit} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Sisa Pokok Hutang:</span>
              <span className="font-bold text-amber-400">
                IB {Number(selectedLoanForRestructure?.remaining_amount || selectedLoanForRestructure?.remaining_debt_ib || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Debitur:</span>
              <span className="text-slate-200">{selectedLoanForRestructure?.username} ({selectedLoanForRestructure?.pt_name || 'PT'})</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Diskon Pokok (Haircut %)" hint="Subsidi potong utang dari Kas Negara">
              <Select
                value={restructureForm.haircutPct}
                onChange={(e) => setRestructureForm({ ...restructureForm, haircutPct: e.target.value })}
              >
                <option value="0">0% (Tanpa Potongan Pokok)</option>
                <option value="15">15% Diskon Pokok</option>
                <option value="25">25% Diskon Pokok (Rekomendasi)</option>
                <option value="50">50% Diskon Pokok (Bailout Pailit)</option>
              </Select>
            </FormField>

            <FormField label="Perpanjangan Tenor (Hari)" hint="Tambahan waktu jatuh tempo">
              <Select
                value={restructureForm.extensionDays}
                onChange={(e) => setRestructureForm({ ...restructureForm, extensionDays: e.target.value })}
              >
                <option value="7">+7 Hari Game</option>
                <option value="14">+14 Hari Game (Standar)</option>
                <option value="30">+30 Hari Game (Relaksasi Total)</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Suku Bunga Relaksasi Baru (% p.a.)" hint="Bunga ringan selama masa restrukturisasi">
            <Input
              type="number"
              step="0.5"
              min="0.5"
              max="15"
              value={restructureForm.newInterestRate}
              onChange={(e) => setRestructureForm({ ...restructureForm, newInterestRate: e.target.value })}
              className="font-mono text-emerald-300 font-bold"
            />
          </FormField>

          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 leading-relaxed">
            🤝 <strong>Dampak Pemulihan:</strong> Rekening perseroan debitur akan dipulihkan dari pembekuan (*unfrozen*), skor kredit dipulihkan +40 poin, dan denda keterlambatan dihapuskan.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setSelectedLoanForRestructure(null)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isRestructuring}>
              {isRestructuring ? 'Memproses...' : 'Terapkan Restrukturisasi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
