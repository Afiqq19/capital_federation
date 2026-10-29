import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Textarea } from '../../components/ui/Form';
import { Landmark, AlertTriangle } from 'lucide-react';
import { ib } from '../../lib/format';

export default function SeizeAssetModal({ open, onClose, loan, onConfirm }) {
  const [note, setNote] = useState('Penyitaan aset jaminan akibat debitur wanprestasi (NPL)');
  const [submitting, setSubmitting] = useState(false);

  if (!loan) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onConfirm(loan.id, note);
    setSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sita Aset Jaminan Debitur"
      subtitle={`Eksekusi jaminan pinjaman atas debitur ${loan.user_name || loan.username || 'Pemain'}`}
      icon={Landmark}
      tone="var(--rose)"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="rose"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Mengeksekusi...' : 'Konfirmasi Sita Aset'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Tindakan Eksekusi Jaminan Bank Sentral</p>
            <p className="text-slate-300 mt-1">
              Bank Sentral akan mengeksekusi portofolio/saham debitur atau memotong saldo hingga sisa hutang lunas.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block">Pokok Pinjaman:</span>
            <span className="font-mono font-bold text-slate-200">{ib(loan.principal_ib)}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Sisa Hutang:</span>
            <span className="font-mono font-bold text-rose-400">{ib(loan.remaining_debt_ib)}</span>
          </div>
        </div>

        <FormField label="Catatan / Dasar Hukum Penyitaan" hint="Keterangan resmi yang akan dicatat di audit log dan feed bursa">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Alasan eksekusi jaminan debitur..."
            required
          />
        </FormField>
      </form>
    </Modal>
  );
}
