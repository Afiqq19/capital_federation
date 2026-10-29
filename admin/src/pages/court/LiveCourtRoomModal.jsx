import { useState, useEffect, useRef } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { adminApi } from '../../api/admin';
import { socket } from '../../lib/socket';
import { ib, dateTime } from '../../lib/format';
import {
  Gavel,
  Users,
  Send,
  ShieldAlert,
  AlertTriangle,
  Scale,
  CheckCircle2,
  XCircle,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function LiveCourtRoomModal({ open, onClose, courtCase, onVerdictSuccess }) {
  const [roomData, setRoomData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [myMessage, setMyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingVerdict, setSubmittingVerdict] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchRoom = async () => {
    if (!courtCase) return;
    try {
      setLoading(true);
      const data = await adminApi.courtRoom(courtCase.id);
      setRoomData(data);
      setMessages(data.messages || []);
    } catch (err) {
      console.warn('Gagal memuat ruang sidang:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && courtCase) {
      fetchRoom();

      const handlePresence = (data) => {
        if (data.caseId === courtCase.id) {
          fetchRoom();
        }
      };

      const handleNewMsg = (msg) => {
        if (msg.case_id === courtCase.id) {
          setMessages((prev) => [...prev, msg]);
        }
      };

      const handleVerdict = (v) => {
        if (v.caseId === courtCase.id) {
          fetchRoom();
        }
      };

      socket.on(`court:presence_updated:${courtCase.id}`, handlePresence);
      socket.on(`court:new_message:${courtCase.id}`, handleNewMsg);
      socket.on(`court:verdict_reached:${courtCase.id}`, handleVerdict);

      return () => {
        socket.off(`court:presence_updated:${courtCase.id}`, handlePresence);
        socket.off(`court:new_message:${courtCase.id}`, handleNewMsg);
        socket.off(`court:verdict_reached:${courtCase.id}`, handleVerdict);
      };
    }
  }, [open, courtCase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!courtCase) return null;

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!myMessage.trim()) return;

    try {
      await adminApi.sendCourtMessage(courtCase.id, {
        senderName: 'Majelis Hakim Ketua PNAF',
        senderRole: 'HAKIM',
        message: myMessage.trim(),
      });
      setMyMessage('');
    } catch (err) {
      alert('Gagal mengirim instruksi majelis hakim: ' + err.message);
    }
  };

  const handleStrikeGavel = async (verdictType) => {
    const confirmMsg =
      verdictType === 'VERSTEK_PLAINTIFF_WIN'
        ? '🔨 KETUK PALU VONIS VERSTEK?\n\nGugatan Penggugat dikabulkan PENUH dan sita eksekusi ganti rugi dicairkan dari Tergugat ke Penggugat.'
        : verdictType === 'SETTLED_MEDIATION'
        ? '🔨 KETUK PALU VONIS MEDIASI / PKPU?\n\nTergugat diwajibkan membayar restrukturisasi 50% kepada Penggugat.'
        : '🔨 KETUK PALU GUGUR?\n\nGugatan perkara dinyatakan gugur dan dicabut demi hukum.';

    if (!window.confirm(confirmMsg)) return;

    try {
      setSubmittingVerdict(true);
      await adminApi.courtRoomVerdict({
        caseId: courtCase.id,
        forcedVerdictType: verdictType,
        adminJudgeOverride: true,
      });
      await fetchRoom();
      if (onVerdictSuccess) onVerdictSuccess();
    } catch (err) {
      alert('Gagal mengetuk palu vonis: ' + err.message);
    } finally {
      setSubmittingVerdict(false);
    }
  };

  const plPresent = roomData?.plaintiff_present === 1;
  const defPresent = roomData?.defendant_present === 1;
  const isClosed = roomData?.status === 'VERDICT_PAILIT' || roomData?.status === 'VERDICT_PKPU' || roomData?.status === 'VERDICT_REJECTED' || roomData?.room_status === 'VERDICT_DELIVERED';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ruang Sidang Live Majelis Hakim PNAF"
      subtitle={`${courtCase.court_room_name || 'Ruang Sidang Utama Kartika PNAF'} • Perkara No. ${courtCase.case_number}`}
      icon={Gavel}
      tone="var(--gold)"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400">
            {isClosed ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={14} /> Perkara Telah Resmi Diputus & Memiliki Kekuatan Hukum Tetap
              </span>
            ) : (
              <span>Ketuk palu vonis untuk menerbitkan amar putusan inkrah</span>
            )}
          </div>
          <Button variant="ghost" onClick={onClose}>
            Tutup Ruang Sidang
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Case Info & Seizure Target Card */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-amber-500/30 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 tracking-wider">
                REGISTER PERKARA PNAF
              </span>
              <h4 className="font-bold text-sm text-slate-100 mt-0.5">{courtCase.title}</h4>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Nilai Gugatan / Tuntutan Denda:</span>
              <span className="font-mono text-base font-black text-amber-400">
                {ib(courtCase.claim_amount_ib)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Objek yang Disita / Disengketakan:</span>
              <span className="font-semibold text-rose-300 mt-0.5 block">
                {courtCase.target_asset_description || 'Saham Portofolio, Aset Dividen, & Rekening Kas Konglomerat'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Jadwal & Ruang Sidang:</span>
              <span className="font-semibold text-slate-200 mt-0.5 block">
                {courtCase.court_hearing_date} ({courtCase.hearing_time || '10:00 WIB'}) • {courtCase.court_room_name || 'Kartika PNAF'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Attendance / Presensi Para Pihak */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Hakim Ketua */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-xs">
            <span className="text-[10px] font-bold text-amber-400 block uppercase">Hakim Ketua</span>
            <div className="font-bold text-slate-200 truncate mt-0.5">Otoritas PNAF</div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              PRESIDING
            </div>
          </div>

          {/* Panitera */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-[10px] font-bold text-sky-400 block uppercase">Panitera Sidang</span>
            <div className="font-bold text-slate-200 truncate mt-0.5">Kepaniteraan PNAF</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">🟢 AKTIF RECORD</div>
          </div>

          {/* Penggugat */}
          <div className={`p-2.5 rounded-xl border text-xs ${plPresent ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-[10px] font-bold text-emerald-400 block uppercase">Penggugat</span>
            <div className="font-bold text-slate-200 truncate mt-0.5">{courtCase.plaintiff_name}</div>
            <div className={`text-[10px] font-bold mt-1 ${plPresent ? 'text-emerald-400' : 'text-slate-500'}`}>
              {plPresent ? '🟢 TELAH HADIR' : '⚪ MENUNGGU HADIR'}
            </div>
          </div>

          {/* Tergugat */}
          <div className={`p-2.5 rounded-xl border text-xs ${defPresent ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <span className="text-[10px] font-bold text-rose-400 block uppercase">Tergugat</span>
            <div className="font-bold text-slate-200 truncate mt-0.5">{courtCase.defendant_name}</div>
            <div className={`text-[10px] font-bold mt-1 ${defPresent ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
              {defPresent ? '🟢 TELAH HADIR' : '🔴 MANGKIR (VERSTEK)'}
            </div>
          </div>
        </div>

        {/* Live Chat / Argumen Persidangan */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col h-64">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800/80 flex items-center justify-between">
            <span>Berita Acara & Argumen Langsung di Persidangan:</span>
            <span className="text-emerald-400 font-mono">LIVE ENCRYPTED FEED</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1 text-xs">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 py-10">
                Belum ada argumen atau eksepsi yang disampaikan dalam sidang ini.
              </div>
            ) : (
              messages.map((m) => {
                const isJudge = m.sender_role === 'HAKIM';
                const isPanitera = m.sender_role === 'PANITERA';
                const isPlaintiff = m.sender_role === 'PLAINTIFF' || m.sender_role === 'PENGGUGAT';

                return (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-xl text-xs ${
                      isJudge
                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-200'
                        : isPanitera
                        ? 'bg-sky-500/10 border border-sky-500/20 text-sky-200'
                        : isPlaintiff
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200'
                        : 'bg-rose-500/10 border border-rose-500/20 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] flex items-center gap-1.5">
                        {isJudge && '👨‍⚖️ '}
                        {isPanitera && '🏛️ '}
                        {m.sender_name}
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-black/30 text-slate-300">
                          {m.sender_role}
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {dateTime(m.created_at)}
                      </span>
                    </div>
                    <p className="leading-relaxed">{m.message}</p>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Kirim Instruksi Hakim */}
          {!isClosed && (
            <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={myMessage}
                onChange={(e) => setMyMessage(e.target.value)}
                placeholder="Ketikkan instruksi majelis hakim / teguran panitera..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <Button variant="primary" size="sm" type="submit" icon={Send}>
                Kirim
              </Button>
            </form>
          )}
        </div>

        {/* Amar Putusan & Tombol Ketuk Palu Hakim */}
        {!isClosed ? (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-transparent border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-bold text-xs uppercase text-amber-300 flex items-center gap-1.5">
                  <Gavel size={15} />
                  Otoritas Majelis Hakim: Ketuk Palu Putusan Inkrah
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih amar putusan untuk mengeksekusi sengketa dan mencairkan sitaan jaminan
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Verstek (Penggugat Menang Penuh) */}
              <button
                type="button"
                disabled={submittingVerdict}
                onClick={() => handleStrikeGavel('VERSTEK_PLAINTIFF_WIN')}
                className="p-3 rounded-xl bg-rose-500/20 border border-rose-400 text-left hover:bg-rose-500/30 transition-all text-xs text-rose-200 space-y-1"
              >
                <div className="font-extrabold flex items-center gap-1.5 text-rose-300">
                  <Gavel size={14} />
                  1. Putusan Verstek (Sita Eksekusi)
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Tergugat mangkir. Gugatan Penggugat dikabulkan PENUH & uang sitaan dicairkan ke Penggugat!
                </p>
              </button>

              {/* Mediasi PKPU 50% */}
              <button
                type="button"
                disabled={submittingVerdict}
                onClick={() => handleStrikeGavel('SETTLED_MEDIATION')}
                className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400 text-left hover:bg-emerald-500/30 transition-all text-xs text-emerald-200 space-y-1"
              >
                <div className="font-extrabold flex items-center gap-1.5 text-emerald-300">
                  <Scale size={14} />
                  2. Putusan Mediasi PKPU (50%)
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  Kompensasi restrukturisasi 50% tuntutan dibayarkan oleh Tergugat kepada Penggugat.
                </p>
              </button>

              {/* Gugur / Ditolak */}
              <button
                type="button"
                disabled={submittingVerdict}
                onClick={() => handleStrikeGavel('GUGUR_DISMISSED')}
                className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-left hover:bg-slate-800 transition-all text-xs text-slate-300 space-y-1"
              >
                <div className="font-extrabold flex items-center gap-1.5 text-slate-200">
                  <XCircle size={14} />
                  3. Putusan Gugur / Ditolak
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Penggugat mangkir atau tidak cukup bukti. Gugatan dibatalkan demi hukum.
                </p>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 space-y-1.5">
            <div className="font-bold text-sm flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 size={16} />
              Vonis Hakim Telah Dijatuhkan ({roomData?.status})
            </div>
            <p className="leading-relaxed text-slate-300">
              {roomData?.verdict_notes || 'Amar putusan telah diketok dan mengikat seluruh pihak.'}
            </p>
            {roomData?.verdict_awarded_amount > 0 && (
              <div className="font-mono font-bold text-amber-300 pt-1">
                Kompensasi Eksekusi: {ib(roomData.verdict_awarded_amount)}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
