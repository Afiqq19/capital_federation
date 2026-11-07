import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Textarea } from '../../components/ui/Form';
import { Gift, Users, Landmark, UserCheck, Globe, AlertTriangle } from 'lucide-react';
import { ib } from '../../lib/format';

export default function DividenModal({ open, onClose, users = [], usersCount = 0, treasuryBalance, onConfirm, onOpenInject }) {
  const [targetAudience, setTargetAudience] = useState('HUMAN_ONLY'); // 'HUMAN_ONLY' | 'ALL'
  const [amountPerUser, setAmountPerUser] = useState(50000000); // 50 Juta IB
  const [note, setNote] = useState('Penyaluran surplus kas negara Federasi Indigo untuk stimulus pemerataan & likuiditas konglomerat');
  const [allowDeficit, setAllowDeficit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Hitung jumlah pemain asli (human) vs total akun
  const humanUsers = users?.filter((u) => !u.is_bot_account && !String(u.id || '').startsWith('bot-user-')) || [];
  const humanCount = Math.max(1, humanUsers.length > 0 ? humanUsers.length : (users?.length ? Math.min(users.length, 5) : 1));
  const totalUsersCount = Math.max(1, users?.length || usersCount || 1);

  const activeRecipientsCount = targetAudience === 'HUMAN_ONLY' ? humanCount : totalUsersCount;
  const totalBudget = (Number(amountPerUser) || 0) * activeRecipientsCount;
  const isDeficitRisk = totalBudget > (treasuryBalance || 0);
  const newTreasuryBalance = (treasuryBalance || 0) - totalBudget;

  const PRESET_AMOUNTS = [
    { label: 'IB 10 Jt', value: 10000000 },
    { label: 'IB 50 Jt', value: 50000000 },
    { label: 'IB 100 Jt', value: 100000000 },
    { label: 'IB 500 Jt', value: 500000000 },
    { label: 'IB 1 M', value: 1000000000 },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amountPerUser || amountPerUser <= 0) return;

    try {
      setSubmitting(true);
      await onConfirm({
        amountPerUser: Number(amountPerUser),
        note,
        targetAudience,
        allowDeficit,
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
      subtitle="Cairkan stimulus resmi dari kas negara langsung ke rekening konglomerat"
      icon={Gift}
      tone="var(--emerald)"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            {isDeficitRisk ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle size={13} />
                Melebihi kas likuid
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">Kas negara mencukupi</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Batal
            </Button>
            <Button
              variant="emerald"
              onClick={handleSubmit}
              disabled={submitting || amountPerUser <= 0 || (isDeficitRisk && !allowDeficit)}
            >
              {submitting ? 'Mencairkan...' : `Cairkan Total ${ib(totalBudget)}`}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pilihan Target Penerima */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Target Penerima Dividen Nasional:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetAudience('HUMAN_ONLY')}
              className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                targetAudience === 'HUMAN_ONLY'
                  ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <UserCheck size={14} className={targetAudience === 'HUMAN_ONLY' ? 'text-emerald-400' : 'text-slate-400'} />
                <span>Pemain Asli Saja (Rekomendasi)</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {humanCount} Konglomerat Pemain • Hemat Kas Negara
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTargetAudience('ALL')}
              className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all ${
                targetAudience === 'ALL'
                  ? 'bg-sky-500/15 border-sky-400 text-sky-300 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <Globe size={14} className={targetAudience === 'ALL' ? 'text-sky-400' : 'text-slate-400'} />
                <span>Seluruh Konglomerat</span>
              </div>
              <span className="text-[10px] text-slate-400">
                {totalUsersCount} Akun (Termasuk Bot Pasar)
              </span>
            </button>
          </div>
        </div>

        {/* Treasury Impact Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Saldo Kas Likuid Negara Saat Ini:</span>
            <span className="font-mono font-bold text-slate-200">{ib(treasuryBalance || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Jumlah Penerima Stimulus:</span>
            <span className="font-bold text-sky-400 flex items-center gap-1">
              <Users size={13} />
              {activeRecipientsCount} Konglomerat
            </span>
          </div>
          <div className="flex items-center justify-between text-rose-400">
            <span>Total Pengeluaran Kas Negara:</span>
            <span className="font-mono font-bold">- {ib(totalBudget)}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between font-semibold">
            <span className={newTreasuryBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}>
              Estimasi Sisa Saldo Kas Negara:
            </span>
            <span className={`font-mono font-bold ${newTreasuryBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {ib(newTreasuryBalance)}
            </span>
          </div>
        </div>

        {/* Jika Melebihi Kas Negara: Warning & Bypass Defisit */}
        {isDeficitRisk && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong>Peringatan Defisit Fiskal:</strong> Total anggaran stimulus ({ib(totalBudget)}) melebihi saldo kas negara ({ib(treasuryBalance || 0)}).
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={allowDeficit}
                  onChange={(e) => setAllowDeficit(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-0"
                />
                <span>Izinkan Defisit Fiskal / Sovereign Quantitative Easing</span>
              </label>
              {onOpenInject && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInject();
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-bold text-[10px]"
                >
                  ➕ Injeksi Kas Dulu
                </button>
              )}
            </div>
          </div>
        )}

        {/* Input Stimulus per Player */}
        <div className="space-y-2">
          <FormField label="Nominal Bantuan per Konglomerat (IB)" hint="Setiap konglomerat akan menerima nominal ini secara merata di saldo kas pribadi">
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
            rows={2}
            placeholder="Tuliskan catatan penyaluran stimulus dividen..."
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}
