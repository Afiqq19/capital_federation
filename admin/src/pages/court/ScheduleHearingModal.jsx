import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { FormField, Input, Select } from '../../components/ui/Form';
import { Calendar, Clock, Landmark } from 'lucide-react';

export default function ScheduleHearingModal({ open, onClose, courtCase, onConfirm }) {
  const [hearingDate, setHearingDate] = useState('');
  const [hearingTime, setHearingTime] = useState('10:00 WIB');
  const [courtRoomName, setCourtRoomName] = useState('Ruang Sidang Utama Kartika PNAF');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (courtCase) {
      setHearingDate(courtCase.court_hearing_date || '');
      setHearingTime(courtCase.hearing_time || '10:00 WIB');
      setCourtRoomName(courtCase.court_room_name || 'Ruang Sidang Utama Kartika PNAF');
    }
  }, [courtCase]);

  if (!courtCase) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onConfirm(courtCase.id, {
        hearingDate,
        hearingTime,
        courtRoomName,
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
      title="Atur Jadwal Persidangan Niaga"
      subtitle={`Perkara No. ${courtCase.case_number}: ${courtCase.title}`}
      icon={Calendar}
      tone="var(--gold)"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="amber"
            onClick={handleSubmit}
            disabled={submitting || !hearingDate}
          >
            {submitting ? 'Menyimpan...' : 'Tetapkan Jadwal Sidang'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Penggugat:</span>
            <span className="font-bold text-slate-200">{courtCase.plaintiff_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Tergugat:</span>
            <span className="font-bold text-rose-300">{courtCase.defendant_name}</span>
          </div>
        </div>

        <FormField label="Tanggal Sidang" hint="Contoh: 30 Oktober 2026 atau Besok Pagi">
          <Input
            value={hearingDate}
            onChange={(e) => setHearingDate(e.target.value)}
            placeholder="Masukkan tanggal sidang..."
            required
          />
        </FormField>

        <FormField label="Waktu / Jam Sidang" hint="Waktu pelaksanaan persidangan">
          <Select value={hearingTime} onChange={(e) => setHearingTime(e.target.value)}>
            <option value="09:00 WIB">09:00 WIB (Pagi - Sesi 1)</option>
            <option value="10:00 WIB">10:00 WIB (Pagi - Sesi 2)</option>
            <option value="13:30 WIB">13:30 WIB (Siang - Sesi 3)</option>
            <option value="15:00 WIB">15:00 WIB (Sore - Sesi 4)</option>
          </Select>
        </FormField>

        <FormField label="Ruang Sidang Majelis Hakim">
          <Select value={courtRoomName} onChange={(e) => setCourtRoomName(e.target.value)}>
            <option value="Ruang Sidang Utama Kartika PNAF">Ruang Sidang Utama Kartika PNAF</option>
            <option value="Ruang Sidang Cakra Arbitrase Niaga">Ruang Sidang Cakra Arbitrase Niaga</option>
            <option value="Ruang Mediasi Damai & PKPU">Ruang Mediasi Damai & PKPU</option>
            <option value="Majelis Khusus Sita Eksekusi">Majelis Khusus Sita Eksekusi</option>
          </Select>
        </FormField>
      </form>
    </Modal>
  );
}
