import { useState, useEffect } from 'react';
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

function formatRelativeTime(iso) {
  if (!iso) return '';
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
  } catch (_) {
    return '';
  }
}

export default function UsersPage() {
  const { users, actions } = useAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // State untuk modal konfirmasi hapus permanen & aksi bulk bot freeze
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isFreezingBots, setIsFreezingBots] = useState(false);

  const isBotUser = (u) =>
    Boolean(
      u?.is_bot_account ||
      String(u?.id || '').startsWith('bot-user-') ||
      String(u?.id || '').startsWith('user-bot-')
    );

  const totalWealth = (users || []).reduce(
    (acc, u) => acc + (Number(u.net_worth) || Number(u.balance_ib) || Number(u.cash_balance_ib) || 0),
    0
  );

  const bannedCount = (users || []).filter((u) => u.is_banned).length;
  const realPlayersCount = (users || []).filter((u) => !isBotUser(u)).length;
  const onlinePlayersCount = (users || []).filter((u) => u.is_online).length;
  const frozenBotsCount = (users || []).filter((u) => isBotUser(u) && u.is_banned).length;
  const activeBotsCount = (users || []).filter((u) => isBotUser(u) && !u.is_banned).length;

  const handleBulkFreezeBots = async (targetFrozen) => {
    if (!actions?.freezeBotsBulk) return;
    setIsFreezingBots(true);
    try {
      await actions.freezeBotsBulk(targetFrozen);
    } finally {
      setIsFreezingBots(false);
    }
  };

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
    if (statusFilter === 'ONLINE') {
      matchesStatus = Boolean(u.is_online);
    } else if (statusFilter === 'OFFLINE') {
      matchesStatus = !u.is_online;
    } else if (statusFilter === 'REAL_PLAYERS') {
      matchesStatus = !isBotUser(u);
    } else if (statusFilter === 'BOTS_ONLY') {
      matchesStatus = isBotUser(u);
    } else if (statusFilter === '12_NAGA') {
      matchesStatus = !u.is_banned && rank <= 12;
    } else if (statusFilter === 'TAIPAN') {
      matchesStatus = !u.is_banned && rank > 12 && rank <= 35;
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

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedUsers = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Konglomerat"
          value={users?.length || 0}
          hint="Akun Pemain Terdaftar"
          icon={Users}
          tone="violet"
        />
        <StatCard
          label="Konglomerat Online"
          value={
            <div className="flex items-center gap-2">
              <span>{onlinePlayersCount}</span>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          }
          hint="Sedang Aktif Main APK"
          icon={UserCheck}
          tone="emerald"
        />
        <StatCard
          label="Total Likuiditas Pemain"
          value={ibShort(totalWealth)}
          hint="Akumulasi Kas & Portofolio"
          icon={Wallet}
          tone="gold"
        />
        <StatCard
          label="Player Asli"
          value={realPlayersCount}
          hint="Bukan Bot Pasar"
          icon={UserCheck}
          tone="sky"
        />
        <StatCard
          label="Akun Dibekukan"
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

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              variant={frozenBotsCount >= 500 ? 'ghost' : 'rose'}
              size="xs"
              disabled={isFreezingBots}
              onClick={() => handleBulkFreezeBots(525)}
              title="Bekukan 525 Bot ritel agar server ultra-ringan (100% Player Asli aman!)"
            >
              {isFreezingBots ? 'Memproses...' : `❄️ Bekukan 525 Bot (${frozenBotsCount} Beku)`}
            </Button>
            {frozenBotsCount > 0 && (
              <Button
                variant="ghost"
                size="xs"
                disabled={isFreezingBots}
                onClick={() => handleBulkFreezeBots(0)}
                title="Aktifkan kembali seluruh Bot"
              >
                Aktifkan Semua Bot
              </Button>
            )}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select text-xs py-2 px-3 bg-slate-900 border-slate-800 rounded-xl w-full sm:w-auto text-slate-200"
            >
              <option value="ALL">Semua Akun ({users?.length || 0})</option>
              <option value="ONLINE">🟢 Sedang Online Sekarang ({onlinePlayersCount})</option>
              <option value="OFFLINE">🔴 Sedang Offline</option>
              <option value="REAL_PLAYERS">👤 Player Asli ({realPlayersCount})</option>
              <option value="BOTS_ONLY">🤖 Akun Bot ({activeBotsCount} Aktif / {frozenBotsCount} Beku)</option>
              <option value="12_NAGA">🐉 12 Naga (Rank 1 - 12)</option>
              <option value="TAIPAN">👑 Taipan (Rank 13 - 35)</option>
              <option value="VIP">💎 Akun VIP</option>
              <option value="REGULER">Ritel & Reguler</option>
              <option value="ACTIVE">Status Aktif ({Math.max(0, (users?.length || 0) - bannedCount)})</option>
              <option value="BANNED">Dibekukan ({bannedCount})</option>
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
          <>
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
                {paginatedUsers.map((u) => {
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
                          <div className="relative shrink-0">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-md ${
                              is12Naga
                                ? 'bg-gradient-to-tr from-amber-500 to-amber-700 shadow-amber-500/20 text-slate-950 font-black'
                                : (isTaipan
                                    ? 'bg-gradient-to-tr from-sky-500 to-blue-700'
                                    : 'bg-gradient-to-tr from-violet-600 to-indigo-600')
                            }`}>
                              {u.name ? u.name.charAt(0).toUpperCase() : u.username?.charAt(0).toUpperCase() || 'P'}
                            </div>
                            {/* Titik Indikator Online (Hijau) / Offline (Merah) Real-Time */}
                            {!isBotUser(u) && (
                              <span
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 flex items-center justify-center ${
                                  u.is_online ? 'bg-emerald-500 shadow-emerald-500/60 shadow-sm' : 'bg-rose-500'
                                }`}
                                title={u.is_online ? 'Sedang Membuka APK (Live Online)' : 'Tidak Aktif (Offline)'}
                              >
                                {u.is_online && (
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                              <span className="truncate">{u.name || u.username}</span>
                              {!isBotUser(u) ? (
                                <Badge tone="emerald">👤 PLAYER ASLI</Badge>
                              ) : (
                                <Badge tone="slate">🤖 BOT</Badge>
                              )}
                              {!u.is_banned && is12Naga && <Badge tone="amber">🐉 12 NAGA #{rank}</Badge>}
                              {!u.is_banned && isTaipan && <Badge tone="sky">👑 TAIPAN #{rank}</Badge>}
                              {isVip && <Badge tone="gold">💎 VIP</Badge>}
                              {u.role === 'ADMIN' && <Badge tone="rose">ADMIN</Badge>}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate">
                              @{u.username} • {u.pt_name || 'PT Mandiri Konglomerat'} ({u.companies_owned?.length || 0} PT)
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
                        ) : isBotUser(u) ? (
                          <Badge tone="slate">BOT PASAR</Badge>
                        ) : u.is_online ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              ONLINE
                            </span>
                            <span className="text-[10px] text-emerald-400 font-semibold">Sedang Main</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-0.5 items-start">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800/80 text-slate-400 border border-slate-700/60">
                              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                              OFFLINE
                            </span>
                            {u.last_active_at ? (
                              <span className="text-[9.5px] text-slate-500 font-mono" title={new Date(u.last_active_at).toLocaleString('id-ID')}>
                                {formatRelativeTime(u.last_active_at)}
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-600 font-mono">Belum aktif</span>
                            )}
                          </div>
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

          {/* Pagination Controls */}
          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Menampilkan <strong>{startIndex + 1}</strong> - <strong>{Math.min(startIndex + pageSize, filtered.length)}</strong> dari <strong>{filtered.length}</strong> pemain</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="select py-1 px-2 text-xs bg-slate-900 border-slate-800 rounded-lg text-slate-200"
                >
                  <option value={25}>25 per hal</option>
                  <option value={50}>50 per hal</option>
                  <option value={100}>100 per hal</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(1)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-200 cursor-pointer"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-200 cursor-pointer"
                >
                  ‹ Prev
                </button>
                <span className="px-3 py-1 rounded bg-slate-900/80 border border-slate-800 text-amber-300 font-mono font-bold">
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-200 cursor-pointer"
                >
                  Next ›
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800 text-slate-200 cursor-pointer"
                >
                  »
                </button>
              </div>
            </div>
          )}
          </>
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
