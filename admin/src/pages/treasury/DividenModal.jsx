import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Textarea } from '../../components/ui/Form';
import { Gift, Users, Landmark } from 'lucide-react';
import { ib } from '../../lib/format';

export default function DividenModal({ open, onClose, usersCount = 0, treasuryBalance, onConfirm }) {
  const [amountPerUser, setAmountPerUser] = useState(50000000); // 50 Juta IB
  const [note, setNote] = useState('Penyaluran surplus kas negara Federasi Indigo untuk stimulus pemerataan & likuiditas konglomerat');
  const [submitting, setSubmitting] = useState(false);

  const activeUsers = Math.max(1, usersCount);
  const totalBudget = (Number(amountPerUser) || 0) * activeUsers;
  const newTreasuryBalance = Math.max(0, (treasuryBalance || 0) - totalBudget);

  const PRESET_AMOUNTS = [
    { label: 'IB 10 Jt', value: 10000000 },
    { label: 'IB 50 Jt', value: 50000000 },
    { label: 'IB 100 Jt', value: 100000000 },
    { label: 'IB 500 Jt', value: 500000000 },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amountPerUser || amountPerUser <= 0) return;

    try {
      setSubmitting(true);
      await onConfirm({
        amountPerUser: Number(amountPerUser),
        note,
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
      title="Bagi Dividen Kemakmuran (Stimulus Nasional)"
      subtitle="Cairkan bantuan stimulus kas negara langsung ke rekening seluruh konglomerat aktif"
      icon={Gift}
      tone="var(--emerald)"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="emerald"
            onClick={handleSubmit}
            disabled={submitting || amountPerUser <= 0 || totalBudget > (treasuryBalance || 0)}
          >
            {submitting ? 'Mencairkan...' : `Cairkan Total ${ib(totalBudget)}`}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Treasury Impact Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Saldo Kas Likuid Negara:</span>
            <span className="font-mono font-bold text-slate-200">{ib(treasuryBalance || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Jumlah Penerima Stimulus:</span>
            <span className="font-bold text-sky-400 flex items-center gap-1">
              <Users size={13} />
              {activeUsers} Konglomerat Pemain
            </span>
          </div>
          <div className="flex items-center justify-between text-rose-400">
            <span>Total Pengeluaran Kas Negara:</span>
            <span className="font-mono font-bold">- {ib(totalBudget)}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-emerald-400 font-semibold">
            <span>Estimasi Sisa Saldo Kas Negara:</span>
            <span className="font-mono font-bold">{ib(newTreasuryBalance)}</span>
          </div>
        </div>

        {/* Input Stimulus per Player */}
        <div className="space-y-2">
          <FormField label="Nominal Bantuan per Konglomerat (IB)" hint="Setiap pemain akan menerima nominal ini secara merata di saldo kas pribadi">
            <Input
              type="number"
              value={amountPerUser}
              onChange={(e) => setAmountPerUser(parseFloat(e.target.value) || 0)}
              required
              min="1000000"
            />
          </FormField>

          {/* Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_AMOUNTS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setAmountPerUser(p.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                  amountPerUser === p.value
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Catatan Otoritas */}
        <FormField label="Catatan Penyaluran Stimulus" hint="Akan dicatat di riwayat mutasi kas negara dan disiarkan ke feed pasar modal">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Tuliskan catatan penyaluran stimulus dividen..."
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}
