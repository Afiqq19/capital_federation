import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Textarea, Select } from '../../components/ui/Form';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { changePct, signedPct } from '../../lib/format';

export default function FlagUmaModal({ open, onClose, companies, onConfirm }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [direction, setDirection] = useState('UP'); // 'UP' | 'DOWN'
  const [reason, setReason] = useState(
    'Peningkatan harga kumulatif dan volume transaksi di luar kebiasaan (Unusual Market Activity Lonjakan).'
  );
  const [submitting, setSubmitting] = useState(false);

  // Filter emiten yang belum berstatus UMA
  const availableCompanies = (companies || []).filter((c) => !c.uma_flag && !c.is_uma);

  const selectedCompany = availableCompanies.find((c) => String(c.id) === String(selectedCompanyId));

  const handleCompanyChange = (e) => {
    const id = e.target.value;
    setSelectedCompanyId(id);
    const comp = availableCompanies.find((c) => String(c.id) === String(id));
    if (comp) {
      const chg = changePct(comp);
      const isUp = chg >= 0;
      setDirection(isUp ? 'UP' : 'DOWN');
      setReason(
        isUp
          ? `Lonjakan kenaikan harga kumulatif (${signedPct(chg)}) dan volume transaksi di luar kebiasaan normal (Unusual Market Activity Bullish).`
          : `Penurunan anjlok harga kumulatif (${signedPct(chg)}) yang di luar kebiasaan normal (Unusual Market Activity Bearish).`
      );
    }
  };

  const handleDirectionChange = (newDir) => {
    setDirection(newDir);
    const comp = selectedCompany;
    const chg = comp ? changePct(comp) : (newDir === 'UP' ? 35 : -35);
    setReason(
      newDir === 'UP'
        ? `Lonjakan kenaikan harga kumulatif (${comp ? signedPct(chg) : '+35%'}) dan volume transaksi di luar kebiasaan normal (Unusual Market Activity Bullish).`
        : `Penurunan anjlok harga kumulatif (${comp ? signedPct(chg) : '-35%'}) yang di luar kebiasaan normal (Unusual Market Activity Bearish).`
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId) return;

    setSubmitting(true);
    await onConfirm(selectedCompanyId, reason, direction);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tetapkan Radar Peringatan UMA"
      subtitle="Keluarkan sinyal Unusual Market Activity resmi pada emiten terpilih"
      icon={AlertTriangle}
      tone="var(--amber)"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant={direction === 'UP' ? 'emerald' : 'rose'}
            onClick={handleSubmit}
            disabled={submitting || !selectedCompanyId}
          >
            {submitting ? 'Menerbitkan...' : `Terbitkan UMA (${direction === 'UP' ? 'Kenaikan ▲' : 'Penurunan ▼'})`}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle size={14} />
            Perhatian Regulasi: Perdagangan Saham Tetap Berjalan
          </p>
          <p className="text-slate-300 mt-1 leading-relaxed">
            Status UMA adalah penandaan resmi bursa bagi investor publik atas volatilitas ekstrem. Saham <strong>TIDAK dibekukan</strong> dan transaksi jual/beli tetap aktif.
          </p>
        </div>

        <FormField label="Pilih Emiten" hint="Hanya menampilkan saham yang belum berstatus UMA">
          <Select
            value={selectedCompanyId}
            onChange={handleCompanyChange}
            required
          >
            <option value="">-- Pilih Emiten Terpantau --</option>
            {availableCompanies.map((c) => {
              const chg = changePct(c);
              return (
                <option key={c.id} value={c.id}>
                  {c.symbol} - {c.name} (IB {c.current_price?.toLocaleString('id-ID')} | {signedPct(chg)})
                </option>
              );
            })}
          </Select>
        </FormField>

        {/* Pemilihan Kategori Volatilitas: Kenaikan vs Penurunan */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Klasifikasi Sinyal UMA
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleDirectionChange('UP')}
              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                direction === 'UP'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <TrendingUp size={18} />
              </div>
              <div>
                <div className="font-bold text-xs text-emerald-300">UMA Kenaikan (Surge)</div>
                <div className="text-[10px] text-slate-400">Lonjakan harga ekstrem</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleDirectionChange('DOWN')}
              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                direction === 'DOWN'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-200 shadow-md shadow-rose-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
                <TrendingDown size={18} />
              </div>
              <div>
                <div className="font-bold text-xs text-rose-300">UMA Penurunan (Crash)</div>
                <div className="text-[10px] text-slate-400">Anjlok tajam di luar batas</div>
              </div>
            </button>
          </div>
        </div>

        <FormField label="Alasan Penetapan Resmi" hint="Akan ditampilkan pada ticker bursa, kartu saham, dan siaran breaking news">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Tuliskan keterangan resmi penetapan status UMA..."
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}
