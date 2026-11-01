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
import { socket } from '../../lib/socket';
import { ib } from '../../lib/format';
import { useAdmin } from '../../context/AdminContext';
import ScheduleHearingModal from './ScheduleHearingModal';
import CourtSummonsModal from './CourtSummonsModal';
import LiveCourtRoomModal from './LiveCourtRoomModal';
import {
  Gavel,
  Scale,
  CheckCircle2,
  Clock,
  PlusCircle,
  RefreshCw,
  Calendar,
  Mail,
  Video,
  Bot,
  Zap,
  Power,
  Building2,
  Search,
  X,
  Check,
  ShieldAlert,
  ShieldCheck,
  Crown,
} from 'lucide-react';

export default function CourtOversightPage() {
  const { companies = [], users = [] } = useAdmin?.() || {};
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Auto-Judge Bot State
  const [autoJudge, setAutoJudge] = useState({
    enabled: true,
    judgeName: 'Yang Mulia Hakim Agung Dr. Ariswara, S.H., M.H.',
    clerkName: 'Panitera Utama Raden Pramono, S.H.',
    activeInTrialCount: 0,
    totalDecidedByBot: 0,
  });
  const [togglingBot, setTogglingBot] = useState(false);
  const [processingNow, setProcessingNow] = useState(false);

  // Modal State: Issue Verdict
  const [verdictModalCase, setVerdictModalCase] = useState(null);
  const [verdictStatus, setVerdictStatus] = useState('VERDICT_APPROVED');
  const [verdictNotes, setVerdictNotes] = useState('');
  const [awardedAmount, setAwardedAmount] = useState('');
  const [submittingVerdict, setSubmittingVerdict] = useState(false);

  // Modal State: File New Case
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCaseType, setNewCaseType] = useState('BANKRUPTCY');
  const [newPlaintiff, setNewPlaintiff] = useState('Bank Sentral Indigo Federasi (BIF)');
  const [selectedPlaintiffComp, setSelectedPlaintiffComp] = useState(null);
  const [selectedPlaintiffUser, setSelectedPlaintiffUser] = useState(null);
  const [plaintiffSearchQuery, setPlaintiffSearchQuery] = useState('');
  const [showPlaintiffDropdown, setShowPlaintiffDropdown] = useState(false);
  const [newDefendant, setNewDefendant] = useState('');
  const [selectedDefComp, setSelectedDefComp] = useState(null);
  const [selectedDefUser, setSelectedDefUser] = useState(null);
  const [defSearchQuery, setDefSearchQuery] = useState('');
  const [showDefDropdown, setShowDefDropdown] = useState(false);
  const [newClaimAmount, setNewClaimAmount] = useState(500000000);
  const [newHearingDate, setNewHearingDate] = useState('Hari Ini');
  const [newHearingTime, setNewHearingTime] = useState('10:00 WIB');
  const [newCourtRoom, setNewCourtRoom] = useState('Ruang Sidang Utama Kartika PNAF');
  const [newTargetAsset, setNewTargetAsset] = useState('Ambil Alih Kepemilikan & Seluruh Saham Perseroan Tergugat Menjadi HAK MILIK Penggugat jika kas tidak mencukupi');
  const [newCaseDescription, setNewCaseDescription] = useState('');
  const [executionClauseType, setExecutionClauseType] = useState('TAKEOVER_PLAINTIFF');
  const [submittingNewCase, setSubmittingNewCase] = useState(false);

  const syncTitleAndDescription = (type, plComp = selectedPlaintiffComp, defComp = selectedDefComp) => {
    const plLabel = plComp ? plComp.symbol : '';
    const defLabel = defComp ? `${defComp.name} (${defComp.symbol})` : '';

    if (type === 'DEFAMATION') {
      const targetLabel = defLabel ? `terhadap ${defLabel}` : (plLabel ? `Korporasi ${plLabel}` : '');
      setNewTitle(`Gugatan Pencemaran Nama Baik & Kerugian Reputasi ${targetLabel}`.trim());
      setNewCaseDescription(
        `Tergugat dengan sengaja menyebarkan fitnah, tuduhan palsu, dan pencemaran nama baik yang merusak reputasi pasar saham ${
          plComp ? plComp.name : 'Penggugat'
        }. Menuntut pemulihan nama baik dan denda ganti rugi. Apabila kas Tergugat tidak mencukupi atau tidak membayar, 100% kepemilikan perseroan Tergugat wajib dieksekusi dan dialihkan menjadi HAK MILIK Penggugat.`
      );
      setExecutionClauseType('TAKEOVER_PLAINTIFF');
      setNewTargetAsset(
        `100% Saham & Hak Milik Perseroan ${
          defComp ? defComp.name : 'Tergugat'
        } Dialihkan Jadi Milik Penggugat jika Duit Kurang`
      );
    } else if (type === 'RECONVENTION') {
      const targetLabel = defLabel ? `terhadap ${defLabel}` : (plLabel ? `Korporasi ${plLabel}` : '');
      setNewTitle(`Gugatan Rekonvensi atas Perkara Tidak Terbukti & Tuduhan Fiktif ${targetLabel}`.trim());
      setNewCaseDescription(
        `Gugatan Rekonvensi (Tuntutan Balik): Gugatan dan tuduhan yang diajukan oleh Tergugat dalam perkara sebelumnya dinyatakan TIDAK TERBUKTI dan fiktif. Menuntut kompensasi immateriil serta pengalihan hak milik perseroan Tergugat jika denda tidak dibayar.`
      );
      setExecutionClauseType('TAKEOVER_PLAINTIFF');
      setNewTargetAsset(
        `100% Saham & Hak Milik Perseroan ${
          defComp ? defComp.name : 'Tergugat'
        } Dialihkan Jadi Milik Penggugat jika Duit Kurang`
      );
    } else if (type === 'DISPUTE') {
      setNewTitle(`Sengketa Kepemilikan Saham & Wanprestasi Akta ${defLabel ? `atas ${defLabel}` : ''}`.trim());
      setNewCaseDescription(
        `Tergugat melanggar kesepakatan akta pendirian perseroan. Menuntut pengembalian status kepemilikan saham perseroan kepada Penggugat.`
      );
      setExecutionClauseType('TAKEOVER_PLAINTIFF');
      setNewTargetAsset(`Pengembalian Kepemilikan 100% Saham Perseroan ${defComp ? defComp.name : 'Tergugat'}`);
    } else if (type === 'BANKRUPTCY') {
      setNewTitle(`Gugatan Kepailitan & Eksekusi Sita Jaminan ${defLabel ? `atas ${defLabel}` : 'atas Gagal Bayar Kredit BIF'}`.trim());
      setNewCaseDescription(
        'Tergugat telah gagal bayar (wanprestasi) atas fasilitas pembiayaan yang jatuh tempo. Menuntut pelunasan pokok plus denda bunga atau sita eksekusi seluruh aset perseroan ke Balai Lelang BCF.'
      );
      setExecutionClauseType('AUCTION_BCF');
      setNewTargetAsset(`Saham Portofolio & Kas Perseroan ${defComp ? defComp.name : 'Tergugat'} Disita ke Lelang BCF`);
    } else {
      setNewTitle(`Laporan Dugaan Manipulasi Pasar Bursa & Goreng Saham ${defLabel ? defLabel : ''}`.trim());
      setNewCaseDescription(
        `Laporan investigasi dugaan transaksi semu, goreng saham, atau manipulasi orderbook bursa yang merugikan investor pasar modal.`
      );
      setExecutionClauseType('AUCTION_BCF');
      setNewTargetAsset(`Saham Portofolio & Kas Perseroan ${defComp ? defComp.name : 'Tergugat'} Disita ke Lelang BCF`);
    }
  };

  const handleSelectPlaintiffCompany = (comp) => {
    setSelectedPlaintiffComp(comp);
    setSelectedPlaintiffUser(null);
    const ownerLabel = comp.owner_username ? ` - @${comp.owner_username}` : '';
    const plName = `${comp.name} (${comp.symbol})${ownerLabel}`;
    setNewPlaintiff(plName);
    syncTitleAndDescription(newCaseType, comp, selectedDefComp);
    setShowPlaintiffDropdown(false);
    setPlaintiffSearchQuery('');
  };

  const handleSelectPlaintiffUser = (u) => {
    setSelectedPlaintiffUser(u);
    setSelectedPlaintiffComp(null);
    const ptLabel = u.pt_name ? ` (${u.pt_name})` : '';
    const plName = `@${u.username}${ptLabel}`;
    setNewPlaintiff(plName);
    syncTitleAndDescription(newCaseType, null, selectedDefComp);
    setShowPlaintiffDropdown(false);
    setPlaintiffSearchQuery('');
  };

  const handleSelectCompany = (comp) => {
    setSelectedDefComp(comp);
    setSelectedDefUser(null);
    const ownerLabel = comp.owner_username ? ` - @${comp.owner_username}` : '';
    const defName = `${comp.name} (${comp.symbol})${ownerLabel}`;
    setNewDefendant(defName);
    syncTitleAndDescription(newCaseType, selectedPlaintiffComp, comp);
    setShowDefDropdown(false);
    setDefSearchQuery('');
  };

  const handleSelectUser = (u) => {
    setSelectedDefUser(u);
    setSelectedDefComp(null);
    const ptLabel = u.pt_name ? ` (${u.pt_name})` : '';
    const defName = `@${u.username}${ptLabel}`;
    setNewDefendant(defName);
    setNewTargetAsset(`Saham Portofolio, Dividen, dan Kas Pribadi @${u.username}`);
    if (!newTitle || newTitle.startsWith('Gugatan') || newTitle.startsWith('Sengketa') || newTitle.startsWith('Laporan') || newTitle.startsWith('Permohonan')) {
      setNewTitle(`Gugatan Wanprestasi & Gagal Bayar Kewajiban atas @${u.username}`);
    }
    setShowDefDropdown(false);
    setDefSearchQuery('');
  };

  // Interactive Modals State
  const [selectedCaseForSchedule, setSelectedCaseForSchedule] = useState(null);
  const [selectedCaseForSummons, setSelectedCaseForSummons] = useState(null);
  const [selectedCaseForLiveRoom, setSelectedCaseForLiveRoom] = useState(null);

  const fetchCasesAndStatus = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [data, botState] = await Promise.all([
        adminApi.courtCases(),
        adminApi.courtAutoJudgeStatus().catch(() => null),
      ]);
      if (Array.isArray(data)) {
        setCases(data);
      }
      if (botState) {
        setAutoJudge(botState);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar perkara:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasesAndStatus();

    const onCaseChange = () => fetchCasesAndStatus(true);
    const onBotUpdate = (payload) => {
      if (payload) setAutoJudge(payload);
    };

    socket.on('court:new_case', onCaseChange);
    socket.on('court:verdict', onCaseChange);
    socket.on('court:case_updated', onCaseChange);
    socket.on('court:auto_judge_updated', onBotUpdate);

    return () => {
      socket.off('court:new_case', onCaseChange);
      socket.off('court:verdict', onCaseChange);
      socket.off('court:case_updated', onCaseChange);
      socket.off('court:auto_judge_updated', onBotUpdate);
    };
  }, []);

  const handleToggleAutoJudge = async () => {
    try {
      setTogglingBot(true);
      const res = await adminApi.toggleCourtAutoJudge(!autoJudge.enabled);
      if (res) {
        setAutoJudge(res);
      }
      await fetchCasesAndStatus(true);
    } catch (err) {
      alert('Gagal mengubah mode Bot Hakim: ' + err.message);
    } finally {
      setTogglingBot(false);
    }
  };

  const handleProcessAllNow = async () => {
    try {
      setProcessingNow(true);
      await adminApi.processCourtAutoJudgeNow();
      await fetchCasesAndStatus(true);
    } catch (err) {
      alert('Gagal memicu putusan cepat Bot Hakim: ' + err.message);
    } finally {
      setProcessingNow(false);
    }
  };

  const handleOpenVerdict = (c) => {
    setVerdictModalCase(c);
    const nextStatus = c.status === 'IN_TRIAL' ? 'VERDICT_APPROVED' : c.status;
    setVerdictStatus(nextStatus);
    setVerdictNotes(
      c.status === 'IN_TRIAL' && /^Penggugat menuntut|^Berkas perkara/i.test(c.verdict_notes || '')
        ? ''
        : c.verdict_notes || ''
    );
    setAwardedAmount(
      c.verdict_awarded_amount > 0
        ? String(c.verdict_awarded_amount)
        : String(c.claim_amount_ib || 0)
    );
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
        awardedAmount:
          verdictStatus === 'VERDICT_REJECTED' || verdictStatus === 'IN_TRIAL'
            ? 0
            : awardedAmount !== ''
            ? Number(awardedAmount)
            : undefined,
      });
      setVerdictModalCase(null);
      await fetchCasesAndStatus(true);
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
        plaintiffCompanyId: selectedPlaintiffComp?.id || null,
        plaintiffUserId: selectedPlaintiffComp?.owner_id || selectedPlaintiffUser?.id || null,
        defendantName: newDefendant,
        defendantCompanyId: selectedDefComp?.id || null,
        defendantUserId: selectedDefComp?.owner_id || selectedDefUser?.id || null,
        claimAmountIb: Number(newClaimAmount),
        courtHearingDate: newHearingDate,
        hearingTime: newHearingTime,
        courtRoomName: newCourtRoom,
        targetAssetDescription: newTargetAsset,
        notes: newCaseDescription || `Perkara ${newTitle}. Eksekusi: ${newTargetAsset}.`,
      });
      setIsFileModalOpen(false);
      setNewTitle('');
      setNewDefendant('');
      setNewCaseDescription('');
      setSelectedDefComp(null);
      setSelectedDefUser(null);
      setSelectedPlaintiffComp(null);
      setSelectedPlaintiffUser(null);
      await fetchCasesAndStatus(true);
    } catch (err) {
      alert('Gagal mendaftarkan perkara: ' + err.message);
    } finally {
      setSubmittingNewCase(false);
    }
  };

  const handleScheduleConfirm = async (caseId, payload) => {
    try {
      await adminApi.scheduleCourtHearing(caseId, payload);
      await fetchCasesAndStatus(true);
    } catch (err) {
      alert('Gagal menetapkan jadwal sidang: ' + err.message);
    }
  };

  const handleSendSummons = async (caseId) => {
    try {
      await adminApi.sendCourtSummons(caseId);
      await fetchCasesAndStatus(true);
    } catch (err) {
      alert('Gagal mengirim surat panggilan sidang: ' + err.message);
    }
  };

  const inTrialCount = cases.filter((c) => c.status === 'IN_TRIAL').length;
  const approvedCount = cases.filter((c) => c.status === 'VERDICT_APPROVED').length;
  const pkpuCount = cases.filter((c) => c.status === 'VERDICT_PKPU').length;
  const pailitCount = cases.filter((c) => c.status === 'VERDICT_PAILIT').length;

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      !search ||
      (c.title && c.title.toLowerCase().includes(search.toLowerCase())) ||
      (c.case_number && c.case_number.toLowerCase().includes(search.toLowerCase())) ||
      (c.plaintiff_name && c.plaintiff_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.defendant_name && c.defendant_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.target_asset_description && c.target_asset_description.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || c.case_type === typeFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      c.status === statusFilter ||
      (statusFilter === 'VERDICT_REJECTED' && (c.status === 'VERDICT_REJECTED' || c.status === 'DISMISSED'));

    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredCompaniesForPlaintiff = (companies || [])
    .filter((c) => {
      if (!plaintiffSearchQuery) return true;
      const q = plaintiffSearchQuery.toLowerCase();
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.symbol && c.symbol.toLowerCase().includes(q)) ||
        (c.owner_username && c.owner_username.toLowerCase().includes(q)) ||
        (c.sector && c.sector.toLowerCase().includes(q))
      );
    })
    .slice(0, 15);

  const filteredUsersForPlaintiff = (users || [])
    .filter((u) => {
      if (!plaintiffSearchQuery) return true;
      const q = plaintiffSearchQuery.toLowerCase();
      return (
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.pt_name && u.pt_name.toLowerCase().includes(q))
      );
    })
    .slice(0, 8);

  const filteredCompaniesForDef = (companies || [])
    .filter((c) => {
      if (!defSearchQuery) return true;
      const q = defSearchQuery.toLowerCase();
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.symbol && c.symbol.toLowerCase().includes(q)) ||
        (c.owner_username && c.owner_username.toLowerCase().includes(q)) ||
        (c.sector && c.sector.toLowerCase().includes(q))
      );
    })
    .slice(0, 15);

  const filteredUsersForDef = (users || [])
    .filter((u) => {
      if (!defSearchQuery) return true;
      const q = defSearchQuery.toLowerCase();
      return (
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.pt_name && u.pt_name.toLowerCase().includes(q))
      );
    })
    .slice(0, 8);

  return (
    <div className="space-y-6 page-enter">
      {/* 0. Executive Control Panel: Majelis Hakim Arbitrase PNAF (ON / OFF Manual) */}
      <Card
        className={`border transition-all ${
          autoJudge.enabled
            ? 'bg-gradient-to-r from-emerald-500/10 via-slate-900/80 to-amber-500/10 border-emerald-500/40'
            : 'bg-gradient-to-r from-amber-500/10 via-slate-900/80 to-slate-900 border-amber-500/40'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-2xl border shrink-0 ${
                autoJudge.enabled
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                  : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
              }`}
            >
              <Scale size={24} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-slate-100 uppercase">
                  Majelis Hakim Arbitrase & Kepaniteraan PNAF
                </h3>
                {autoJudge.enabled ? (
                  <Badge tone="emerald" pulse>
                    SIDANG ARBITRASE AKTIF (24/7)
                  </Badge>
                ) : (
                  <Badge tone="amber">MODE MANUAL HAKIM AGUNG</Badge>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {autoJudge.enabled
                  ? `Dipimpin oleh ${autoJudge.judgeName} & ${autoJudge.clerkName}. Sistem memproses otomatis Relaas Panggilan, pemeriksaan bukti akta notariat, kehadiran kuasa hukum para pihak, dan pembacaan amar putusan (APPROVED / PKPU / PAILIT / DITOLAK).`
                  : 'Mode Otomatis dimatikan. Seluruh perkara yang masuk akan menunggu jadwal, pemeriksaan, dan ketukan palu manual dari Anda selaku Hakim Agung.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-400 font-medium">
                <span>
                  Antrean Sidang Aktif: <strong className="text-amber-300">{inTrialCount} Perkara</strong>
                </span>
                <span>
                  Diputus Majelis Hakim: <strong className="text-emerald-300">{autoJudge.totalDecidedByBot || 0} Perkara</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end">
            {inTrialCount > 0 && (
              <Button
                variant="amber"
                size="sm"
                icon={Zap}
                disabled={processingNow}
                onClick={handleProcessAllNow}
                title="Minta Majelis Hakim memutus seluruh perkara yang sedang berlangsung sekarang juga"
              >
                {processingNow ? 'Memutus Sidang...' : `Putuskan Instan (${inTrialCount})`}
              </Button>
            )}
            <Button
              variant={autoJudge.enabled ? 'ghost' : 'primary'}
              size="sm"
              icon={Power}
              disabled={togglingBot}
              onClick={handleToggleAutoJudge}
              className={
                autoJudge.enabled
                  ? 'border border-rose-500/40 text-rose-300 hover:bg-rose-500/15'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }
            >
              {togglingBot
                ? 'Menyimpan...'
                : autoJudge.enabled
                ? 'Matikan Otomatis (Ubah ke Manual)'
                : 'Aktifkan Sidang Arbitrase Otomatis'}
            </Button>
          </div>
        </div>
      </Card>

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
          label="Sedang Disidangkan"
          value={inTrialCount}
          hint={autoJudge.enabled ? 'Diproses Majelis Hakim PNAF' : 'Menunggu Ketuk Palu Manual'}
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Dikabulkan (Approved)"
          value={approvedCount + pkpuCount}
          hint={`${approvedCount} Dikabulkan Penuh • ${pkpuCount} PKPU`}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Putusan Pailit / Sita"
          value={pailitCount}
          hint="Eksekusi Aset Jaminan"
          icon={Gavel}
          tone="rose"
        />
      </div>

      {/* 2. Main Case Oversight Table */}
      <Card>
        <CardHeader
          title="Pengadilan Niaga & Arbitrase Federasi Indigo (PNAF)"
          subtitle="Kepaniteraan resmi sengketa akta saham, wanprestasi Bank Sentral BCF, dan eksekusi putusan tersinkronisasi ke APK"
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
                onClick={() => fetchCasesAndStatus()}
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
            placeholder="Cari nomor perkara, pihak, akta, aset..."
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-xl"
          >
            <option value="ALL">Semua Jenis Perkara</option>
            <option value="DISPUTE">Sengketa Akta & Jual Beli Saham</option>
            <option value="BANKRUPTCY">Kepailitan & PKPU Kredit</option>
            <option value="REGULATORY">Pelanggaran Regulasi Bursa</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-xl"
          >
            <option value="ALL">Semua Status Putusan</option>
            <option value="IN_TRIAL">Sedang Disidangkan (In Trial)</option>
            <option value="VERDICT_APPROVED">Dikabulkan / Approved</option>
            <option value="VERDICT_PKPU">Disetujui Mediasi / PKPU</option>
            <option value="VERDICT_PAILIT">Vonis Pailit (Sita Aset)</option>
            <option value="VERDICT_REJECTED">Ditolak / Gugur</option>
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
                  <th>Gugatan & Para Pihak</th>
                  <th>Jenis Perkara</th>
                  <th>Tuntutan & Eksekusi</th>
                  <th>Status Putusan (Live APK)</th>
                  <th className="right">Akses & Amar Hakim</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => {
                  const isInTrial = c.status === 'IN_TRIAL';
                  const isApproved = c.status === 'VERDICT_APPROVED';
                  const isPailit = c.status === 'VERDICT_PAILIT';
                  const isPkpu = c.status === 'VERDICT_PKPU';
                  const isRejected = c.status === 'VERDICT_REJECTED' || c.status === 'DISMISSED';

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
                        <div className="text-[10px] text-slate-500 truncate max-w-[180px] mt-0.5">
                          {c.court_room_name || 'Ruang Kartika PNAF'}
                        </div>
                      </td>

                      <td>
                        <div className="font-semibold text-slate-100 max-w-xs line-clamp-1">
                          {c.title}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 flex-wrap">
                          <span className="text-emerald-400 font-medium">{c.plaintiff_name}</span>
                          <span className="text-slate-600">vs</span>
                          <span className="text-rose-400 font-semibold">{c.defendant_name}</span>
                        </div>
                        {c.target_asset_description && (
                          <div className="text-[10px] text-rose-300/90 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 mt-1 inline-block line-clamp-1 max-w-xs">
                            <span className="font-bold text-rose-400">Objek:</span> {c.target_asset_description}
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

                      <td className="num">
                        <div className="font-bold text-slate-200">{ib(c.claim_amount_ib)}</div>
                        {c.verdict_awarded_amount > 0 && (
                          <div className="text-[10px] font-mono font-bold text-emerald-400 mt-0.5">
                            Cair: {ib(c.verdict_awarded_amount)}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {isInTrial && <Badge tone="amber" pulse>SEDANG SIDANG</Badge>}
                          {isApproved && <Badge tone="emerald">DIKABULKAN (APPROVED)</Badge>}
                          {isPkpu && <Badge tone="sky">PKPU / DAMAI</Badge>}
                          {isPailit && <Badge tone="rose">PAILIT / SITA</Badge>}
                          {isRejected && <Badge tone="slate">DITOLAK / GUGUR</Badge>}
                          {!isInTrial && c.decided_by === 'BOT_JUDGE' && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              ⚖️ MAJELIS HAKIM PNAF
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 italic line-clamp-2 max-w-xs">
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
                            {isInTrial ? 'Live Sidang' : 'Arsip Sidang'}
                          </Button>

                          {isInTrial && (
                            <>
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
                            </>
                          )}

                          <Button
                            variant={isInTrial ? 'amber' : 'ghost'}
                            size="xs"
                            onClick={() => handleOpenVerdict(c)}
                            icon={Gavel}
                            title="Ketuk Palu Amar Putusan"
                          >
                            {isInTrial ? 'Ketuk Palu' : 'Ubah Vonis'}
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
              {submittingVerdict ? 'Merekam Putusan...' : 'Ketuk Palu Vonis & Sinkron APK'}
            </Button>
          </div>
        }
      >
        {verdictModalCase && (
          <form onSubmit={handleSubmitVerdict} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <div className="font-semibold text-slate-200">{verdictModalCase.title}</div>
              <div className="text-slate-400">
                Penggugat: <span className="text-emerald-300 font-semibold">{verdictModalCase.plaintiff_name}</span>
              </div>
              <div className="text-slate-400">
                Tergugat: <span className="text-rose-400 font-semibold">{verdictModalCase.defendant_name}</span>
              </div>
              <div className="text-slate-400">
                Total Tuntutan: <span className="font-mono font-bold text-amber-400">{ib(verdictModalCase.claim_amount_ib)}</span>
              </div>
            </div>

            <FormField label="Status Amar Putusan (Langsung Sinkron ke APK)" hint="Pilih DIKABULKAN (APPROVED) untuk menyetujui gugatan/permohonan pemain">
              <Select
                value={verdictStatus}
                onChange={(e) => {
                  const val = e.target.value;
                  setVerdictStatus(val);
                  const claim = Number(verdictModalCase.claim_amount_ib || 0);
                  if (val === 'VERDICT_APPROVED' || val === 'VERDICT_PAILIT') {
                    setAwardedAmount(String(claim));
                  } else if (val === 'VERDICT_PKPU') {
                    setAwardedAmount(String(Math.round(claim * 0.5)));
                  } else {
                    setAwardedAmount('0');
                  }
                }}
              >
                <option value="VERDICT_APPROVED">✅ VERDICT_APPROVED (Gugatan / Permohonan Dikabulkan — Approved)</option>
                <option value="VERDICT_PKPU">🤝 VERDICT_PKPU (Mediasi Damai / Restrukturisasi Kredit 50%)</option>
                <option value="VERDICT_PAILIT">🔨 VERDICT_PAILIT (Vonis Pailit & Sita Eksekusi Jaminan)</option>
                <option value="VERDICT_REJECTED">❌ VERDICT_REJECTED (Gugatan Ditolak / Gugur Demi Hukum)</option>
                <option value="IN_TRIAL">🔄 IN_TRIAL (Buka Kembali ke Status Persidangan Aktif)</option>
              </Select>
            </FormField>

            {verdictStatus !== 'VERDICT_REJECTED' && verdictStatus !== 'IN_TRIAL' && (
              <FormField
                label="Nilai Pencairan Kompensasi / Eksekusi (IB)"
                hint="Dana yang dicairkan ke Kas Pribadi Penggugat (isi 0 jika hanya pengesahan non-tunai/PKPU)"
              >
                <Input
                  type="number"
                  min="0"
                  step="1000000"
                  value={awardedAmount}
                  onChange={(e) => setAwardedAmount(e.target.value)}
                />
              </FormField>
            )}

            <FormField label="Pertimbangan & Diktum Putusan Hakim" hint="Kosongkan untuk membuat diktum hukum resmi secara otomatis">
              <Textarea
                value={verdictNotes}
                onChange={(e) => setVerdictNotes(e.target.value)}
                rows={3}
                placeholder="Contoh: Majelis Hakim mengabulkan gugatan Penggugat secara penuh (APPROVED) dan memerintahkan pencairan klaim..."
              />
            </FormField>
          </form>
        )}
      </Modal>

      {/* 4. Modal: Daftarkan Perkara Baru */}
      <Modal
        width={780}
        open={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        title="Pendaftaran Berkas Perkara Baru ke PNAF"
        subtitle="Registrasi sengketa niaga, kepailitan, atau wanprestasi korporasi"
        icon={Scale}
        tone="var(--gold)"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-[11px] text-slate-400 hidden sm:block">
              <span className="text-amber-400 font-semibold">Biaya Panitera:</span> Lembaga Negara / BIF Bebas Biaya • Pemain: IB 250.000
            </div>
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
          </div>
        }
      >
        <form onSubmit={handleFileNewCase} className="space-y-3.5">
          {/* Quick Case Archetypes Shortcut */}
          <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                ⚡ Template Kilat Kategori Perkara & Tuntutan:
              </span>
              <span className="text-[10px] text-amber-400 font-semibold">1-Klik Langsung Terisi Lengkap</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setNewCaseType('DEFAMATION');
                  syncTitleAndDescription('DEFAMATION');
                }}
                className={`p-2 rounded-lg text-left text-xs font-bold border transition-all ${
                  newCaseType === 'DEFAMATION'
                    ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-sm shadow-sky-500/20'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] text-sky-400 font-bold mb-0.5">
                  🛡️ Pencemaran Nama Baik
                </div>
                <div className="text-[10px] text-slate-400 font-normal leading-tight">
                  Fitnah pasar & ambil alih PT jika kas kurang
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewCaseType('RECONVENTION');
                  syncTitleAndDescription('RECONVENTION');
                }}
                className={`p-2 rounded-lg text-left text-xs font-bold border transition-all ${
                  newCaseType === 'RECONVENTION'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-sm shadow-amber-500/20'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold mb-0.5">
                  ⚔️ Gugatan Tidak Terbukti
                </div>
                <div className="text-[10px] text-slate-400 font-normal leading-tight">
                  Rekonvensi tuduhan fiktif & sita saham
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewCaseType('BANKRUPTCY');
                  syncTitleAndDescription('BANKRUPTCY');
                }}
                className={`p-2 rounded-lg text-left text-xs font-bold border transition-all ${
                  newCaseType === 'BANKRUPTCY'
                    ? 'bg-rose-500/20 text-rose-200 border-rose-500/50 shadow-sm shadow-rose-500/20'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] text-rose-400 font-bold mb-0.5">
                  ⚖️ Kepailitan & PKPU
                </div>
                <div className="text-[10px] text-slate-400 font-normal leading-tight">
                  Gagal bayar utang & lelang terbuka BCF
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewCaseType('DISPUTE');
                  syncTitleAndDescription('DISPUTE');
                }}
                className={`p-2 rounded-lg text-left text-xs font-bold border transition-all ${
                  newCaseType === 'DISPUTE'
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-950/70 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold mb-0.5">
                  📜 Sengketa Akta & Saham
                </div>
                <div className="text-[10px] text-slate-400 font-normal leading-tight">
                  Pelanggaran akta & pemulihan kontrol
                </div>
              </button>
            </div>
          </div>

          {/* Section 1: Pokok Gugatan & Jenis Perkara */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-7">
              <FormField label="Judul Gugatan Perkara" hint="Deskripsi singkat pokok perkara sengketa">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Gugatan Kepailitan atas Gagal Bayar Kredit BIF"
                  required
                />
              </FormField>
              {/* Quick Template Pills */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {newCaseType === 'DEFAMATION' ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setNewTitle(
                          `Gugatan Pencemaran Nama Baik & Kerugian Reputasi Korporasi ${
                            selectedPlaintiffComp ? selectedPlaintiffComp.symbol : ''
                          }`.trim()
                        )
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300 hover:text-white hover:border-sky-500/50 transition-colors"
                    >
                      🛡️ Pencemaran Nama Baik & Reputasi
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewTitle('Gugatan Ganti Rugi atas Berita Bohong & Kejatuhan Kapitalisasi Pasar Saham')
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-sky-500/50 transition-colors"
                    >
                      📉 Fitnah & Kerugian Market Cap
                    </button>
                  </>
                ) : newCaseType === 'RECONVENTION' ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setNewTitle(
                          `Gugatan Balasan Rekonvensi: Tuntutan Kerugian atas Perkara Tidak Terbukti / Fiktif ${
                            selectedPlaintiffComp ? selectedPlaintiffComp.symbol : ''
                          }`.trim()
                        )
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 hover:text-white hover:border-amber-500/50 transition-colors"
                    >
                      ⚔️ Rekonvensi (Perkara Tidak Terbukti)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewTitle('Permohonan Rehabilitasi Korporasi & Ganti Rugi Biaya Perkara Fiktif')
                      }
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/50 transition-colors"
                    >
                      🏛️ Rehabilitasi & Ganti Rugi Immaterial
                    </button>
                  </>
                ) : newCaseType === 'BANKRUPTCY' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setNewTitle('Gugatan Kepailitan atas Gagal Bayar Kredit BIF')}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-rose-300 hover:text-white hover:border-rose-500/50 transition-colors"
                    >
                      ⚖️ Kepailitan Gagal Bayar Kredit BIF
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTitle('Permohonan PKPU & Moratorium Utang Operasional')}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-rose-500/50 transition-colors"
                    >
                      💼 Permohonan PKPU & Moratorium
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setNewTitle('Sengketa Kepemilikan Saham & Wanprestasi Perjanjian Notaris')}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-300 hover:text-white hover:border-amber-500/50 transition-colors"
                    >
                      📜 Sengketa Saham & Akta
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTitle('Laporan Dugaan Manipulasi Pasar Bursa OPFF')}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/50 transition-colors"
                    >
                      🚨 Pelanggaran Regulasi Bursa
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="md:col-span-5">
              <FormField label="Jenis / Kategori Perkara">
                <Select
                  value={newCaseType}
                  onChange={(e) => {
                    const ct = e.target.value;
                    setNewCaseType(ct);
                    syncTitleAndDescription(ct);
                  }}
                >
                  <option value="BANKRUPTCY">⚖️ Kepailitan & PKPU (Sita Debitur)</option>
                  <option value="DISPUTE">📜 Sengketa Akta & Saham</option>
                  <option value="REGULATORY">🚨 Pelanggaran Regulasi Bursa</option>
                  <option value="DEFAMATION">🛡️ Pencemaran Nama Baik & Kerugian Reputasi</option>
                  <option value="RECONVENTION">⚔️ Rekonvensi / Perkara Tidak Terbukti</option>
                </Select>
              </FormField>
            </div>
          </div>

          {/* Uraian / Deskripsi Pokok Perkara & Duduk Fakta */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">
                Deskripsi Pokok Perkara & Duduk Fakta Sengketa
              </label>
              <span className="text-[10px] text-slate-400">Pilih template cepat:</span>
            </div>
            <Textarea
              value={newCaseDescription}
              onChange={(e) => setNewCaseDescription(e.target.value)}
              rows={2}
              placeholder="Contoh: Tergugat menyebarkan fitnah finansial yang merusak reputasi saham Penggugat. Menuntut ganti rugi, dan jika kas tidak cukup atau Tergugat tidak membayar, perseroan Tergugat diambil alih menjadi hak milik Penggugat."
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setExecutionClauseType('TAKEOVER_PLAINTIFF');
                  setNewCaseDescription(
                    `Tergugat dengan sengaja menyebarkan fitnah, tuduhan palsu, dan pencemaran nama baik yang merusak reputasi pasar saham ${
                      selectedPlaintiffComp ? selectedPlaintiffComp.name : 'Penggugat'
                    }. Menuntut pemulihan reputasi dan ganti rugi. Apabila kas Tergugat tidak mencukupi atau gagal bayar, perseroan Tergugat wajib disita dan dialihkan menjadi HAK MILIK Penggugat.`
                  );
                }}
                className="text-[10px] px-2 py-1 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 hover:bg-sky-500/20 transition-colors"
              >
                🛡️ Fitnah & Ambil Alih Hak Milik
              </button>
              <button
                type="button"
                onClick={() => {
                  setExecutionClauseType('TAKEOVER_PLAINTIFF');
                  setNewCaseDescription(
                    `Gugatan Rekonvensi (Tuntutan Balik): Tuduhan Tergugat dalam perkara sebelumnya dinyatakan TIDAK TERBUKTI dan fiktif. Menuntut kompensasi immateriil dan sita eksekusi hak milik aset perseroan Tergugat.`
                  );
                }}
                className="text-[10px] px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                ⚔️ Rekonvensi & Perkara Tidak Terbukti
              </button>
              <button
                type="button"
                onClick={() => {
                  setExecutionClauseType('TAKEOVER_PLAINTIFF');
                  setNewCaseDescription(
                    `Klausul Eksekusi Pengalihan Hak Milik: Apabila Tergugat tidak mampu membayar ganti rugi atau kas tidak mencukupi, 100% kepemilikan perseroan Tergugat langsung disita dan diserahkan menjadi HAK MILIK Penggugat.`
                  );
                }}
                className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              >
                👑 Sita Hak Milik jika Duit Kurang
              </button>
              <button
                type="button"
                onClick={() =>
                  setNewCaseDescription(
                    `Tergugat gagal memenuhi kewajiban pembayaran finansial yang jatuh tempo. Menuntut pelunasan segera atau sita jaminan perseroan Tergugat ke balai lelang.`
                  )
                }
                className="text-[10px] px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors"
              >
                ⚖️ Wanprestasi & Gagal Bayar
              </button>
            </div>
          </div>

          {/* Section 2: Para Pihak yang Bersengketa (Penggugat vs Tergugat) */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kolom Kiri: Pihak Penggugat (Bisa Pilih Emiten yang Ingin Dibela) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Pihak Penggugat (Pengaju / Klien yang Dibela)</label>
                  <span className="text-[10px] text-sky-400 font-bold bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                    360+ Emiten
                  </span>
                </div>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={newPlaintiff}
                        onChange={(e) => {
                          setNewPlaintiff(e.target.value);
                          setPlaintiffSearchQuery(e.target.value);
                          setShowPlaintiffDropdown(true);
                        }}
                        onFocus={() => setShowPlaintiffDropdown(true)}
                        placeholder="Ketik kode (ARPD, BALN) atau nama PT / Penggugat..."
                        required
                      />
                      {newPlaintiff && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewPlaintiff('');
                            setSelectedPlaintiffComp(null);
                            setSelectedPlaintiffUser(null);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPlaintiffDropdown(!showPlaintiffDropdown)}
                      icon={Search}
                    >
                      Cari PT
                    </Button>
                  </div>

                  {/* Autocomplete Dropdown List Penggugat */}
                  {showPlaintiffDropdown && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1 backdrop-blur-md">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                        <span>Pilih Emiten atau Pemain yang Ingin Dibela</span>
                        <button
                          type="button"
                          onClick={() => setShowPlaintiffDropdown(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          Tutup [X]
                        </button>
                      </div>

                      {filteredCompaniesForPlaintiff.length === 0 && filteredUsersForPlaintiff.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-500">
                          Tidak ada emiten atau pemain yang cocok dengan "{plaintiffSearchQuery}"
                        </div>
                      )}

                      {filteredCompaniesForPlaintiff.map((comp) => (
                        <div
                          key={comp.id}
                          onClick={() => handleSelectPlaintiffCompany(comp)}
                          className="flex items-center justify-between p-2 hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-700"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                              {comp.symbol}
                            </span>
                            <div>
                              <div className="text-xs font-semibold text-slate-200">{comp.name}</div>
                              <div className="text-[10px] text-slate-400">
                                @{comp.owner_username || 'Publik'} • {comp.sector}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-xs font-bold text-emerald-400">
                              IB {Number(comp.current_price || 0).toLocaleString('id-ID')}
                            </div>
                            <span className="text-[9px] text-sky-400 font-semibold">Pilih sbg Klien</span>
                          </div>
                        </div>
                      ))}

                      {filteredUsersForPlaintiff.length > 0 && (
                        <>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-2 pb-1 border-t border-slate-800">
                            Konglomerat Pemain
                          </div>
                          {filteredUsersForPlaintiff.map((u) => (
                            <div
                              key={u.id}
                              onClick={() => handleSelectPlaintiffUser(u)}
                              className="flex items-center justify-between p-2 hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors"
                            >
                              <div>
                                <span className="font-bold text-xs text-sky-400">@{u.username}</span>
                                {u.pt_name && (
                                  <span className="text-xs text-slate-300 ml-1.5 font-medium">({u.pt_name})</span>
                                )}
                              </div>
                              <div className="text-right text-[10px] text-slate-400 font-mono">
                                Kas: IB {Number(u.balance_ib || 0).toLocaleString('id-ID')}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Presets Lembaga / Kas Negara */}
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {[
                    { label: '🏛️ Bank Sentral BIF', val: 'Bank Sentral Indigo Federasi (BIF)' },
                    { label: '🛡️ Otoritas Bursa OPFF', val: 'Otoritas Pengawas Finansial Federasi (OPFF)' },
                    { label: '🏦 Kas Negara Federasi', val: 'Kas Negara / Treasury Federasi' },
                    { label: '👑 PT. Syafiq Capital', val: 'PT. Syafiq Capital Tbk. (@msyafiq19)' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSelectedPlaintiffComp(null);
                        setSelectedPlaintiffUser(null);
                        setNewPlaintiff(preset.val);
                      }}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border text-left truncate transition-colors ${
                        newPlaintiff === preset.val
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                          : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Card Emiten Klien yang terpilih */}
                {selectedPlaintiffComp && (
                  <div className="mt-2 p-2 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-start gap-2">
                    <ShieldCheck className="text-sky-400 mt-0.5 shrink-0" size={14} />
                    <div className="text-[11px] leading-tight flex-1">
                      <span className="font-bold text-sky-300">
                        {selectedPlaintiffComp.name} ({selectedPlaintiffComp.symbol})
                      </span>
                      <span className="text-slate-400"> • @{selectedPlaintiffComp.owner_username || 'Publik'}</span>
                      <p className="text-[10px] text-sky-200/90 mt-0.5">
                        🛡️ Pembelaan & Pemulihan: Tuntutan ganti rugi pencemaran nama baik atau gugatan balik atas perkara tidak terbukti.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Pihak Tergugat */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Pihak Tergugat (Sasaran Sita)</label>
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                    360+ Emiten
                  </span>
                </div>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        value={newDefendant}
                        onChange={(e) => {
                          setNewDefendant(e.target.value);
                          setDefSearchQuery(e.target.value);
                          setShowDefDropdown(true);
                        }}
                        onFocus={() => setShowDefDropdown(true)}
                        placeholder="Ketik kode (ARPD, BALN) atau nama PT..."
                        required
                      />
                      {newDefendant && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewDefendant('');
                            setSelectedDefComp(null);
                            setSelectedDefUser(null);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDefDropdown(!showDefDropdown)}
                      icon={Search}
                    >
                      Cari PT
                    </Button>
                  </div>

                  {/* Autocomplete Dropdown List */}
                  {showDefDropdown && (
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1 backdrop-blur-md">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                        <span>Hasil Pencarian Emiten & Pemain</span>
                        <button
                          type="button"
                          onClick={() => setShowDefDropdown(false)}
                          className="text-slate-400 hover:text-white"
                        >
                          Tutup [X]
                        </button>
                      </div>

                      {filteredCompaniesForDef.length === 0 && filteredUsersForDef.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-500">
                          Tidak ada emiten atau pemain yang cocok dengan "{defSearchQuery}"
                        </div>
                      )}

                      {filteredCompaniesForDef.map((comp) => (
                        <div
                          key={comp.id}
                          onClick={() => handleSelectCompany(comp)}
                          className="flex items-center justify-between p-2 hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-slate-700"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              {comp.symbol}
                            </span>
                            <div>
                              <div className="text-xs font-semibold text-slate-200">{comp.name}</div>
                              <div className="text-[10px] text-slate-400">
                                @{comp.owner_username || 'Publik'} • {comp.sector}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-xs font-bold text-emerald-400">
                              IB {Number(comp.current_price || 0).toLocaleString('id-ID')}
                            </div>
                            {comp.is_seized === 1 ? (
                              <span className="text-[9px] text-rose-400 font-bold bg-rose-500/10 px-1 rounded border border-rose-500/20">
                                DISITA
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-500">Aktif</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {filteredUsersForDef.length > 0 && (
                        <>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-2 pb-1 border-t border-slate-800">
                            Konglomerat Pemain
                          </div>
                          {filteredUsersForDef.map((u) => (
                            <div
                              key={u.id}
                              onClick={() => handleSelectUser(u)}
                              className="flex items-center justify-between p-2 hover:bg-slate-800/80 rounded-lg cursor-pointer transition-colors"
                            >
                              <div>
                                <span className="font-bold text-xs text-sky-400">@{u.username}</span>
                                {u.pt_name && <span className="text-xs text-slate-300 ml-1.5 font-medium">({u.pt_name})</span>}
                              </div>
                              <div className="text-right text-[10px] text-slate-400 font-mono">
                                Kas: IB {Number(u.balance_ib || 0).toLocaleString('id-ID')}
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Target Card jika sudah terpilih */}
                {selectedDefComp && (
                  <div className="mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2">
                    <ShieldAlert className="text-rose-400 mt-0.5 shrink-0" size={14} />
                    <div className="text-[11px] leading-tight flex-1">
                      <span className="font-bold text-amber-300">{selectedDefComp.name} ({selectedDefComp.symbol})</span>
                      <span className="text-slate-400"> • @{selectedDefComp.owner_username || 'Bot'}</span>
                      <p className="text-[10px] text-rose-300 mt-0.5">
                        ⚡ Vonis Bersalah: Kas dipotong ganti rugi & perseroan langsung DISITA ke Lelang BCF!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Tuntutan Ganti Rugi & Klausul Eksekusi */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Nilai Tuntutan Ganti Rugi (IB)</label>
                  <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">
                    IB {Number(newClaimAmount || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <Input
                  type="number"
                  value={newClaimAmount}
                  onChange={(e) => setNewClaimAmount(e.target.value)}
                  min="0"
                  step="1000000"
                  required
                />
                <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                  {[50000000, 100000000, 500000000, 1000000000, 5000000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNewClaimAmount(amt)}
                      className={`py-1 rounded text-[10px] font-semibold border text-center transition-colors ${
                        Number(newClaimAmount) === amt
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {amt >= 1000000000 ? `${amt / 1000000000} M` : `${amt / 1000000} Jt`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Klausul Eksekusi Jika Tergugat Kalah</label>
                  <span className="text-[10px] text-amber-400 font-bold">Pilih Mekanisme</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExecutionClauseType('TAKEOVER_PLAINTIFF');
                      setNewTargetAsset(
                        `100% Saham & Hak Milik Perseroan ${
                          selectedDefComp ? selectedDefComp.name : 'Tergugat'
                        } Dialihkan Jadi Milik Penggugat jika Duit Kurang`
                      );
                    }}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      executionClauseType === 'TAKEOVER_PLAINTIFF'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm shadow-amber-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
                      <Crown size={13} className="text-amber-400" />
                      Ambil Alih Hak Milik
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                      Jika uang kurang / tidak bayar, PT jadi milik Penggugat
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExecutionClauseType('AUCTION_BCF');
                      setNewTargetAsset(
                        `Saham Portofolio & Kas Perseroan ${
                          selectedDefComp ? selectedDefComp.name : 'Tergugat'
                        } Disita ke Lelang BCF`
                      );
                    }}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      executionClauseType === 'AUCTION_BCF'
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-sm shadow-sky-500/30'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-sky-300">
                      <Scale size={13} className="text-sky-400" />
                      Sita Lelang BCF
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                      Dilelang terbuka ke bursa Balai Lelang BCF
                    </div>
                  </button>
                </div>

                {executionClauseType === 'TAKEOVER_PLAINTIFF' ? (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-200/90 leading-tight">
                    <span className="font-bold text-amber-300">👑 KLAUSUL AKUISISI EKSEKUSI:</span> Jika Tergugat kalah dan kasnya tidak cukup / gagal bayar, 100% saham dan status kepemilikan PT Tergugat langsung <b>DIALIHKAN menjadi HAK MILIK Penggugat</b>!
                  </div>
                ) : (
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 leading-tight">
                    <span className="font-bold text-slate-300">🏛️ SITA LELANG BCF:</span> Perseroan Tergugat disita oleh Pengadilan dan dimasukkan ke antrean lelang terbuka publik BCF.
                  </div>
                )}
              </div>
            </div>

            <FormField label="Rincian Objek Sitaan / Jaminan yang Dituntut" hint="Aset yang otomatis dieksekusi saat putusan dikabulkan">
              <Input
                value={newTargetAsset}
                onChange={(e) => setNewTargetAsset(e.target.value)}
                placeholder="Contoh: 100% Saham & Hak Milik Perseroan Tergugat Dialihkan ke Penggugat"
                required
              />
            </FormField>
          </div>

          {/* Section 4: Penjadwalan Sidang Majelis Hakim (3 Kolom) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Tanggal Sidang Pertama">
              <Input
                value={newHearingDate}
                onChange={(e) => setNewHearingDate(e.target.value)}
                placeholder="Hari Ini atau 31 Okt 2026"
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

            <FormField label="Ruang Sidang Majelis Hakim">
              <Select value={newCourtRoom} onChange={(e) => setNewCourtRoom(e.target.value)}>
                <option value="Ruang Sidang Utama Kartika PNAF">Ruang Utama Kartika PNAF</option>
                <option value="Ruang Sidang Cakra Arbitrase Niaga">Ruang Cakra Arbitrase Niaga</option>
                <option value="Ruang Mediasi Damai & PKPU">Ruang Mediasi Damai & PKPU</option>
                <option value="Majelis Khusus Sita Eksekusi">Majelis Khusus Sita Eksekusi</option>
              </Select>
            </FormField>
          </div>
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
        onVerdictSuccess={() => fetchCasesAndStatus(true)}
      />
    </div>
  );
}
