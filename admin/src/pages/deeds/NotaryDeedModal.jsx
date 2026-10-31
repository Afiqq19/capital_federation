import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ib, dateTime, parseDate } from '../../lib/format';
import {
  FileText,
  ShieldCheck,
  Award,
  Stamp,
  QrCode,
  Building2,
  Calendar,
  Clock,
  Printer,
  CheckCircle2,
} from 'lucide-react';

export default function NotaryDeedModal({ open, onClose, deed }) {
  if (!deed) return null;

  const handlePrint = () => {
    window.print();
  };

  const createdDate = (parseDate(deed.created_at) || new Date());
  const formattedDate = createdDate.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' WIB';

  // Waktu tanda tangan pihak (simulasi selisih 1-2 menit setelah dibuat)
  const signedTime = new Date(createdDate.getTime() + 120000).toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lembaran Asli Akta Notaris Otentik"
      subtitle={`Akta Notariat No. ${deed.deed_number}`}
      icon={ScrollTextIcon}
      tone="var(--gold)"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="ghost" size="sm" icon={Printer} onClick={handlePrint}>
            Cetak Salinan Akta
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Tutup Dokumen
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Authentic Notarial Parchment View */}
        <div className="p-6 rounded-2xl bg-slate-900 border-2 border-amber-500/40 text-slate-200 text-xs shadow-2xl relative font-serif space-y-5">
          {/* Top Decorative Border */}
          <div className="text-center border-b-2 border-amber-500/40 pb-4">
            <div className="font-sans text-[11px] font-extrabold uppercase tracking-widest text-amber-400">
              REPUBLIK FEDERASI INDIGO
            </div>
            <div className="font-sans text-[10px] text-slate-400 tracking-wider">
              KANTOR NOTARIS & PEJABAT PEMBUAT AKTA KORPORASI
            </div>
            <h3 className="font-bold text-base tracking-wide text-slate-100 mt-1 uppercase">
              Yudi Apriadi
            </h3>
            <p className="text-[10px] font-sans text-slate-400">
              Surat Keputusan Menteri Hukum Federasi No: AHU-00921.AH.02.01 • Wilayah Jabatan Ibukota Federasi
            </p>
          </div>

          {/* Deed Title & Number */}
          <div className="text-center space-y-1">
            <div className="font-sans font-black text-xs uppercase tracking-wider text-amber-300">
              AKTA JUAL BELI & PENGALIHAN HAK ATAS KEPEMILIKAN SAHAM
            </div>
            <div className="font-mono text-xs font-bold text-slate-300">
              NOMOR: {deed.deed_number}
            </div>
          </div>

          {/* Opening Paragraph with Exact Timestamps */}
          <div className="space-y-2 font-sans text-xs leading-relaxed text-slate-300 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
            <p>
              Pada hari ini, <strong>{formattedDate}</strong>, tepat pada pukul <strong>{formattedTime}</strong>, menghadap kepada saya, Notaris berkedudukan di Ibukota Federasi, dengan dihadiri oleh saksi-saksi yang telah dikenal:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">1. PIHAK PERTAMA (PENJUAL):</span>
                <span className="font-bold text-slate-100 text-xs block mt-0.5">{deed.seller_name}</span>
                <span className="text-[11px] text-slate-400">Pemilik sah blok saham perseroan</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block">2. PIHAK KEDUA (PEMBELI):</span>
                <span className="font-bold text-slate-100 text-xs block mt-0.5">{deed.buyer_name}</span>
                <span className="text-[11px] text-slate-400">Penerima pengalihan hak kepemilikan baru</span>
              </div>
            </div>
          </div>

          {/* Core Deed Contract Details */}
          <div className="space-y-2 font-sans">
            <div className="text-[11px] font-bold text-slate-200 uppercase tracking-wide border-b border-slate-800 pb-1">
              Pasal 1: Objek Pengalihan & Nilai Transaksi
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Nama Perseroan:</span>
                <span className="font-bold text-slate-200">{deed.company_name}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Simbol Bursa:</span>
                <span className="font-bold text-amber-400 font-mono">{deed.company_symbol}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Volume Lembar:</span>
                <span className="font-bold text-slate-200">{Number(deed.shares_transferred || 0).toLocaleString('id-ID')} Lembar</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Porsi Saham:</span>
                <span className="font-bold text-sky-400">{deed.percentage_transferred}% Kepemilikan</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 block">Total Nilai Transaksi Disepakati:</span>
                <span className="text-[11px] text-slate-300">Telah dibayarkan lunas melalui escrow kliring P2P</span>
              </div>
              <span className="font-mono text-base font-black text-amber-300">
                {ib(deed.total_price_ib)}
              </span>
            </div>
          </div>

          {/* Legal Clauses */}
          <div className="space-y-1.5 font-sans text-[11px] text-slate-300 bg-slate-950/30 p-3 rounded-lg border border-slate-800">
            <div className="font-bold text-slate-200 uppercase text-[10px]">
              Pasal 2: Klausul Wanprestasi & Sengketa Hukum (PNAF)
            </div>
            <p className="leading-relaxed">
              Apabila salah satu pihak mengingkari isi akta ini, pihak yang dirugikan berhak menuntut <strong>denda penalti wanprestasi sebesar 20% (IB {Number((deed.total_price_ib || 0) * 0.2).toLocaleString('id-ID')})</strong> yang dapat dieksekusi seketika melalui <strong>Pengadilan Niaga & Arbitrase Federasi Indigo (PNAF)</strong>.
            </p>
          </div>

          {/* e-Meterai & Signatures Footer */}
          <div className="pt-2 border-t border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* E-Meterai Digital Stamp */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/40 border border-rose-500/40 text-center relative overflow-hidden font-sans">
                <div className="text-[9px] uppercase font-black text-rose-400 tracking-wider">
                  METERAI ELEKTRONIK LUNAS
                </div>
                <div className="text-xs font-black text-slate-100 my-0.5">IB 10.000</div>
                <div className="font-mono text-[9px] text-slate-400">
                  SN: EMTR-{deed.id ? deed.id.slice(0, 8).toUpperCase() : '84729103'}
                </div>
                <div className="text-[8px] text-emerald-400 font-bold mt-1 flex items-center justify-center gap-1">
                  <CheckCircle2 size={10} /> TERVERIFIKASI PERURI
                </div>
              </div>

              {/* Tanda Tangan Para Pihak */}
              <div className="text-center font-sans">
                <div className="text-[10px] text-slate-400 mb-1">Ditandatangani secara digital:</div>
                <div className="text-xs font-mono font-bold text-slate-200">{signedTime}</div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                  ✓ {deed.seller_name}
                </div>
                <div className="text-[10px] text-sky-400 font-semibold">
                  ✓ {deed.buyer_name}
                </div>
              </div>

              {/* Stempel & Pengesahan Notaris */}
              <div className="text-center font-sans border-l border-slate-800 pl-2">
                <div className="text-[10px] text-slate-400">Disahkan oleh Notaris:</div>
                <div className="w-12 h-12 mx-auto my-1 rounded-full border-2 border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Stamp size={22} />
                </div>
                <div className="font-bold text-[11px] text-amber-300">
                  Yudi Apriadi
                </div>
                <div className="text-[9px] text-slate-500 font-mono">
                  REG. NO: NOT-PNAF-0042
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ScrollTextIcon(props) {
  return <FileText {...props} />;
}
