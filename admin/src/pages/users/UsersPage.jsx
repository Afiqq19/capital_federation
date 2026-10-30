import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import EditUserModal from './EditUserModal';
import UserDetailsModal from './UserDetailsModal';
import { ib, ibShort } from '../../lib/format';
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Edit2,
  Wallet,
  Eye,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function UsersPage() {
  const { users, actions } = useAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);

  // State untuk modal konfirmasi hapus permanen
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const totalWealth = (users || []).reduce(
    (acc, u) => acc + (Number(u.net_worth) || Number(u.balance_ib) || Number(u.cash_balance_ib) || 0),
    0
  );

  const bannedCount = (users || []).filter((u) => u.is_banned).length;

  const filtered = (users || []).filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.pt_name && u.pt_name.toLowerCase().includes(q));

    const rank = Number(u.rank) || 999;
    let matchesStatus = true;
    if (statusFilter === '12_NAGA') {
      matchesStatus = rank <= 12;
    } else if (statusFilter === 'TAIPAN') {
      matchesStatus = rank > 12 && rank <= 35;
    } else if (statusFilter === 'VIP') {
      matchesStatus = u.is_vip || u.role === 'VIP';
    } else if (statusFilter === 'REGULER') {
      matchesStatus = rank > 35 && u.role !== 'VIP' && !u.is_vip;
    } else if (statusFilter === 'ACTIVE') {
      matchesStatus = !u.is_banned;
    } else if (statusFilter === 'BANNED') {
      matchesStatus = Boolean(u.is_banned);
    }

    return matchesSearch && matchesStatus;
  });

  const getCreditTierColor = (tier) => {
    const t = String(tier || '').toUpperCase();
    if (t.includes('AAA') || t === 'AA') return 'emerald';
    if (t.includes('A') || t.includes('BBB')) return 'sky';
    if (t.includes('BB') || t.includes('B')) return 'amber';
    return 'slate';
  };

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Konglomerat"
          value={users?.length || 0}
          hint="Akun Pemain Terdaftar"
          icon={Users}
          tone="violet"
        />
        <StatCard
          label="Total Likuiditas Pemain"
          value={ibShort(totalWealth)}
          hint="Akumulasi Kas & Portofolio"
          icon={Wallet}
          tone="gold"
        />
        <StatCard
          label="Pemain Bebas Bertransaksi"
          value={Math.max(0, (users?.length || 0) - bannedCount)}
          hint="Status Akun Aktif"
          icon={UserCheck}
          tone="emerald"
        />
        <StatCard
          label="Akun Dibekukan (Banned)"
          value={bannedCount}
          hint="Pelanggaran Regulasi"
          icon={UserX}
          tone={bannedCount > 0 ? 'rose' : 'slate'}
        />
      </div>

      {/* 2. Users Table Card */}
      <Card>
        <CardHeader
          title="Direktori Konglomerat & Kekayaan Pemain"
          subtitle="Inspeksi kekayaan, saldo kas pribadi & PT, kasta 12 Naga, skor kredit, serta hak akses"
          icon={Users}
          tone="var(--violet)"
        />

        {/* Responsive Search & Filter Controls (Mobile Full-Width, Never Overlaps!) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-800/60">
          <div className="w-full sm:max-w-xs">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Cari konglomerat / PT..."
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select text-xs py-2 px-3 bg-slate-900 border-slate-800 rounded-xl w-full sm:w-auto text-slate-200"
            >
              <option value="ALL">Semua Kasta Pemain ({users?.length || 0})</option>
              <option value="12_NAGA">🐉 12 Naga (Rank 1 - 12)</option>
              <option value="TAIPAN">👑 Taipan (Rank 13 - 35)</option>
              <option value="VIP">💎 Akun VIP</option>
              <option value="REGULER">Ritel & Reguler</option>
              <option value="ACTIVE">Status Aktif</option>
              <option value="BANNED">Dibekukan (Banned)</option>
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak Ada Pemain Ditemukan"
            description={
              search
                ? `Tidak ditemukan konglomerat dengan kata kunci "${search}"`
                : 'Belum ada pemain yang sesuai dengan filter kasta yang dipilih.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table min-w-[960px]">
              <thead>
                <tr>
                  <th className="min-w-[260px]">Konglomerat & Kasta (#Rank)</th>
                  <th className="min-w-[130px]">Kas Pribadi</th>
                  <th className="min-w-[130px]">Kas PT Utama</th>
                  <th className="min-w-[160px]">Total Kekayaan (Net Worth)</th>
                  <th className="min-w-[140px]">Skor & Tier Kredit</th>
                  <th className="min-w-[100px]">Status Akun</th>
                  <th className="right min-w-[200px]">Tindakan Otoritas</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const personalCash = u.balance_ib ?? u.cash_balance_ib ?? 0;
                  const companyCash = u.company_balance_ib ?? 0;
                  const netWorth = u.net_worth ?? personalCash;
                  const rank = Number(u.rank) || 999;
                  const is12Naga = rank <= 12;
                  const isTaipan = rank > 12 && rank <= 35;
                  const isVip = u.is_vip || u.role === 'VIP';

                  return (
                    <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md ${
                            is12Naga
                              ? 'bg-gradient-to-tr from-amber-500 to-amber-700 shadow-amber-500/20 text-slate-950 font-black'
                              : (isTaipan
                                  ? 'bg-gradient-to-tr from-sky-500 to-blue-700'
                                  : 'bg-gradient-to-tr from-violet-600 to-indigo-600')
                          }`}>
                            {u.name ? u.name.charAt(0).toUpperCase() : u.username?.charAt(0).toUpperCase() || 'P'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{u.name || u.username}</span>
                              {is12Naga && <Badge tone="amber">🐉 12 NAGA #{rank}</Badge>}
                              {isTaipan && <Badge tone="sky">👑 TAIPAN #{rank}</Badge>}
                              {isVip && <Badge tone="gold">💎 VIP</Badge>}
                              {u.role === 'ADMIN' && <Badge tone="rose">ADMIN</Badge>}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate">
                              @{u.username} • {u.pt_name || 'PT Mandiri Konglomerat'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="num font-bold text-emerald-400">
                        {ib(personalCash)}
                      </td>

                      <td className="num font-bold text-sky-400">
                        {ib(companyCash)}
                      </td>

                      <td className="num font-bold text-slate-100">
                        {ib(netWorth)}
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5">
                          <Badge tone={getCreditTierColor(u.credit_tier)}>
                            {u.credit_tier || 'STANDARD'}
                          </Badge>
                          <span className="text-[11px] font-mono font-bold text-amber-400">
                            {u.credit_score || 700}
                          </span>
                        </div>
                      </td>

                      <td>
                        {u.is_banned ? (
                          <Badge tone="rose" pulse>DIBEKUKAN</Badge>
                        ) : (
                          <Badge tone="emerald">AKTIF</Badge>
                        )}
                      </td>

                      <td className="right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="xs"
                            icon={Eye}
                            onClick={() => setSelectedUserForDetail(u)}
                            title="Inspeksi kerajaan bisnis pemain"
                          >
                            Detail
                          </Button>

                          <Button
                            variant="ghost"
                            size="xs"
                            icon={Edit2}
                            onClick={() => setSelectedUserForEdit(u)}
                            title="Edit saldo kas dan profil"
                          >
                            Edit
                          </Button>

                          <Button
                            variant={u.is_banned ? 'emerald' : 'amber'}
                            size="xs"
                            icon={u.is_banned ? UserCheck : UserX}
                            onClick={() => actions.toggleBan(u.id)}
                            title={u.is_banned ? 'Pulihkan akun' : 'Bekukan akun'}
                          >
                            {u.is_banned ? 'Pulihkan' : 'Bekukan'}
                          </Button>

                          {u.role !== 'ADMIN' && (
                            <Button
                              variant="rose"
                              size="xs"
                              icon={Trash2}
                              onClick={() => {
                                setUserToDelete(u);
                                setDeleteConfirmText('');
                              }}
                              title="Hapus akun permanen dari database"
                            >
                              Hapus
                            </Button>
                          )}
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

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="modal-backdrop" onClick={() => !isDeletingUser && setUserToDelete(null)}>
          <div className="modal max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} className="text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">Konfirmasi Hapus Akun</h3>
                <p className="text-xs text-slate-400">Tindakan ini permanen dan tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
              <p>
                Anda akan menghapus akun konglomerat <strong className="text-white">@{userToDelete.username}</strong> ({userToDelete.name || userToDelete.pt_name || 'Konglomerat'}).
              </p>
              <p className="text-rose-300/90 font-medium">
                ⚠️ Seluruh kepemilikan saham, kas, portofolio, dan entitas PT terkait akan dihapus secara permanen dari basis data Federasi.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Ketik <span className="font-mono font-bold text-rose-400">HAPUS</span> pada kolom di bawah ini untuk mengonfirmasi:
              </label>
              <input
                type="text"
                autoFocus
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Ketik HAPUS"
                className="input uppercase text-center font-mono font-bold text-rose-400 tracking-widest border-rose-500/40 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
              >
                Batal
              </Button>
              <Button
                variant="rose"
                icon={Trash2}
                disabled={deleteConfirmText.trim().toUpperCase() !== 'HAPUS' || isDeletingUser}
                onClick={async () => {
                  try {
                    setIsDeletingUser(true);
                    await actions.deleteUser(userToDelete.id);
                    setUserToDelete(null);
                    setDeleteConfirmText('');
                  } catch (err) {
                    alert('Gagal menghapus user: ' + (err.message || err));
                  } finally {
                    setIsDeletingUser(false);
                  }
                }}
              >
                {isDeletingUser ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      <EditUserModal
        open={Boolean(selectedUserForEdit)}
        onClose={() => setSelectedUserForEdit(null)}
        user={selectedUserForEdit}
        onConfirm={actions.editUser}
      />

      {/* User Details Modal (Empire View) */}
      <UserDetailsModal
        open={Boolean(selectedUserForDetail)}
        onClose={() => setSelectedUserForDetail(null)}
        user={selectedUserForDetail}
        onEdit={(u) => setSelectedUserForEdit(u)}
      />
    </div>
  );
}
