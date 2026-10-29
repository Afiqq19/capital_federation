import { useState, useEffect } from 'react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import Modal from '../../components/ui/Modal';
import { FormField, Input, Textarea, Select } from '../../components/ui/Form';
import { adminApi } from '../../api/admin';
import { ib, dateTime } from '../../lib/format';
import ScheduleHearingModal from './ScheduleHearingModal';
import CourtSummonsModal from './CourtSummonsModal';
import LiveCourtRoomModal from './LiveCourtRoomModal';
import {
  Gavel,
  Scale,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  RefreshCw,
  Building2,
  Calendar,
  Mail,
  Video,
  ShieldAlert,
} from 'lucide-react';

export default function CourtOversightPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State: Issue Verdict
  const [verdictModalCase, setVerdictModalCase] = useState(null);
  const [verdictStatus, setVerdictStatus] = useState('VERDICT_PAILIT');
  const [verdictNotes, setVerdictNotes] = useState('');
  const [submittingVerdict, setSubmittingVerdict] = useState(false);

  // Modal State: File New Case
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaseType, setNewCaseType] = useState('BANKRUPTCY');
  const [newPlaintiff, setNewPlaintiff] = useState('Bank Sentral Indigo Federasi (BIF)');
  const [newDefendant, setNewDefendant] = useState('');
  const [newClaimAmount, setNewClaimAmount] = useState(500000000);
  const [newHearingDate, setNewHearingDate] = useState('Besok Pagi');
  const [newHearingTime, setNewHearingTime] = useState('10:00 WIB');
  const [newCourtRoom, setNewCourtRoom] = useState('Ruang Sidang Utama Kartika PNAF');
  const [newTargetAsset, setNewTargetAsset] = useState('Saham Portofolio, Dividen, dan Rekening Konglomerat');
  const [submittingNewCase, setSubmittingNewCase] = useState(false);

  // New Interactive Modals State
  const [selectedCaseForSchedule, setSelectedCaseForSchedule] = useState(null);
  const [selectedCaseForSummons, setSelectedCaseForSummons] = useState(null);
  const [selectedCaseForLiveRoom, setSelectedCaseForLiveRoom] = useState(null);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await adminApi.courtCases();
      if (Array.isArray(data)) {
        setCases(data);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar perkara:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleOpenVerdict = (c) => {
    setVerdictModalCase(c);
    setVerdictStatus(c.status === 'IN_TRIAL' ? 'VERDICT_PAILIT' : c.status);
    setVerdictNotes(c.verdict_notes || '');
  };

  const handleSubmitVerdict = async (e) => {
    e.preventDefault();
    if (!verdictModalCase) return;
    try {
      setSubmittingVerdict(true);
      await adminApi.issueVerdict({
        caseId: verdictModalCase.id,
        verdictStatus,
        verdictNotes,
      });
      setVerdictModalCase(null);
      await fetchCases();
    } catch (err) {
      alert('Gagal ketuk palu vonis: ' + err.message);
    } finally {
      setSubmittingVerdict(false);
    }
  };

  const handleFileNewCase = async (e) => {
    e.preventDefault();
    try {
      setSubmittingNewCase(true);
      await adminApi.fileCourtCase({
        title: newTitle,
        caseType: newCaseType,
        plaintiffName: newPlaintiff,
        defendantName: newDefendant,
        claimAmountIb: Number(newClaimAmount),
        courtHearingDate: newHearingDate,
        hearingTime: newHearingTime,
        courtRoomName: newCourtRoom,
        targetAssetDescription: newTargetAsset,
      });
      setIsFileModalOpen(false);
      setNewTitle('');
      setNewDefendant('');
      await fetchCases();
    } catch (err) {
      alert('Gagal mendaftarkan perkara: ' + err.message);
    } finally {
      setSubmittingNewCase(false);
    }
  };

  const handleScheduleConfirm = async (caseId, payload) => {
    try {
      await adminApi.scheduleCourtHearing(caseId, payload);
      await fetchCases();
    } catch (err) {
      alert('Gagal menetapkan jadwal sidang: ' + err.message);
    }
  };

  const handleSendSummons = async (caseId) => {
    try {
      await adminApi.sendCourtSummons(caseId);
      await fetchCases();
    } catch (err) {
      alert('Gagal mengirim surat panggilan sidang: ' + err.message);
    }
  };

  const inTrialCount = cases.filter((c) => c.status === 'IN_TRIAL').length;
  const pailitCount = cases.filter((c) => c.status === 'VERDICT_PAILIT').length;
  const pkpuCount = cases.filter((c) => c.status === 'VERDICT_PKPU').length;

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      !search ||
      (c.title && c.title.toLowerCase().includes(search.toLowerCase())) ||
      (c.case_number && c.case_number.toLowerCase().includes(search.toLowerCase())) ||
      (c.plaintiff_name && c.plaintiff_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.defendant_name && c.defendant_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.target_asset_description && c.target_asset_description.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || c.case_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Header Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Perkara Masuk"
          value={cases.length}
          hint="Register Kepaniteraan PNAF"
          icon={Scale}
          tone="gold"
        />
        <StatCard
          label="Sedang Berlangsung"
          value={inTrialCount}
          hint="Menunggu Putusan Hakim"
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Putusan Pailit / Sita"
          value={pailitCount}
          hint="Eksekusi Aset Jaminan"
          icon={Gavel}
          tone="rose"
        />
        <StatCard
          label="Restrukturisasi / Damai"
          value={pkpuCount}
          hint="Penundaan Kewajiban (PKPU)"
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      {/* 2. Main Case Oversight Table */}
      <Card>
        <CardHeader
          title="Pengadilan Niaga & Arbitrase Federasi Indigo (PNAF)"
          subtitle="Kepaniteraan khusus sengketa saham, wanprestasi Bank Sentral BIF, dan penyitaan aset pailit"
          icon={Gavel}
          tone="var(--gold)"
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsFileModalOpen(true)}
                icon={PlusCircle}
              >
                Daftarkan Perkara Baru
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchCases}
                disabled={loading}
                icon={RefreshCw}
              >
                Refresh
              </Button>
            </div>
          }
        />

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Cari nomor perkara, pihak, aset disita..."
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-xl"
          >
            <option value="ALL">Semua Jenis Perkara</option>
            <option value="BANKRUPTCY">Kepailitan & PKPU Kredit</option>
            <option value="DISPUTE">Sengketa Jual Beli Saham</option>
            <option value="REGULATORY">Pelanggaran Regulasi Bursa</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-xl"
          >
            <option value="ALL">Semua Status Putusan</option>
            <option value="IN_TRIAL">Sedang Disidangkan (In Trial)</option>
            <option value="VERDICT_PAILIT">Vonis Pailit (Sita Aset)</option>
            <option value="VERDICT_PKPU">Vonis PKPU (Restrukturisasi)</option>
            <option value="DISMISSED">Gugatan Ditolak</option>
          </select>
        </div>

        {filteredCases.length === 0 ? (
          <EmptyState
            title="Tidak Ada Perkara Ditemukan"
            description="Tidak ada berkas perkara yang cocok dengan kriteria pencarian Anda."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>No. Perkara & Jadwal</th>
                  <th>Gugatan & Objek Sitaan</th>
                  <th>Jenis Perkara</th>
                  <th>Nilai Tuntutan</th>
                  <th>Status & Catatan Vonis</th>
                  <th className="right">Akses & Amar Hakim</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const isInTrial = c.status === 'IN_TRIAL';
                  const isPailit = c.status === 'VERDICT_PAILIT';
                  const isPkpu = c.status === 'VERDICT_PKPU';

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="font-mono text-xs font-bold text-amber-400">
                          {c.case_number}
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                          <Calendar size={12} className="text-amber-400" />
                          <span>{c.court_hearing_date}</span>
                          <span className="text-slate-500 font-mono">({c.hearing_time || '10:00 WIB'})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[170px] mt-0.5">
                          {c.court_room_name || 'Ruang Kartika PNAF'}
                        </div>
                      </td>

                      <td>
                        <div className="font-semibold text-slate-100 max-w-xs line-clamp-1">
                          {c.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <span className="text-emerald-400 font-medium">{c.plaintiff_name}</span>
                          <span className="text-slate-600">vs</span>
                          <span className="text-rose-400 font-semibold">{c.defendant_name}</span>
                        </div>
                        {c.target_asset_description && (
                          <div className="text-[10px] text-rose-300/90 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 mt-1 inline-block line-clamp-1 max-w-xs">
                            <span className="font-bold text-rose-400">Sita Jaminan:</span> {c.target_asset_description}
                          </div>
                        )}
                      </td>

                      <td>
                        {c.case_type === 'BANKRUPTCY' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            KEPAILITAN / BCF
                          </span>
                        )}
                        {c.case_type === 'DISPUTE' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            SENGKETA SAHAM
                          </span>
                        )}
                        {c.case_type === 'REGULATORY' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            REGULASI BURSA
                          </span>
                        )}
                        {c.summons_sent === 1 && (
                          <div className="mt-1 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={10} /> Relaas Terkirim
                          </div>
                        )}
                      </td>

                      <td className="num font-bold text-slate-200">
                        {ib(c.claim_amount_ib)}
                      </td>

                      <td>
                        <div className="mb-1">
                          {isInTrial && <Badge tone="amber" pulse>SEDANG SIDANG</Badge>}
                          {isPailit && <Badge tone="rose">PAILIT / SITA</Badge>}
                          {isPkpu && <Badge tone="emerald">PKPU / DAMAI</Badge>}
                          {c.status === 'DISMISSED' && <Badge tone="slate">DITOLAK</Badge>}
                        </div>
                        <div className="text-[11px] text-slate-400 italic line-clamp-1 max-w-xs">
                          {c.verdict_notes || 'Menunggu pemeriksaan berkas pembukuan.'}
                        </div>
                      </td>

                      <td className="right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            variant={isInTrial ? 'primary' : 'ghost'}
                            size="xs"
                            onClick={() => setSelectedCaseForLiveRoom(c)}
                            icon={Video}
                            title="Masuk ke Ruang Sidang Live Majelis Hakim"
                          >
                            Live Sidang
                          </Button>

                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setSelectedCaseForSchedule(c)}
                            icon={Calendar}
                            title="Atur Jadwal & Waktu Sidang"
                          >
                            Jadwal
                          </Button>

                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setSelectedCaseForSummons(c)}
                            icon={Mail}
                            title="Kirim Surat Panggilan Resmi (Relaas)"
                          >
                            Undangan
                          </Button>

                          <Button
                            variant={isInTrial ? 'amber' : 'ghost'}
                            size="xs"
                            onClick={() => handleOpenVerdict(c)}
                            icon={Gavel}
                            title="Ketuk Palu Amar Putusan"
                          >
                            Vonis
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 3. Modal: Amar Putusan Hakim Manual */}
      <Modal
        open={Boolean(verdictModalCase)}
        onClose={() => setVerdictModalCase(null)}
        title="Sidang Majelis Hakim: Ketuk Palu Amar Putusan"
        subtitle={`Perkara No: ${verdictModalCase?.case_number}`}
        icon={Gavel}
        tone="var(--gold)"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setVerdictModalCase(null)} disabled={submittingVerdict}>
              Batal
            </Button>
            <Button
              variant="gold"
              onClick={handleSubmitVerdict}
              disabled={submittingVerdict}
              icon={Gavel}
            >
              {submittingVerdict ? 'Merekam Putusan...' : 'Ketuk Palu Vonis (3x)'}
            </Button>
          </div>
        }
      >
        {verdictModalCase && (
          <form onSubmit={handleSubmitVerdict} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <div className="font-semibold text-slate-200">{verdictModalCase.title}</div>
              <div className="text-slate-400">
                Penggugat: <span className="text-slate-200">{verdictModalCase.plaintiff_name}</span>
              </div>
              <div className="text-slate-400">
                Tergugat: <span className="text-rose-400 font-semibold">{verdictModalCase.defendant_name}</span>
              </div>
              <div className="text-slate-400">
                Total Tuntutan: <span className="font-mono font-bold text-amber-400">{ib(verdictModalCase.claim_amount_ib)}</span>
              </div>
              {verdictModalCase.target_asset_description && (
                <div className="text-slate-400">
                  Target Objek Sita: <span className="font-semibold text-rose-300">{verdictModalCase.target_asset_description}</span>
                </div>
              )}
            </div>

            <FormField label="Status Amar Putusan" hint="Vonis resmi yang akan memiliki kekuatan hukum tetap">
              <Select
                value={verdictStatus}
                onChange={(e) => setVerdictStatus(e.target.value)}
              >
                <option value="VERDICT_PAILIT">VERDICT_PAILIT (Vonis Pailit & Perintah Sita Lelang Jaminan)</option>
                <option value="VERDICT_PKPU">VERDICT_PKPU (Perjanjian Perdamaian / Restrukturisasi Kredit)</option>
                <option value="DISMISSED">DISMISSED (Gugatan Ditolak / Tidak Cukup Bukti)</option>
                <option value="IN_TRIAL">IN_TRIAL (Kembalikan ke Status Persidangan Aktif)</option>
              </Select>
            </FormField>

            <FormField label="Pertimbangan & Diktum Putusan Hakim" hint="Catatan resmi dalam berita acara persidangan Republik Federasi Indigo">
              <Textarea
                value={verdictNotes}
                onChange={(e) => setVerdictNotes(e.target.value)}
                rows={3}
                placeholder="Contoh: Majelis Hakim mengabulkan permohonan pailit. Mengangkat Kurator untuk menyita seluruh aset tergugat..."
                required
              />
            </FormField>
          </form>
        )}
      </Modal>

      {/* 4. Modal: Daftarkan Perkara Baru */}
      <Modal
        open={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        title="Pendaftaran Berkas Perkara Baru ke PNAF"
        subtitle="Registrasi sengketa niaga, kepailitan, atau wanprestasi korporasi"
        icon={Scale}
        tone="var(--gold)"
        footer={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setIsFileModalOpen(false)} disabled={submittingNewCase}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleFileNewCase}
              disabled={submittingNewCase || !newTitle || !newDefendant}
              icon={PlusCircle}
            >
              {submittingNewCase ? 'Mendaftarkan...' : 'Daftarkan ke Panitera'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleFileNewCase} className="space-y-4">
          <FormField label="Judul Gugatan Perkara" hint="Deskripsi singkat perkara sengketa">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Gugatan Kepailitan atas Gagal Bayar Kredit BIF"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Jenis Perkara">
              <Select value={newCaseType} onChange={(e) => setNewCaseType(e.target.value)}>
                <option value="BANKRUPTCY">Kepailitan & PKPU</option>
                <option value="DISPUTE">Sengketa Jual Beli Saham</option>
                <option value="REGULATORY">Pelanggaran Regulasi Bursa</option>
              </Select>
            </FormField>

            <FormField label="Nilai Tuntutan / Ganti Rugi (IB)">
              <Input
                type="number"
                value={newClaimAmount}
                onChange={(e) => setNewClaimAmount(e.target.value)}
                min="1000000"
                step="1000000"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Pihak Penggugat">
              <Input
                value={newPlaintiff}
                onChange={(e) => setNewPlaintiff(e.target.value)}
                placeholder="Contoh: Bank Sentral Indigo Federasi (BIF)"
                required
              />
            </FormField>

            <FormField label="Pihak Tergugat">
              <Input
                value={newDefendant}
                onChange={(e) => setNewDefendant(e.target.value)}
                placeholder="Contoh: PT. Makmur Jaya Abadi"
                required
              />
            </FormField>
          </div>

          <FormField label="Objek Sitaan / Barang Jaminan yang Dituntut" hint="Sebutkan barang, portofolio saham, dividen, atau rekening tergugat">
            <Input
              value={newTargetAsset}
              onChange={(e) => setNewTargetAsset(e.target.value)}
              placeholder="Contoh: Saham PT. Makmur 50.000 Lot & Rekening Kas Debitur"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Tanggal Sidang Pertama">
              <Input
                value={newHearingDate}
                onChange={(e) => setNewHearingDate(e.target.value)}
                placeholder="Contoh: Besok Pagi atau 30 Okt 2026"
                required
              />
            </FormField>

            <FormField label="Waktu Sidang">
              <Select value={newHearingTime} onChange={(e) => setNewHearingTime(e.target.value)}>
                <option value="09:00 WIB">09:00 WIB (Pagi - Sesi 1)</option>
                <option value="10:00 WIB">10:00 WIB (Pagi - Sesi 2)</option>
                <option value="13:30 WIB">13:30 WIB (Siang - Sesi 3)</option>
                <option value="15:00 WIB">15:00 WIB (Sore - Sesi 4)</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Ruang Sidang Majelis Hakim">
            <Select value={newCourtRoom} onChange={(e) => setNewCourtRoom(e.target.value)}>
              <option value="Ruang Sidang Utama Kartika PNAF">Ruang Sidang Utama Kartika PNAF</option>
              <option value="Ruang Sidang Cakra Arbitrase Niaga">Ruang Sidang Cakra Arbitrase Niaga</option>
              <option value="Ruang Mediasi Damai & PKPU">Ruang Mediasi Damai & PKPU</option>
              <option value="Majelis Khusus Sita Eksekusi">Majelis Khusus Sita Eksekusi</option>
            </Select>
          </FormField>
        </form>
      </Modal>

      {/* 5. Modal: Atur Jadwal Sidang */}
      <ScheduleHearingModal
        open={Boolean(selectedCaseForSchedule)}
        onClose={() => setSelectedCaseForSchedule(null)}
        courtCase={selectedCaseForSchedule}
        onConfirm={handleScheduleConfirm}
      />

      {/* 6. Modal: Surat Panggilan Resmi (Relaas Undangan) */}
      <CourtSummonsModal
        open={Boolean(selectedCaseForSummons)}
        onClose={() => setSelectedCaseForSummons(null)}
        courtCase={selectedCaseForSummons}
        onSend={handleSendSummons}
      />

      {/* 7. Modal: Ruang Sidang Virtual Live Majelis Hakim */}
      <LiveCourtRoomModal
        open={Boolean(selectedCaseForLiveRoom)}
        onClose={() => setSelectedCaseForLiveRoom(null)}
        courtCase={selectedCaseForLiveRoom}
        onVerdictSuccess={fetchCases}
      />
    </div>
  );
}
