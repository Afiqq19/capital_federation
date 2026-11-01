import { useState, useEffect } from 'react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import { ib, ibShort, dateTime } from '../../lib/format';
import { adminApi } from '../../api/admin';
import { useAdmin } from '../../context/AdminContext';
import { socket } from '../../lib/socket';
import BailoutModal from './BailoutModal';
import DividenModal from './DividenModal';
import WithdrawModal from './WithdrawModal';
import {
  Landmark,
  Coins,
  ShieldAlert,
  ArrowDownRight,
  ArrowUpRight,
  Gavel,
  FileCheck2,
  TrendingUp,
  RefreshCw,
  Gift,
  Building,
  Filter,
} from 'lucide-react';

export default function TreasuryVaultPage() {
  const { companies, users, notify } = useAdmin();
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals state
  const [isBailoutOpen, setIsBailoutOpen] = useState(false);
  const [isDividenOpen, setIsDividenOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  const fetchTreasury = async (silent = false) => {
    try {
      if (silent !== true) setLoading(true);
      const [sumData, legData] = await Promise.all([
        adminApi.treasurySummary(),
        adminApi.treasuryLedger(),
      ]);
      setSummary(sumData);
      setLedger(legData || []);
    } catch (err) {
      console.error('Failed to load treasury:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasury(false);
    const handleUpdate = () => {
      fetchTreasury(true);
    };
    socket.on('treasury:updated', handleUpdate);
    socket.on('company:seized_status', handleUpdate);
    return () => {
      socket.off('treasury:updated', handleUpdate);
      socket.off('company:seized_status', handleUpdate);
    };
  }, []);

  const handleConfirmBailout = async (payload) => {
    try {
      const res = await adminApi.treasuryBailout(payload);
      if (notify) notify(res.message || 'Dana talangan kas negara berhasil disalurkan!', 'success');
      await fetchTreasury(true);
    } catch (err) {
      if (notify) notify('Gagal menyalurkan bailout: ' + err.message, 'error');
      else alert('Gagal menyalurkan bailout: ' + err.message);
    }
  };

  const handleConfirmDividen = async (payload) => {
    try {
      const res = await adminApi.treasuryDistributeDividend(payload);
      if (notify) notify(res.message || 'Dividen nasional berhasil dicairkan ke seluruh pemain!', 'success');
      await fetchTreasury(true);
    } catch (err) {
      if (notify) notify('Gagal membagikan dividen: ' + err.message, 'error');
      else alert('Gagal membagikan dividen: ' + err.message);
    }
  };

  const handleConfirmWithdraw = async (payload) => {
    try {
      const res = await adminApi.treasuryWithdrawFunds(payload);
      if (notify) notify(res.message || 'Dana Kas Negara berhasil dicairkan!', 'success');
      await fetchTreasury(true);
    } catch (err) {
      if (notify) notify('Gagal mencairkan dana: ' + err.message, 'error');
      else alert('Gagal mencairkan dana: ' + err.message);
    }
  };

  const netBalance = summary?.netTreasuryBalance || 50000000000;
  const finesTotal = summary?.breakdown?.finesTotal || 0;
  const meteraiTaxTotal = (summary?.breakdown?.meteraiTotal || 0) + (summary?.breakdown?.taxTotal || 0);

  const filteredLedger = ledger.filter((row) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (row.title && row.title.toLowerCase().includes(q)) ||
      (row.notes && row.notes.toLowerCase().includes(q)) ||
      (row.reference_id && row.reference_id.toLowerCase().includes(q));

    const matchesCategory =
      categoryFilter === 'ALL' ||
      (categoryFilter === 'INCOME' && row.direction === 'INCOME') ||
      (categoryFilter === 'EXPENSE' && row.direction === 'EXPENSE') ||
      (categoryFilter === row.source_type);

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Header Overview Stats - Rapi tanpa pemotongan teks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Saldo Kas Likuid Negara"
          value={ibShort(netBalance)}
          subValue={ib(netBalance)}
          hint="Cadangan Kas Federasi Indigo (Sovereign Fund)"
          icon={Landmark}
          tone="emerald"
        />
        <StatCard
          label="Denda Sitaan PNAF & Spekulan"
          value={ibShort(finesTotal)}
          subValue={ib(finesTotal)}
          hint="Hasil sita eksekusi wanprestasi"
          icon={Gavel}
          tone="amber"
        />
        <StatCard
          label="Bea Meterai & Pajak Transaksi"
          value={ibShort(meteraiTaxTotal)}
          subValue={ib(meteraiTaxTotal)}
          hint="Penerimaan PNBP & Pajak Transaksi Bursa"
          icon={FileCheck2}
          tone="sky"
        />
        <StatCard
          label="Aset Sitaan & BUMF Federasi"
          value={`${summary?.seizedCompaniesCount || 0} Sitaan • ${summary?.bumnCompaniesCount || 0} BUMF`}
          subValue="Portofolio Entitas Milik Federasi"
          hint="Aset produktif kedaulatan negara"
          icon={Building}
          tone="violet"
        />
      </div>

      {/* 2. Action Banner: Kegunaan Uang Sitaan & Kas Negara */}
      <Card className="bg-gradient-to-r from-emerald-500/10 via-slate-900/60 to-transparent border-emerald-500/30">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 shrink-0">
              <Coins size={26} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Brankas Kas Negara & Otoritas Finansial Republik Federasi Indigo
                <Badge tone="emerald">SOVEREIGN WEALTH VAULT</Badge>
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
                Seluruh biaya registrasi gugatan PNAF, denda sitaan spekulan, bea meterai akta digital, dan pajak bursa masuk ke brankas kedaulatan negara ini. Kas negara dapat digunakan untuk <strong>menyuntikkan dana talangan (Bailout)</strong> saat emiten krisis, atau <strong>dibagikan sebagai Dividen Kemakmuran (Stimulus Nasional)</strong> ke seluruh konglomerat.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="amber"
              size="sm"
              icon={ShieldAlert}
              onClick={() => setIsBailoutOpen(true)}
            >
              Suntik Bailout Emiten
            </Button>

            <Button
              variant="emerald"
              size="sm"
              icon={Gift}
              onClick={() => setIsDividenOpen(true)}
            >
              Bagi Dividen Nasional
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Coins}
              onClick={() => setIsWithdrawOpen(true)}
            >
              Gunakan / Cairkan Kas Negara
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={RefreshCw}
              onClick={fetchTreasury}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Mutasi Buku Kas Negara (Ledger Table) */}
      <Card>
        <CardHeader
          title="Buku Kas & Riwayat Mutasi Keuangan Negara"
          subtitle="Catatan transparan seluruh penerimaan denda, meterai, dan pengeluaran stimulus negara"
          icon={Landmark}
          tone="var(--emerald)"
          action={
            <div className="flex items-center gap-2">
              <div className="w-56">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Cari transaksi / ref..."
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-xl"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="INCOME">Pemasukan (+INCOME)</option>
                <option value="EXPENSE">Pengeluaran (-EXPENSE)</option>
                <option value="SEIZURE_FINE">Denda Sitaan PNAF</option>
                <option value="METERAI_FEE">Bea Meterai Digital</option>
                <option value="TRANSACTION_TAX">Pajak Transaksi Bursa</option>
                <option value="BAILOUT_DISBURSEMENT">Dana Bailout Emiten</option>
              </select>
            </div>
          }
        />

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            ⏳ Memuat mutasi buku kas kedaulatan negara...
          </div>
        ) : filteredLedger.length === 0 ? (
          <EmptyState
            title="Belum Ada Riwayat Mutasi Kas Negara"
            description={
              search
                ? `Tidak ditemukan mutasi dengan kata kunci "${search}"`
                : 'Seluruh penerimaan biaya sidang, denda eksekusi, dan bea meterai akan tercatat di sini secara otomatis.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Waktu Mutasi</th>
                  <th>Sumber Penerimaan / Pos Anggaran</th>
                  <th>Uraian Transaksi Otoritas</th>
                  <th>Kategori</th>
                  <th className="right">Nominal Arus Kas</th>
                </tr>
              </thead>
              <tbody>
                {filteredLedger.map((row) => {
                  const isIncome = row.direction === 'INCOME';

                  return (
                    <tr key={row.id}>
                      <td className="text-xs text-slate-400 font-mono">
                        {dateTime(row.created_at)}
                      </td>

                      <td>
                        <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          {isIncome ? (
                            <ArrowDownRight size={14} className="text-emerald-400 shrink-0" />
                          ) : (
                            <ArrowUpRight size={14} className="text-rose-400 shrink-0" />
                          )}
                          {row.title}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Ref: {row.reference_id || row.id.slice(0, 8)}
                        </div>
                      </td>

                      <td className="text-xs text-slate-300 max-w-sm">
                        {row.notes || '-'}
                      </td>

                      <td>
                        {row.source_type === 'SEIZURE_FINE' && <Badge tone="amber">DENDA SITAAN</Badge>}
                        {row.source_type === 'PNAF_FILING_FEE' && <Badge tone="sky">BIAYA SIDANG</Badge>}
                        {row.source_type === 'METERAI_FEE' && <Badge tone="emerald">METERAI DIGITAL</Badge>}
                        {row.source_type === 'TRANSACTION_TAX' && <Badge tone="violet">PAJAK BURSA</Badge>}
                        {row.source_type === 'BAILOUT_DISBURSEMENT' && <Badge tone="rose">STIMULUS NEGARA</Badge>}
                      </td>

                      <td className="right">
                        <span className={`font-mono text-xs font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isIncome ? '+' : '-'}{ib(row.amount_ib)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modern Bailout Modal */}
      <BailoutModal
        open={isBailoutOpen}
        onClose={() => setIsBailoutOpen(false)}
        companies={companies}
        treasuryBalance={netBalance}
        onConfirm={handleConfirmBailout}
      />

      {/* Modern Dividen Modal */}
      <DividenModal
        open={isDividenOpen}
        onClose={() => setIsDividenOpen(false)}
        usersCount={users?.length || 0}
        treasuryBalance={netBalance}
        onConfirm={handleConfirmDividen}
      />

      {/* Modern Withdraw / Disbursement Modal */}
      <WithdrawModal
        open={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        users={users}
        companies={companies}
        treasuryBalance={netBalance}
        onConfirm={handleConfirmWithdraw}
      />
    </div>
  );
}
