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
import { ib, ibShort, dateTime } from '../../lib/format';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserX,
  Edit2,
  Wallet,
  Building2,
  Eye,
  RefreshCw,
} from 'lucide-react';

export default function UsersPage() {
  const { users, actions } = useAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);

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

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && !u.is_banned) ||
      (statusFilter === 'BANNED' && u.is_banned);

    return matchesSearch && matchesStatus;
  });

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
          subtitle="Inspeksi kekayaan, saldo kas pribadi & PT, portofolio saham, serta manajemen akun"
          icon={Users}
          tone="var(--violet)"
          action={
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-56">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Cari konglomerat / PT..."
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-xl w-full sm:w-auto"
              >
                <option value="ALL">Semua Akun</option>
                <option value="ACTIVE">Aktif</option>
                <option value="BANNED">Dibekukan (Banned)</option>
              </select>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak Ada Pemain Ditemukan"
            description={
              search
                ? `Tidak ditemukan konglomerat dengan kata kunci "${search}"`
                : 'Belum ada pemain yang terdaftar dalam simulasi.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table min-w-[920px]">
              <thead>
                <tr>
                  <th className="min-w-[240px]">Konglomerat & Entitas PT</th>
                  <th className="min-w-[130px]">Kas Pribadi</th>
                  <th className="min-w-[130px]">Kas PT Utama</th>
                  <th className="min-w-[160px]">Total Kekayaan (Net Worth)</th>
                  <th className="min-w-[130px]">Skor & Tier Kredit</th>
                  <th className="min-w-[90px]">Status Akun</th>
                  <th className="right min-w-[170px]">Tindakan Otoritas</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const personalCash = u.balance_ib ?? u.cash_balance_ib ?? 0;
                  const companyCash = u.company_balance_ib ?? 0;
                  const netWorth = u.net_worth ?? personalCash;

                  return (
                    <tr key={u.id} className="hover:bg-slate-900/60 transition-colors">
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md">
                            {u.name ? u.name.charAt(0).toUpperCase() : u.username?.charAt(0).toUpperCase() || 'P'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              <span className="truncate">{u.name || u.username}</span>
                              {u.role === 'ADMIN' && <Badge tone="amber">ADMIN</Badge>}
                              {u.role === 'VIP' && <Badge tone="gold">VIP</Badge>}
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
                          <Badge tone="sky">
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
                            variant={u.is_banned ? 'emerald' : 'rose'}
                            size="xs"
                            icon={u.is_banned ? UserCheck : UserX}
                            onClick={() => actions.toggleBan(u.id)}
                            title={u.is_banned ? 'Pulihkan akun' : 'Bekukan akun'}
                          >
                            {u.is_banned ? 'Pulihkan' : 'Bekukan'}
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
