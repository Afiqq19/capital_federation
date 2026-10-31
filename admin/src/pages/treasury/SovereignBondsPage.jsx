import { useState, useEffect } from 'react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { FormField, Input, Select } from '../../components/ui/Form';
import { adminApi } from '../../api/admin';
import { useAdmin } from '../../context/AdminContext';
import {
  Landmark,
  Plus,
  Coins,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Percent,
} from 'lucide-react';

export default function SovereignBondsPage() {
  const { notify } = useAdmin();
  const toast = {
    success: (m) => notify?.(m, 'success'),
    error: (m) => notify?.(m, 'error'),
    info: (m) => notify?.(m, 'info'),
  };
  const [bonds, setBonds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Terbitkan Obligasi
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueForm, setIssueForm] = useState({
    bondCode: '',
    title: '',
    totalQuotaIb: '50000000000',
    couponRatePct: '7.5',
    tenorDays: '7',
    minOrderUnits: '5',
    maxOrderUnits: '500',
  });

  // Modal Pelunasan (Redeem)
  const [selectedBondForRedeem, setSelectedBondForRedeem] = useState(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const loadBonds = async (silent = false) => {
    if (silent !== true) setIsLoading(true);
    try {
      const data = await adminApi.bondsActive();
      setBonds(data || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat obligasi negara');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBonds(false);
  }, []);

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    setIsIssuing(true);
    try {
      const res = await adminApi.bondsIssue(issueForm);
      toast.success(res.message || 'Seri obligasi berhasil diterbitkan!');
      setIsIssueModalOpen(false);
      setIssueForm({
        bondCode: '',
        title: '',
        totalQuotaIb: '50000000000',
        couponRatePct: '7.5',
        tenorDays: '7',
        minOrderUnits: '5',
        maxOrderUnits: '500',
      });
      loadBonds(true);
    } catch (err) {
      toast.error(err.message || 'Gagal menerbitkan obligasi');
    } finally {
      setIsIssuing(false);
    }
  };

  const handleRedeemConfirm = async () => {
    if (!selectedBondForRedeem) return;
    setIsRedeeming(true);
    try {
      const res = await adminApi.bondsRedeem(selectedBondForRedeem.id);
      toast.success(res.message || 'Obligasi berhasil dilunasi!');
      setSelectedBondForRedeem(null);
      loadBonds(true);
    } catch (err) {
      toast.error(err.message || 'Gagal melunasi obligasi');
    } finally {
      setIsRedeeming(false);
    }
  };

  const totalAbsorbed = bonds.reduce((sum, b) => sum + (b.ordered_quota_ib || 0), 0);
  const totalQuota = bonds.reduce((sum, b) => sum + (b.total_quota_ib || 0), 0);
  const avgCoupon = bonds.length > 0 
    ? (bonds.reduce((sum, b) => sum + (b.coupon_rate_pct || 0), 0) / bonds.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6 page-enter pb-16">
      {/* 1. Header Banner */}
      <div className="card p-6 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0 shadow-lg shadow-amber-950/50">
            <Landmark size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-slate-100 tracking-tight">
                Surat Utang Negara & Obligasi Federasi (ORI & SBR)
              </h2>
              <Badge tone="gold">Pilar 1: Penyerapan Likuiditas</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
              Instrumen pengaman kedaulatan fiskal untuk menyerap uang menganggur dari kas pribadi konglomerat ke Brankas Kas Negara dengan imbal hasil kupon tetap per siklus waktu.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsIssueModalOpen(true)}
          className="shadow-lg shadow-amber-500/20 shrink-0"
        >
          Terbitkan Seri Baru
        </Button>
      </div>

      {/* 2. KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Dana Terserap"
          value={`IB ${(totalAbsorbed / 1000000000).toFixed(2)} M`}
          subValue={`Dari Total Kuota IB ${(totalQuota / 1000000000).toFixed(1)} M`}
          hint="Masuk langsung ke Brankas Kas Negara"
          icon={Coins}
          tone="gold"
        />
        <StatCard
          label="Rata-Rata Kupon Bunga"
          value={`${avgCoupon}% p.a.`}
          subValue="Dibayar tiap siklus 25 menit"
          hint="Dijamin 100% oleh Kas Negara Federasi"
          icon={Percent}
          tone="emerald"
        />
        <StatCard
          label="Jumlah Seri Aktif"
          value={`${bonds.filter(b => b.status === 'OPEN').length} Seri`}
          subValue={`Total ${bonds.length} Seri Terdaftar`}
          hint="Tersedia di tab Bank Sentral ponsel"
          icon={TrendingUp}
          tone="sky"
        />
      </div>

      {/* 3. Katalog Seri Obligasi */}
      <Card>
        <CardHeader
          title="Daftar Seri Surat Utang Negara Terdaftar"
          subtitle="Pantau daya serap kuota, jatuh tempo, dan status pelunasan kupon"
          icon={Landmark}
          tone="var(--gold)"
        />

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat katalog obligasi...</div>
        ) : bonds.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">Belum ada seri obligasi yang diterbitkan.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {bonds.map((bond) => {
              const absorbed = bond.ordered_quota_ib || 0;
              const quota = bond.total_quota_ib || 1;
              const pct = Math.min(100, (absorbed / quota) * 100);
              const isOpen = bond.status === 'OPEN';
              const isMatured = bond.status === 'MATURED';

              return (
                <div
                  key={bond.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black text-amber-400">
                          {bond.bond_code}
                        </span>
                        <Badge tone={isOpen ? 'emerald' : isMatured ? 'slate' : 'amber'}>
                          {bond.status}
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-200 mt-1">{bond.title}</h4>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400">Kupon Imbal Hasil</div>
                      <div className="font-mono text-lg font-black text-emerald-400">
                        {bond.coupon_rate_pct}% <span className="text-xs font-normal text-slate-400">p.a.</span>
                      </div>
                    </div>
                  </div>

                  {/* Quota Progress */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Penyerapan Kuota Emisi:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {pct.toFixed(1)}% (IB {(absorbed / 1000000000).toFixed(2)} M / {(quota / 1000000000).toFixed(1)} M)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Detail Info & Action */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                    <div>
                      <span>Tenor: </span>
                      <strong className="text-slate-200">{bond.tenor_days} Hari Game</strong>
                    </div>
                    <div>
                      <span>Harga/Unit: </span>
                      <strong className="text-slate-200 font-mono">IB {(bond.unit_price_ib || 1000000).toLocaleString('id-ID')}</strong>
                    </div>
                    <div>
                      <span>Jatuh Tempo: </span>
                      <strong className="text-slate-200">
                        {bond.maturity_date ? new Date(bond.maturity_date).toLocaleDateString('id-ID') : '-'}
                      </strong>
                    </div>
                    <div>
                      <span>Batas Order: </span>
                      <strong className="text-slate-200">{bond.min_order_units || 5} s/d {bond.max_order_units || 500} Unit</strong>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBondForRedeem(bond)}
                        className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
                      >
                        Lunasi Pokok (Redeem)
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Terbitkan Seri Baru */}
      <Modal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Terbitkan Seri Surat Utang Negara Baru"
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Kode Seri Obligasi" hint="Contoh: ORI-027, SBR-016">
              <Input
                type="text"
                placeholder="ORI-027"
                value={issueForm.bondCode}
                onChange={(e) => setIssueForm({ ...issueForm, bondCode: e.target.value })}
                required
                className="uppercase font-mono font-bold"
              />
            </FormField>

            <FormField label="Tingkat Kupon Bunga (% p.a.)" hint="Bunga kupon berkala">
              <Input
                type="number"
                step="0.1"
                min="1"
                max="25"
                placeholder="7.5"
                value={issueForm.couponRatePct}
                onChange={(e) => setIssueForm({ ...issueForm, couponRatePct: e.target.value })}
                required
                className="font-mono"
              />
            </FormField>
          </div>

          <FormField label="Nama / Judul Resmi Obligasi">
            <Input
              type="text"
              placeholder="Obligasi Republik Indigo Seri 027 (ORI-027)"
              value={issueForm.title}
              onChange={(e) => setIssueForm({ ...issueForm, title: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Total Kuota Emisi (IB)" hint="Maksimum dana terserap">
              <Input
                type="number"
                step="1000000000"
                value={issueForm.totalQuotaIb}
                onChange={(e) => setIssueForm({ ...issueForm, totalQuotaIb: e.target.value })}
                required
                className="font-mono"
              />
            </FormField>

            <FormField label="Jangka Waktu Tenor (Hari)" hint="Durasi hingga jatuh tempo">
              <Select
                value={issueForm.tenorDays}
                onChange={(e) => setIssueForm({ ...issueForm, tenorDays: e.target.value })}
              >
                <option value="3">3 Hari Game (Short Term)</option>
                <option value="7">7 Hari Game (Standar ORI)</option>
                <option value="14">14 Hari Game (Medium Term)</option>
                <option value="30">30 Hari Game (Long Term)</option>
              </Select>
            </FormField>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
            ℹ️ Begitu diterbitkan, seri ini otomatis muncul di tab Bank Sentral ponsel seluruh pemain dan breaking news bursa akan disiarkan.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsIssueModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isIssuing}>
              {isIssuing ? 'Menerbitkan...' : 'Terbitkan Sekarang'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Pelunasan Pokok (Redeem) */}
      <Modal
        isOpen={!!selectedBondForRedeem}
        onClose={() => setSelectedBondForRedeem(null)}
        title={`Pelunasan Pokok Seri ${selectedBondForRedeem?.bond_code}`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-300 leading-relaxed">
            Apakah Anda yakin ingin melunasi pokok investasi seri <strong>{selectedBondForRedeem?.bond_code}</strong>?
          </p>
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Dana Pokok yang Dikembalikan:</span>
              <span className="font-bold text-amber-400">
                IB {Number(selectedBondForRedeem?.ordered_quota_ib || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Sumber Pelunasan:</span>
              <span className="text-emerald-400">Brankas Kas Negara (Treasury)</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setSelectedBondForRedeem(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={isRedeeming}
              onClick={handleRedeemConfirm}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              {isRedeeming ? 'Memproses...' : 'Konfirmasi Pelunasan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
