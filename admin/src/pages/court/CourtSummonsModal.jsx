import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Send, Mail, CheckCircle2, QrCode, FileText, AlertTriangle } from 'lucide-react';
import { ib, dateTime } from '../../lib/format';

export default function CourtSummonsModal({ open, onClose, courtCase, onSend }) {
  const [sending, setSending] = useState(false);

  if (!courtCase) return null;

  const handleSendSummons = async () => {
    try {
      setSending(true);
      await onSend(courtCase.id);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Relaas Panggilan Sidang Resmi (Surat Undangan PNAF)"
      subtitle={`Dokumen Elektronik Pemanggilan Sidang Perkara No. ${courtCase.case_number}`}
      icon={Mail}
      tone="var(--gold)"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={sending}>
            Tutup
          </Button>
          <Button
            variant="amber"
            onClick={handleSendSummons}
            disabled={sending}
            icon={Send}
          >
            {sending ? 'Menerbitkan...' : 'Kirim Panggilan Resmi (Broadcast ke Para Pihak)'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Authentic Legal Summons Sheet */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-amber-500/30 text-slate-200 text-xs space-y-4 relative overflow-hidden font-serif">
          {/* Watermark / Header */}
          <div className="text-center border-b border-slate-700/80 pb-3">
            <div className="font-sans text-[10px] tracking-widest uppercase font-bold text-amber-400">
              REPUBLIK FEDERASI INDIGO
            </div>
            <h4 className="font-bold text-sm tracking-wide text-slate-100 mt-0.5">
              PENGADILAN NIAGA & ARBITRASE FEDERASI (PNAF)
            </h4>
            <p className="text-[10px] font-sans text-slate-400">
              Kepaniteraan Khusus Perkara Kepailitan, Wanprestasi & Regulasi Bursa IPMC
            </p>
          </div>

          <div className="text-center">
            <span className="font-sans font-extrabold text-xs tracking-wider uppercase text-amber-300 border-b border-amber-400/50 pb-0.5">
              RELAAS PANGGILAN SIDANG ELEKTRONIK
            </span>
            <div className="text-[10px] font-mono text-slate-400 mt-1">
              Nomor: {courtCase.case_number}
            </div>
          </div>

          <p className="font-sans text-[11px] leading-relaxed text-slate-300">
            Atas perintah Majelis Hakim Pengadilan Niaga Federasi, Panitera Sidang dengan ini memanggil dengan resmi kepada:
          </p>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950/70 border border-slate-800 font-sans text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Pihak Penggugat:</span>
              <span className="font-bold text-slate-100">{courtCase.plaintiff_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-400 block">Pihak Tergugat:</span>
              <span className="font-bold text-slate-100">{courtCase.defendant_name}</span>
            </div>
          </div>

          <div className="space-y-1.5 font-sans text-[11px] bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Pokok Sengketa:</span>
              <span className="font-bold text-slate-200">{courtCase.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Tuntutan & Denda:</span>
              <span className="font-mono font-bold text-amber-300">{ib(courtCase.claim_amount_ib)}</span>
            </div>
            {courtCase.target_asset_description && (
              <div className="flex justify-between">
                <span className="text-slate-400">Target Sitaan Jaminan:</span>
                <span className="font-bold text-rose-300">{courtCase.target_asset_description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Jadwal Sidang:</span>
              <span className="font-bold text-emerald-300">{courtCase.court_hearing_date} ({courtCase.hearing_time || '10:00 WIB'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tempat Persidangan:</span>
              <span className="font-bold text-slate-200">{courtCase.court_room_name || 'Ruang Sidang Utama Kartika PNAF'}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-sans text-amber-300/90 leading-relaxed">
            <strong>Peringatan Hukum (Pasal 125 HIR):</strong> Apabila Pihak Tergugat tidak hadir pada hari dan jam yang telah ditetapkan tanpa alasan sah, maka perkara akan diputus dengan <strong>Putusan Verstek (Gugatan Dikabulkan Sepenuhnya & Eksekusi Sita Langsung)</strong>.
          </div>
        </div>
      </div>
    </Modal>
  );
}
