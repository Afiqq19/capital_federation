import { useState, useEffect } from 'react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { FormField, Input, Select } from '../../components/ui/Form';
import { adminApi } from '../../api/admin';
import { useAdmin } from '../../context/AdminContext';
import {
  Building2,
  Plus,
  Coins,
  Trophy,
  Users,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  Layers,
  Clock,
  ArrowRight,
  FileText,
  TrendingUp,
  Edit3,
  Trash2,
} from 'lucide-react';

export default function GovernmentTendersPage() {
  const { notify } = useAdmin();
  const toast = {
    success: (msg) => (notify ? notify(msg, 'success') : console.log(msg)),
    error: (msg) => (notify ? notify(msg, 'error') : console.error(msg)),
    info: (msg) => (notify ? notify(msg, 'info') : console.log(msg)),
  };
  const [tenders, setTenders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Buka Tender Baru
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    tenderCode: '',
    title: '',
    sector: 'Teknologi',
    description: '',
    contractValueIb: '150000000',
    minCapRequirementIb: '25000000',
    minPtLevel: '2',
    minRdLevel: '2',
    minCapacityStaff: '10',
    deadlineDays: '3',
  });

  // Modal Tinjau Proposal & Tetapkan Pemenang
  const [selectedTender, setSelectedTender] = useState(null);
  const [tenderDetail, setTenderDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);

  // Modal Edit Tender
  const [editingTender, setEditingTender] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    sector: 'Teknologi',
    description: '',
    contractValueIb: '',
    minCapRequirementIb: '25000000',
    minPtLevel: '2',
    minRdLevel: '2',
    minCapacityStaff: '10',
    status: 'OPEN',
    deadlineDays: '3',
  });

  const openEditModal = (tender) => {
    setEditingTender(tender);
    setEditForm({
      title: tender.title || '',
      sector: tender.sector || 'Teknologi',
      description: tender.description || '',
      contractValueIb: String(tender.contract_value_ib || ''),
      minCapRequirementIb: String(tender.min_cap_requirement_ib || '25000000'),
      minPtLevel: String(tender.min_pt_level || '2'),
      minRdLevel: String(tender.min_rd_level || '2'),
      minCapacityStaff: String(tender.min_capacity_staff || '10'),
      status: tender.status || 'OPEN',
      deadlineDays: '3',
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingTender) return;
    setIsEditing(true);
    try {
      const res = await adminApi.tendersUpdate(editingTender.id, editForm);
      toast?.success(res.message);
      setIsEditModalOpen(false);
      setEditingTender(null);
      loadTenders();
    } catch (err) {
      toast?.error(err.message || 'Gagal memperbarui tender');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteTender = async (tenderId, tenderCode) => {
    if (!window.confirm(`Hapus paket tender #${tenderCode}? Seluruh proposal yang masuk akan ikut dihapus.`)) {
      return;
    }
    try {
      const res = await adminApi.tendersDelete(tenderId);
      toast?.success(res.message);
      loadTenders();
    } catch (err) {
      toast?.error(err.message || 'Gagal menghapus tender');
    }
  };

  const loadTenders = async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.tendersList();
      setTenders(data || []);
    } catch (err) {
      toast?.error(err.message || 'Gagal memuat katalog tender pemerintah');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenders();
  }, []);

  const openDetailModal = async (tender) => {
    setSelectedTender(tender);
    setIsLoadingDetail(true);
    try {
      const detail = await adminApi.tenderDetail(tender.id);
      setTenderDetail(detail);
    } catch (err) {
      toast?.error('Gagal memuat proposal tender');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await adminApi.tendersCreate(createForm);
      toast?.success(res.message);
      setIsCreateModalOpen(false);
      setCreateForm({
        tenderCode: '',
        title: '',
        sector: 'Teknologi',
        description: '',
        contractValueIb: '150000000',
        minCapRequirementIb: '25000000',
        minPtLevel: '2',
        minRdLevel: '2',
        minCapacityStaff: '10',
        deadlineDays: '3',
      });
      loadTenders();
    } catch (err) {
      toast?.error(err.message || 'Gagal membuka tender');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAwardWinner = async (bidId) => {
    if (!selectedTender) return;
    setIsAwarding(true);
    try {
      const res = await adminApi.tendersAward({
        tenderId: selectedTender.id,
        bidId,
      });
      toast?.success(res.message);
      setSelectedTender(null);
      setTenderDetail(null);
      loadTenders();
    } catch (err) {
      toast?.error(err.message || 'Gagal menetapkan pemenang tender');
    } finally {
      setIsAwarding(false);
    }
  };

  const totalValue = tenders.reduce((sum, t) => sum + (t.contract_value_ib || 0), 0);
  const openCount = tenders.filter((t) => t.status === 'OPEN').length;
  const totalBids = tenders.reduce((sum, t) => sum + (t.total_bids || 0), 0);

  return (
    <div className="space-y-6 page-enter pb-16">
      {/* 1. Header Banner */}
      <div className="card p-6 bg-gradient-to-r from-sky-950/40 via-slate-900 to-slate-900 border-sky-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-sky-500/20 border border-sky-500/30 text-sky-400 shrink-0 shadow-lg shadow-sky-950/50">
            <Building2 size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-slate-100 tracking-tight">
                Tender Pengadaan Mega-Proyek Pemerintah
              </h2>
              <Badge tone="sky">Pilar 3: Kontrak Kas Negara</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
              Buka lelang proyek strategis bernilai ratusan juta hingga miliaran IB yang didanai langsung dari Kas Negara. Perseroan (PT) pemain yang lolos kualifikasi dapat mengajukan proposal untuk memenangkan kontrak.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateModalOpen(true)}
          className="shadow-lg shadow-sky-500/20 shrink-0"
        >
          Buka Mega-Tender Baru
        </Button>
      </div>

      {/* 2. KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Nilai Proyek"
          value={`IB ${(totalValue / 1000000).toFixed(0)} Jt`}
          subValue={`Dari ${tenders.length} Proyek Strategis`}
          hint="Didanai dari Brankas Kas Negara"
          icon={Coins}
          tone="sky"
        />
        <StatCard
          label="Tender Buka Berjalan"
          value={`${openCount} Paket`}
          subValue="Menerima proposal PT pemain"
          hint="Kualifikasi Level PT & Riset R&D"
          icon={Building2}
          tone="emerald"
        />
        <StatCard
          label="Proposal PT Masuk"
          value={`${totalBids} Proposal`}
          subValue="Skor teknis dihitung otomatis"
          hint="Penetapan pemenang oleh Admin"
          icon={FileText}
          tone="gold"
        />
      </div>

      {/* 3. Katalog Tender Proyek */}
      <Card>
        <CardHeader
          title="Katalog Paket Proyek Pengadaan Nasional"
          subtitle="Tinjau lamaran proposal perseroan dan tetapkan pemenang tender"
          icon={Building2}
          tone="var(--sky)"
        />

        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat katalog tender...</div>
        ) : tenders.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">Belum ada paket tender pengadaan yang dibuka.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {tenders.map((tender) => {
              const isOpen = tender.status === 'OPEN';
              const isAwarded = tender.status === 'AWARDED';

              return (
                <div
                  key={tender.id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sky-400">
                          {tender.tender_code}
                        </span>
                        <Badge tone={isOpen ? 'emerald' : isAwarded ? 'gold' : 'slate'}>
                          {tender.status}
                        </Badge>
                        <Badge tone="slate">{tender.sector}</Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mt-1.5">{tender.title}</h4>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[11px] text-slate-400">Nilai Kontrak</div>
                      <div className="font-mono text-base font-black text-amber-400">
                        IB {Number(tender.contract_value_ib || 0).toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                    {tender.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div>
                      <span>Syarat Level PT: </span>
                      <strong className="text-slate-200">Min Lvl {tender.min_pt_level || 2}</strong>
                    </div>
                    <div>
                      <span>Syarat R&D: </span>
                      <strong className="text-slate-200">Min Lvl {tender.min_rd_level || 2}</strong>
                    </div>
                    <div>
                      <span>Proposal Masuk: </span>
                      <strong className="text-sky-400 font-bold">{tender.total_bids || 0} PT</strong>
                    </div>
                  </div>

                  {isAwarded && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                      <Trophy size={16} className="text-amber-400 shrink-0" />
                      <div>
                        Pemenang Kontrak: <strong>{tender.winner_company_name}</strong>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800/60">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock size={12} />
                      Batas: {new Date(tender.deadline_at).toLocaleDateString('id-ID')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(tender)}
                        className="text-xs text-sky-400 hover:text-sky-300 px-2"
                        title="Edit Data Tender"
                      >
                        <Edit3 size={13} className="mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTender(tender.id, tender.tender_code)}
                        className="text-xs text-rose-400 hover:text-rose-300 px-2"
                        title="Hapus Tender"
                      >
                        <Trash2 size={13} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailModal(tender)}
                        className="text-xs"
                      >
                        {isOpen ? `Tinjau Proposal (${tender.total_bids || 0})` : 'Lihat Hasil Tender'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Buka Mega-Tender Baru */}
      <Modal
        open={isCreateModalOpen}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Buka Paket Mega-Tender Pengadaan Pemerintah"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <FormField label="Judul Paket Pengadaan Proyek">
                <Input
                  type="text"
                  placeholder="Pembangunan Jaringan Telekomunikasi & Fiber Optic Federasi"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  required
                />
              </FormField>
            </div>
            <div>
              <FormField label="Kode Tender (Opsional)" hint="Kosongkan = otomatis">
                <Input
                  type="text"
                  placeholder="TDR/TEK/2026/01"
                  value={createForm.tenderCode}
                  onChange={(e) => setCreateForm({ ...createForm, tenderCode: e.target.value })}
                  className="font-mono uppercase text-sky-300"
                />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Sektor Sasaran Industri" hint="Hanya PT sektor ini yang boleh ikut">
              <Select
                value={createForm.sector}
                onChange={(e) => setCreateForm({ ...createForm, sector: e.target.value })}
              >
                <option value="Teknologi">Teknologi</option>
                <option value="Energi">Energi</option>
                <option value="Properti & Konstruksi">Properti & Konstruksi</option>
                <option value="Keuangan">Keuangan</option>
                <option value="Konsumer & F&B">Konsumer & F&B</option>
                <option value="Manufaktur">Manufaktur</option>
                <option value="Kesehatan & Farmasi">Kesehatan & Farmasi</option>
                <option value="Transportasi & Logistik">Transportasi & Logistik</option>
              </Select>
            </FormField>

            <FormField label="Nilai Kontrak Pengadaan (IB)" hint="Dicairkan ke pemenang">
              <Input
                type="number"
                step="10000000"
                value={createForm.contractValueIb}
                onChange={(e) => setCreateForm({ ...createForm, contractValueIb: e.target.value })}
                required
                className="font-mono font-bold text-amber-300"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[
                  { label: '100 Jt', val: '100000000' },
                  { label: '250 Jt', val: '250000000' },
                  { label: '500 Jt', val: '500000000' },
                  { label: '1 M', val: '1000000000' },
                  { label: '2.5 M', val: '2500000000' },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, contractValueIb: p.val })}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Syarat Minimal Kas PT Peserta (IB)" hint="Ketahanan modal perseroan">
              <Input
                type="number"
                step="5000000"
                value={createForm.minCapRequirementIb}
                onChange={(e) => setCreateForm({ ...createForm, minCapRequirementIb: e.target.value })}
                required
                className="font-mono text-emerald-300"
              />
              <div className="flex gap-1.5 mt-1.5">
                {[
                  { label: '10 Jt', val: '10000000' },
                  { label: '25 Jt', val: '25000000' },
                  { label: '50 Jt', val: '50000000' },
                  { label: '100 Jt', val: '100000000' },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, minCapRequirementIb: p.val })}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </FormField>

            <FormField label="Deskripsi Ruang Lingkup Proyek">
              <Input
                type="text"
                placeholder="Spesifikasi teknis dan luaran proyek yang wajib diselesaikan pemenang..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <FormField label="Min. Level PT">
              <Select
                value={createForm.minPtLevel}
                onChange={(e) => setCreateForm({ ...createForm, minPtLevel: e.target.value })}
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </Select>
            </FormField>

            <FormField label="Min. Level R&D">
              <Select
                value={createForm.minRdLevel}
                onChange={(e) => setCreateForm({ ...createForm, minRdLevel: e.target.value })}
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
              </Select>
            </FormField>

            <FormField label="Min. Staf/Karyawan">
              <Select
                value={createForm.minCapacityStaff}
                onChange={(e) => setCreateForm({ ...createForm, minCapacityStaff: e.target.value })}
              >
                <option value="5">5 Staf</option>
                <option value="10">10 Staf</option>
                <option value="15">15 Staf</option>
                <option value="25">25 Staf</option>
              </Select>
            </FormField>

            <FormField label="Durasi Buka">
              <Select
                value={createForm.deadlineDays}
                onChange={(e) => setCreateForm({ ...createForm, deadlineDays: e.target.value })}
              >
                <option value="1">1 Hari</option>
                <option value="3">3 Hari</option>
                <option value="7">7 Hari</option>
              </Select>
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isCreating}>
              {isCreating ? 'Menerbitkan...' : 'Terbitkan Tender Sekarang'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Tinjau Proposal Bids & Tetapkan Pemenang */}
      <Modal
        open={Boolean(selectedTender)}
        isOpen={Boolean(selectedTender)}
        onClose={() => setSelectedTender(null)}
        title={`Evaluasi Proposal: ${selectedTender?.tender_code}`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="font-bold text-slate-200 text-sm">{selectedTender?.title}</div>
            <div className="text-slate-400">
              Nilai Kontrak: <strong className="text-amber-400 font-mono">IB {Number(selectedTender?.contract_value_ib || 0).toLocaleString('id-ID')}</strong> (Sektor {selectedTender?.sector})
            </div>
          </div>

          <h5 className="font-bold text-slate-300 pt-1">Daftar Proposal Perseroan yang Masuk:</h5>

          {isLoadingDetail ? (
            <div className="py-6 text-center text-slate-400">Memuat daftar proposal...</div>
          ) : !tenderDetail?.bids || tenderDetail.bids.length === 0 ? (
            <div className="py-6 text-center text-slate-500">
              Belum ada PT yang mengajukan proposal untuk paket tender ini.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {tenderDetail.bids.map((bid) => {
                const isWinner = bid.status === 'ACCEPTED';
                const canAward = selectedTender?.status === 'OPEN';

                return (
                  <div
                    key={bid.id}
                    className={`p-3.5 rounded-xl border transition-all space-y-2 ${
                      isWinner
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-100 text-sm">{bid.company_name}</strong>
                          <Badge tone={isWinner ? 'gold' : 'sky'}>
                            Skor Teknis: {bid.bid_score}/100
                          </Badge>
                        </div>
                        <div className="text-slate-400 mt-0.5">
                          Pemilik: <span className="text-slate-300 font-semibold">{bid.owner_username}</span> | Level PT: {bid.pt_level} | R&D: Lvl {bid.rd_level} | Staf: {bid.capacity_staff}
                        </div>
                      </div>

                      {canAward && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Award}
                          disabled={isAwarding}
                          onClick={() => handleAwardWinner(bid.id)}
                          className="shrink-0"
                        >
                          Pilih Pemenang
                        </Button>
                      )}
                    </div>

                    <p className="text-slate-300 italic bg-slate-950/40 p-2 rounded-lg border border-slate-800/60">
                      "{bid.bid_pitch}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setSelectedTender(null)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Edit Tender */}
      <Modal
        open={isEditModalOpen}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Paket Tender: ${editingTender?.tender_code}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <FormField label="Judul Paket Pengadaan Proyek">
            <Input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Sektor Sasaran Industri">
              <Select
                value={editForm.sector}
                onChange={(e) => setEditForm({ ...editForm, sector: e.target.value })}
              >
                <option value="Teknologi">Teknologi</option>
                <option value="Energi">Energi</option>
                <option value="Properti & Konstruksi">Properti & Konstruksi</option>
                <option value="Keuangan">Keuangan</option>
                <option value="Konsumer & F&B">Konsumer & F&B</option>
                <option value="Manufaktur">Manufaktur</option>
                <option value="Kesehatan & Farmasi">Kesehatan & Farmasi</option>
                <option value="Transportasi & Logistik">Transportasi & Logistik</option>
              </Select>
            </FormField>

            <FormField label="Nilai Kontrak (IB)">
              <Input
                type="number"
                step="10000000"
                value={editForm.contractValueIb}
                onChange={(e) => setEditForm({ ...editForm, contractValueIb: e.target.value })}
                required
                className="font-mono font-bold text-amber-300"
              />
            </FormField>

            <FormField label="Status Tender">
              <Select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="OPEN">OPEN (Dibuka)</option>
                <option value="EVALUATION">EVALUATION (Evaluasi)</option>
                <option value="AWARDED">AWARDED (Ditetapkan)</option>
                <option value="CLOSED">CLOSED (Ditutup)</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Syarat Kas Minimum PT (IB)">
              <Input
                type="number"
                step="5000000"
                value={editForm.minCapRequirementIb}
                onChange={(e) => setEditForm({ ...editForm, minCapRequirementIb: e.target.value })}
                required
                className="font-mono text-emerald-300"
              />
            </FormField>

            <FormField label="Perpanjang Batas (Hari)">
              <Select
                value={editForm.deadlineDays}
                onChange={(e) => setEditForm({ ...editForm, deadlineDays: e.target.value })}
              >
                <option value="1">+1 Hari dari Sekarang</option>
                <option value="3">+3 Hari dari Sekarang</option>
                <option value="7">+7 Hari dari Sekarang</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Deskripsi Ruang Lingkup Proyek">
            <Input
              type="text"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </FormField>

          <div className="grid grid-cols-3 gap-3">
            <FormField label="Min. Level PT">
              <Select
                value={editForm.minPtLevel}
                onChange={(e) => setEditForm({ ...editForm, minPtLevel: e.target.value })}
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </Select>
            </FormField>

            <FormField label="Min. Level R&D">
              <Select
                value={editForm.minRdLevel}
                onChange={(e) => setEditForm({ ...editForm, minRdLevel: e.target.value })}
              >
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
              </Select>
            </FormField>

            <FormField label="Min. Staf/Karyawan">
              <Select
                value={editForm.minCapacityStaff}
                onChange={(e) => setEditForm({ ...editForm, minCapacityStaff: e.target.value })}
              >
                <option value="5">5 Staf</option>
                <option value="10">10 Staf</option>
                <option value="15">15 Staf</option>
                <option value="25">25 Staf</option>
              </Select>
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isEditing}>
              {isEditing ? 'Menyimpan...' : 'Simpan Perubahan Tender'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Footer Versi Web Admin */}
      <div className="pt-6 pb-2 text-center text-xs text-slate-500 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone="slate">Web Admin Console v1.4.0-CFX</Badge>
          <span>Capital Federation Sovereign Launch Console</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Engine: Realistic Simulation CFX • SQLite Multi-Sector
        </div>
      </div>
    </div>
  );
}
