import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Textarea } from '../../components/ui/Form';
import { Landmark, PlusCircle, Sparkles } from 'lucide-react';
import { ib } from '../../lib/format';

export default function InjectReserveModal({ open, onClose, treasuryBalance, onConfirm }) {
  const [amountIb, setAmountIb] = useState(100000000000); // 100 Milyar IB
  const [notes, setNotes] = useState('Injeksi Cadangan Devisa Kedaulatan Negara untuk Penguatan Likuiditas Fiskal & Kebijakan Moneter');
  const [submitting, setSubmitting] = useState(false);

  const PRESETS = [
    { label: '+IB 50 Milyar', value: 50000000000 },
    { label: '+IB 100 Milyar', value: 100000000000 },
    { label: '+IB 500 Milyar', value: 500000000000 },
    { label: '+IB 1 Triliun', value: 1000000000000 },
    { label: '+IB 5 Triliun', value: 5000000000000 },
  ];

  const estimatedNewBalance = (treasuryBalance || 0) + (Number(amountIb) || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amountIb || amountIb <= 0) return;

    try {
      setSubmitting(true);
      await onConfirm({
        amountIb: Number(amountIb),
        notes,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Injeksi Cadangan Brankas Kas Negara"
      subtitle="Suntikkan cadangan devisa dan modal kedaulatan baru ke Brankas Kas Negara"
      icon={PlusCircle}
      tone="var(--emerald)"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-400">
            Cadangan langsung efektif di seluruh instrumen moneter
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button
              variant="emerald"
              onClick={handleSubmit}
              disabled={submitting || amountIb <= 0}
            >
              {submitting ? 'Menyuntikkan...' : `Suntikkan ${ib(amountIb)}`}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Treasury Impact Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Saldo Kas Likuid Saat Ini:</span>
            <span className="font-mono font-bold text-slate-200">{ib(treasuryBalance || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-emerald-400">
            <span>Tambahan Cadangan Baru:</span>
            <span className="font-mono font-bold">+ {ib(amountIb || 0)}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-sky-400 font-semibold">
            <span>Estimasi Total Saldo Kas Negara Baru:</span>
            <span className="font-mono font-bold">{ib(estimatedNewBalance)}</span>
          </div>
        </div>

        {/* Input Nominal Injeksi */}
        <div className="space-y-2">
          <FormField label="Nominal Suntikan Cadangan Kas Negara (IB)" hint="Pilih preset cepat atau masukkan nominal angka bebas">
            <Input
              type="number"
              value={amountIb}
              onChange={(e) => setAmountIb(parseFloat(e.target.value) || 0)}
              required
              min="1000000000"
            />
          </FormField>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setAmountIb(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                  amountIb === p.value
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catatan Dasar Otoritas */}
        <FormField label="Keterangan & Dasar Hukum Injeksi" hint="Dicatat permanen pada buku kas mutasi negara">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Tuliskan catatan penetapan kedaulatan cadangan devisa..."
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}

