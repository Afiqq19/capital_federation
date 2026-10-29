import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Textarea, Select } from '../../components/ui/Form';
import { Ban, Clock } from 'lucide-react';
import { toLocalInput } from '../../lib/format';

export default function SuspendStockModal({ open, onClose, companies, onConfirm }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [reason, setReason] = useState(
    'Penghentian sementara perdagangan (Cooling Down) untuk memberikan waktu memadai bagi pelaku pasar mempertimbangkan keputusan investasinya.'
  );

  // Default: 24 jam ke depan
  const [untilDate, setUntilDate] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return toLocalInput(d);
  });

  const [submitting, setSubmitting] = useState(false);

  // Filter emiten yang belum disuspensi
  const availableCompanies = (companies || []).filter((c) => !c.is_suspended);

  const applyPresetHours = (hours) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    setUntilDate(toLocalInput(d));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId || !untilDate) return;

    setSubmitting(true);
    const untilIso = new Date(untilDate).toISOString();
    await onConfirm(selectedCompanyId, untilIso, reason);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Suspensi Perdagangan Saham (Trading Halt)"
      subtitle="Bekukan seluruh transaksi saham emiten sampai tanggal yang ditentukan"
      icon={Ban}
      tone="var(--rose)"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="rose"
            onClick={handleSubmit}
            disabled={submitting || !selectedCompanyId}
          >
            {submitting ? 'Membekukan...' : 'Eksekusi Suspensi Sekarang'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
          <p className="font-bold">Dampak: Perdagangan Saham DIHENTIKAN</p>
          <p className="text-slate-300 mt-1">
            Seluruh order antrian beli & jual untuk saham ini akan dibekukan di bursa. Pemain tidak dapat bertransaksi sampai masa suspensi berakhir atau dicabut secara manual oleh admin.
          </p>
        </div>

        <FormField label="Pilih Emiten yang Akan Dibekukan" hint="Hanya menampilkan saham aktif">
          <Select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            required
          >
            <option value="">-- Pilih Emiten --</option>
            {availableCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.symbol} - {c.name} (IB {c.current_price?.toLocaleString('id-ID')})
              </option>
            ))}
          </Select>
        </FormField>

        <div className="space-y-2">
          <label className="label">Batas Waktu Suspensi (Berakhir Otomatis)</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => applyPresetHours(1)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              1 Jam
            </button>
            <button
              type="button"
              onClick={() => applyPresetHours(6)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              6 Jam
            </button>
            <button
              type="button"
              onClick={() => applyPresetHours(24)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-bold text-rose-300"
            >
              1 Hari (24 Jam)
            </button>
            <button
              type="button"
              onClick={() => applyPresetHours(72)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              3 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPresetHours(168)}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              7 Hari (1 Minggu)
            </button>
          </div>

          <Input
            type="datetime-local"
            value={untilDate}
            onChange={(e) => setUntilDate(e.target.value)}
            required
          />
        </div>

        <FormField label="Alasan Resmi Penghentian (Suspensi)" hint="Akan dicantumkan pada pengumuman resmi keterbukaan informasi bursa">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Alasan suspensi perdagangan saham..."
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}
