import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Textarea, Select } from '../../components/ui/Form';
import { Coins, Landmark, ArrowRight, User, Building } from 'lucide-react';
import { ib } from '../../lib/format';

export default function WithdrawModal({ open, onClose, users, companies, treasuryBalance, onConfirm }) {
  const [targetType, setTargetType] = useState('PERSONAL'); // 'PERSONAL' | 'COMPANY'
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [amountIb, setAmountIb] = useState(50000000); // Default IB 50 Juta
  const [purpose, setPurpose] = useState('Pencairan Anggaran Negara untuk Penguatan Likuiditas');
  const [submitting, setSubmitting] = useState(false);

  const newTreasuryBalance = Math.max(0, (treasuryBalance || 0) - (Number(amountIb) || 0));

  const PRESET_AMOUNTS = [
    { label: 'IB 10 Jt', value: 10000000 },
    { label: 'IB 50 Jt', value: 50000000 },
    { label: 'IB 100 Jt', value: 100000000 },
    { label: 'IB 500 Jt', value: 500000000 },
    { label: 'IB 1 M', value: 1000000000 },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amountIb || amountIb <= 0) return;
    if (targetType === 'PERSONAL' && !selectedUserId) return;
    if (targetType === 'COMPANY' && !selectedCompanyId) return;

    try {
      setSubmitting(true);
      await onConfirm({
        targetType,
        userId: targetType === 'PERSONAL' ? selectedUserId : null,
        companyId: targetType === 'COMPANY' ? selectedCompanyId : null,
        amountIb: Number(amountIb),
        purpose,
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
      title="Gunakan / Cairkan Kas Negara (Disbursement)"
      subtitle="Tarik dan transfer likuiditas resmi dari Kas Negara langsung ke Kas Pribadi Pemain atau Kas PT"
      icon={Coins}
      tone="var(--emerald)"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="emerald"
            onClick={handleSubmit}
            disabled={
              submitting ||
              amountIb <= 0 ||
              (targetType === 'PERSONAL' && !selectedUserId) ||
              (targetType === 'COMPANY' && !selectedCompanyId) ||
              amountIb > (treasuryBalance || 0)
            }
          >
            {submitting ? 'Memproses Pencairan...' : 'Cairkan Dana Kas Negara'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Treasury Impact Card */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Saldo Kas Likuid Negara Saat Ini:</span>
            <span className="font-mono font-bold text-slate-200">{ib(treasuryBalance || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-amber-400">
            <span>Nominal Penarikan Dana:</span>
            <span className="font-mono font-bold">- {ib(amountIb || 0)}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-emerald-400 font-semibold">
            <span>Sisa Saldo Kas Negara:</span>
            <span className="font-mono font-bold">{ib(newTreasuryBalance)}</span>
          </div>
        </div>

        {/* Target Destination Switcher */}
        <FormField label="Pilih Tujuan Penyaluran Dana">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTargetType('PERSONAL')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                targetType === 'PERSONAL'
                  ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <User size={15} />
              <span>Kas Pribadi Pemain</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetType('COMPANY')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                targetType === 'COMPANY'
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Building size={15} />
              <span>Brankas Kas PT</span>
            </button>
          </div>
        </FormField>

        {/* Selection: User or Company */}
        {targetType === 'PERSONAL' ? (
          <FormField label="Pilih Pemain Penerima" hint="Dana masuk ke tabungan Kas Pribadi pemain">
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              required
            >
              <option value="">-- Pilih Pemain --</option>
              {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} (Kas Pribadi: {ib(u.balance_ib || 0)})
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField label="Pilih Entitas Perusahaan / PT" hint="Dana masuk ke rekening Kas PT">
            <Select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              required
            >
              <option value="">-- Pilih Perusahaan --</option>
              {(companies || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.symbol} - {c.name} (Kas PT: {ib(c.company_balance_ib || 0)})
                </option>
              ))}
            </Select>
          </FormField>
        )}

        {/* Preset Amounts */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">Pilihan Nominal Cepat</label>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESET_AMOUNTS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setAmountIb(p.value)}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold transition-all border ${
                  amountIb === p.value
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Input */}
        <FormField
          label={
            <div className="flex items-center justify-between w-full">
              <span>Nominal Pencairan (IB)</span>
              <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                IB {Number(amountIb || 0).toLocaleString('id-ID')}
              </span>
            </div>
          }
          hint="Ketik nominal manual jika di luar preset"
        >
          <Input
            type="number"
            min={1}
            max={treasuryBalance || 50000000000}
            value={amountIb}
            onChange={(e) => setAmountIb(Number(e.target.value))}
            required
            className="font-mono text-base font-bold text-slate-100"
          />
        </FormField>

        {/* Purpose */}
        <FormField label="Keperluan / Alasan Pencairan Kas Negara">
          <Textarea
            rows={2}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Contoh: Insentif stimulus industri, pembagian dividen kepresidenan, hibah modal usaha..."
          />
        </FormField>
      </form>
    </Modal>
  );
}
