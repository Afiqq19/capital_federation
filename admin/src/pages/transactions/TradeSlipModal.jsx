import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ib, dateTime } from '../../lib/format';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  User,
  Clock,
  Printer,
  Hash,
} from 'lucide-react';

export default function TradeSlipModal({ open, onClose, trade }) {
  if (!trade) return null;

  const isBuy = trade.type === 'BUY';
  const price = Number(trade.price_per_share || trade.price || 0);
  const total = Number(trade.total_amount || trade.total_amount_ib || trade.total_ib || (trade.lots * 100 * price) || 0);
  const fee = Number(trade.fee || total * 0.001 || 0);
  const netAmount = isBuy ? total + fee : total - fee;
  const lots = trade.lots != null ? trade.lots : Math.round((trade.shares || 0) / 100);
  const shares = lots * 100;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tiket Konfirmasi Eksekusi Transaksi (Trade Slip)"
      subtitle={`ID Tiket: #${trade.id}`}
      icon={FileText}
      tone={isBuy ? 'var(--emerald)' : 'var(--rose)'}
      maxWidth="max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" icon={Printer} onClick={() => window.print()}>
            Cetak Slip
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Trade Slip Parchment */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 text-xs space-y-4 relative overflow-hidden font-mono">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">
                IPMC EXCHANGE CLEARING HOUSE
              </div>
              <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5 mt-0.5">
                <span>{trade.symbol}</span>
                <span className="text-slate-400 font-normal">({trade.company_name})</span>
              </div>
            </div>
            <Badge tone={isBuy ? 'emerald' : 'rose'} size="lg">
              {isBuy ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
              {trade.type} ORDER
            </Badge>
          </div>

          {/* Execution Specs */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Konglomerat (Akun):</span>
              <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                <User size={12} className="text-sky-400" />
                {trade.username || `User #${trade.user_id}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Waktu Eksekusi:</span>
              <span className="font-semibold text-slate-300 mt-0.5 block">
                {dateTime(trade.created_at)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Kuantitas:</span>
              <span className="font-bold text-slate-200 mt-0.5 block">
                {lots.toLocaleString('id-ID')} Lot ({shares.toLocaleString('id-ID')} Lembar)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Harga Eksekusi / Lembar:</span>
              <span className="font-bold text-amber-300 mt-0.5 block">
                {ib(price)}
              </span>
            </div>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Nilai Bruto Transaksi:</span>
              <span className="font-bold text-slate-200">{ib(total)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Pajak & Biaya Transaksi Bursa (0.1%):</span>
              <span className="text-rose-400 font-semibold">{ib(fee)}</span>
            </div>
            <div className="border-t border-slate-800 my-1"></div>
            <div className="flex justify-between text-sm font-black">
              <span className="text-slate-100">Total Settlement Kas:</span>
              <span className={isBuy ? 'text-rose-400' : 'text-emerald-400'}>
                {ib(netAmount)}
              </span>
            </div>
          </div>

          {/* Audit Verification */}
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={13} />
              Status: {trade.status || 'COMPLETED'} & Diverifikasi Kliring
            </span>
            <span className="font-mono text-[9px] text-emerald-400">
              HASH: {trade.id ? trade.id.slice(0, 12).toUpperCase() : 'OK'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
