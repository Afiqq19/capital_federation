import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import SuspendStockModal from './SuspendStockModal';
import { ib, dateTime, timeLeft } from '../../lib/format';
import {
  Ban,
  Clock,
  Unlock,
  AlertOctagon,
  ShieldAlert,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export default function SuspensionPage() {
  const { oversight, companies, actions } = useAdmin();
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' = Semua Emiten Intervensi Cepat, 'SUSPENDED' = Sedang Dibekukan

  const suspensionList = oversight?.suspensionList || [];

  const filteredSuspended = suspensionList.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.symbol && c.symbol.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.suspended_reason && c.suspended_reason.toLowerCase().includes(q))
    );
  });

  const filteredAll = (companies || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.symbol && c.symbol.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Educational Banner */}
      <div className="card p-5 bg-gradient-to-r from-rose-500/15 via-slate-900/60 to-transparent border-rose-500/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 shrink-0">
            <Ban size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Suspensi Saham (Trading Halt / Pembekuan)
              <Badge tone="rose" pulse>TRADING FROZEN</Badge>
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Suspensi adalah tindakan intervensi tertinggi Otoritas Bursa berupa <strong className="text-rose-300">penghentian total perdagangan saham</strong>.
              Order baru ditolak dan antrian transaksi dibekukan sampai tanggal yang ditentukan atau dicabut manual oleh admin.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Emiten Dibekukan (Suspensi)"
          value={suspensionList.length}
          hint="Perdagangan dihentikan sementara"
          icon={Ban}
          tone="rose"
        />
        <StatCard
          label="Emiten Aktif Normal"
          value={Math.max(0, (companies?.length || 0) - suspensionList.length)}
          hint="Bebas diperdagangkan di pasar"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Sistem Pembekuan"
          value="TIMER & MANUAL"
          hint="Berakhir otomatis saat target tercapai"
          icon={Clock}
          tone="sky"
        />
      </div>

      {/* 3. Action Banner */}
      <Card className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-rose-950/20 border-rose-500/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-400" />
              Terapkan Pembekuan Saham Baru
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Tentukan emiten, durasi pembekuan (1 jam hingga 7 hari), serta alasan resmi pengumuman bursa.
            </p>
          </div>

          <Button
            variant="rose"
            onClick={() => setShowSuspendModal(true)}
            icon={Ban}
          >
            Bekukan Saham (Suspensi Baru)
          </Button>
        </div>
      </Card>

      {/* 4. Tab Switcher: Semua Emiten vs Hanya yang Disuspensi */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'ALL'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertOctagon size={14} />
          Semua Emiten Tercatat ({companies?.length || 0}) — Intervensi Cepat
        </button>

        <button
          onClick={() => setActiveTab('SUSPENDED')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'SUSPENDED'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Ban size={14} />
          Sedang Disuspensi Saat Ini ({suspensionList.length})
        </button>
      </div>

      {/* 5. Content Table Based on Active Tab */}
      {activeTab === 'ALL' ? (
        <Card>
          <CardHeader
            title="Daftar Seluruh Emiten untuk Intervensi Cepat Suspensi"
            subtitle="Pilih emiten yang bermasalah dan klik tombol Suspensi langsung dari baris tabel"
            icon={AlertOctagon}
            tone="var(--rose)"
            action={
              <div className="w-64">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Cari simbol / nama PT..."
                />
              </div>
            }
          />

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Simbol & Nama PT</th>
                  <th>Harga Saat Ini</th>
                  <th>Status Regulasi</th>
                  <th className="right">Tindakan Intervensi Otoritas</th>
                </tr>
              </thead>
              <tbody>
                {filteredAll.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{c.symbol}</span>
                        <span className="text-[11px] font-mono text-slate-500">#{c.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        {c.name}
                      </div>
                    </td>

                    <td className="num font-bold text-slate-200">
                      {ib(c.current_price)}
                    </td>

                    <td>
                      {c.is_suspended ? (
                        <Badge tone="rose" pulse>DIBEKUKAN (SUSPENSI)</Badge>
                      ) : c.is_uma ? (
                        <Badge tone="amber">DALAM RADAR UMA</Badge>
                      ) : (
                        <Badge tone="emerald">NORMAL</Badge>
                      )}
                    </td>

                    <td className="right">
                      <div className="flex items-center justify-end gap-1.5">
                        {c.is_suspended ? (
                          <Button
                            variant="emerald"
                            size="sm"
                            icon={Unlock}
                            onClick={() => actions.liftSuspension(c.id)}
                          >
                            Cabut Suspensi
                          </Button>
                        ) : (
                          <Button
                            variant="rose"
                            size="sm"
                            icon={Ban}
                            onClick={() => {
                              const reason = window.prompt(
                                `🔴 SUSPENSI PERDAGANGAN SAHAM ${c.symbol}\n\nMasukkan alasan resmi pengumuman bursa:`,
                                'Pola transaksi mencurigakan & indikasi goreng saham'
                              );
                              if (reason) {
                                actions.suspend(
                                  c.id,
                                  new Date(Date.now() + 86400000).toISOString(),
                                  reason
                                );
                              }
                            }}
                          >
                            Suspensi Cepat
                          </Button>
                        )}

                        {!c.is_uma && !c.is_suspended && (
                          <Button
                            variant="amber"
                            size="sm"
                            icon={AlertOctagon}
                            onClick={() =>
                              actions.flagUma(
                                c.id,
                                'Volatilitas tidak wajar terpantau otoritas'
                              )
                            }
                          >
                            Beri UMA
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="Daftar Saham yang Sedang Disuspensi"
            subtitle="Emiten dengan status perdagangan dibekukan oleh bursa efek"
            icon={Ban}
            tone="var(--rose)"
            action={
              <div className="w-64">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Cari emiten disuspensi..."
                />
              </div>
            }
          />

          {filteredSuspended.length === 0 ? (
            <EmptyState
              title="Tidak Ada Saham yang Disuspensi"
              description={
                search
                  ? `Tidak ditemukan emiten tersuspensi dengan kata kunci "${search}"`
                  : 'Seluruh saham emiten saat ini aktif diperdagangkan secara normal di bursa.'
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Emiten</th>
                    <th>Harga Terakhir</th>
                    <th>Batas Waktu Suspensi</th>
                    <th>Sisa Waktu</th>
                    <th>Alasan Pembekuan</th>
                    <th className="right">Tindakan Otoritas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuspended.map((c) => {
                    const remaining = timeLeft(c.suspended_until);
                    const isExpired = remaining === 'Berakhir';

                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-100">{c.symbol}</span>
                            <Badge tone="rose" pulse>DIBEKUKAN</Badge>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {c.name}
                          </div>
                        </td>

                        <td className="num font-bold text-slate-200">
                          {ib(c.current_price)}
                        </td>

                        <td className="text-slate-300 font-mono text-[11px]">
                          {dateTime(c.suspended_until)}
                        </td>

                        <td>
                          <Badge tone={isExpired ? 'slate' : 'rose'}>
                            {remaining}
                          </Badge>
                        </td>

                        <td className="text-slate-400 max-w-[220px] truncate text-[11px]">
                          {c.suspended_reason || 'Penyelidikan bursa'}
                        </td>

                        <td className="right">
                          <Button
                            variant="emerald"
                            size="sm"
                            icon={Unlock}
                            onClick={() => actions.liftSuspension(c.id)}
                          >
                            Cabut Suspensi
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modal Bekukan Saham */}
      <SuspendStockModal
        open={showSuspendModal}
        onClose={() => setShowSuspendModal(false)}
        companies={companies}
        onConfirm={actions.suspend}
      />
    </div>
  );
}

