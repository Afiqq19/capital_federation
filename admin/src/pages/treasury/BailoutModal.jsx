import { useState, useRef, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Textarea, Select } from '../../components/ui/Form';
import { ShieldAlert, Landmark, ArrowRight, Building } from 'lucide-react';
import { ib, changePct, signedPct } from '../../lib/format';

export default function BailoutModal({ open, onClose, companies, treasuryBalance, onConfirm }) {
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [amountIb, setAmountIb] = useState(5000000000); // 5 Miliar IB
  const [reason, setReason] = useState('Stimulus penyelamatan stabilitas pasar modal & pemulihan likuiditas emiten');
  const [submitting, setSubmitting] = useState(false);

  // Kunci daftar emiten selama modal terbuka agar dropdown tidak me-refresh / menutup sendiri
  const stableCompaniesRef = useRef([]);
  useEffect(() => {
    if (open) {
      if (stableCompaniesRef.current.length === 0 && companies?.length) {
        stableCompaniesRef.current = [...companies];
      }
    } else {
      stableCompaniesRef.current = [];
    }
  }, [open, companies]);

  const companyList = stableCompaniesRef.current.length > 0 ? stableCompaniesRef.current : (companies || []);
  const selectedCompany = companyList.find((c) => String(c.id) === String(selectedCompanyId));
  const newTreasuryBalance = Math.max(0, (treasuryBalance || 0) - (Number(amountIb) || 0));

  const PRESET_AMOUNTS = [
    { label: 'IB 1 M', value: 1000000000 },
    { label: 'IB 2.5 M', value: 2500000000 },
    { label: 'IB 5 M', value: 5000000000 },
    { label: 'IB 10 M', value: 10000000000 },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompanyId || !amountIb || amountIb <= 0) return;

    try {
      setSubmitting(true);
      await onConfirm({
        companyId: selectedCompanyId,
        amountIb: Number(amountIb),
        reason,
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
      title="Suntik Dana Talangan (Bailout) Kas Negara"
      subtitle="Kucurkan likuiditas darurat dari Brankas Kas Negara untuk penyelamatan stabilitas emiten"
      icon={ShieldAlert}
      tone="var(--amber)"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="amber"
            onClick={handleSubmit}
            disabled={submitting || !selectedCompanyId || amountIb <= 0}
          >
            {submitting ? 'Menyalurkan...' : 'Konfirmasi Kucuran Bailout'}
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
            <span>Nominal Kucuran Bailout:</span>
            <span className="font-mono font-bold">- {ib(amountIb || 0)}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-emerald-400 font-semibold">
            <span>Estimasi Sisa Saldo Kas Negara:</span>
            <span className="font-mono font-bold">{ib(newTreasuryBalance)}</span>
          </div>
        </div>

        {/* Emiten Target */}
        <FormField label="Pilih Emiten Penerima Bailout" hint="Hanya emiten yang membutuhkan injeksi likuiditas">
          <Select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            required
          >
            <option value="">-- Pilih Emiten Target --</option>
            {companyList.map((c) => {
              const chg = changePct(c);
              return (
                <option key={c.id} value={c.id}>
                  {c.symbol} - {c.name}
                </option>
              );
            })}
          </Select>
        </FormField>

        {selectedCompany && (
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-200">{selectedCompany.name} ({selectedCompany.symbol})</span>
              <span className="text-slate-400 block text-[11px] mt-0.5">Sektor: {selectedCompany.sector}</span>
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-slate-200">{ib(selectedCompany.current_price)}</span>
              <span className={`block text-[11px] font-bold ${selectedCompany.current_price < (selectedCompany.prev_close || selectedCompany.base_price) ? 'text-rose-400' : 'text-emerald-400'}`}>
                {signedPct(changePct(selectedCompany))}
              </span>
            </div>
          </div>
        )}

        {/* Nominal Bailout */}
        <div className="space-y-2">
          <FormField label="Nominal Dana Talangan (IB)" hint="Nilai suntikan modal kas negara yang langsung masuk ke kas emiten">
            <Input
              type="number"
              value={amountIb}
              onChange={(e) => setAmountIb(parseFloat(e.target.value) || 0)}
              required
              min="100000000"
            />
          </FormField>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_AMOUNTS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setAmountIb(p.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                  amountIb === p.value
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Alasan Resmi */}
        <FormField label="Alasan Resmi Penyaluran Kas Negara" hint="Keterangan otoritas yang akan dicatat di buku kas negara dan berita bursa">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Jelaskan alasan resmi kucuran bailout..."
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}
