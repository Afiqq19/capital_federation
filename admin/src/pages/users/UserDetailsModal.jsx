import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { ib, ibShort, dateTime } from '../../lib/format';
import {
  Users,
  Building2,
  TrendingUp,
  Landmark,
  Wallet,
  AlertTriangle,
  Briefcase,
  PieChart,
} from 'lucide-react';

export default function UserDetailsModal({ open, onClose, user, onEdit }) {
  if (!user) return null;

  const companiesOwned = user.companies_owned || [];
  const portfolios = user.stock_portfolios || [];
  const loan = user.active_loan;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profil Kerajaan Konglomerat"
      subtitle={`Rincian Portofolio & Aset: ${user.name || user.username} (@${user.username})`}
      icon={Users}
      tone="var(--violet)"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="violet"
            size="sm"
            onClick={() => {
              onClose();
              if (onEdit) onEdit(user);
            }}
          >
            Edit Saldo & Akses
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Saldo Kas Pribadi</span>
            <div className="text-sm font-bold text-emerald-400 mt-1 font-mono">
              {ib(user.balance_ib ?? user.cash_balance_ib ?? 0)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Kas PT Utama</span>
            <div className="text-sm font-bold text-sky-400 mt-1 font-mono">
              {ib(user.company_balance_ib ?? 0)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Valuasi Portofolio</span>
            <div className="text-sm font-bold text-amber-400 mt-1 font-mono">
              {ib(user.stock_valuation ?? 0)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Kekayaan Riil</span>
            <div className="text-sm font-black text-slate-100 mt-1 font-mono">
              {ib(user.net_worth ?? user.balance_ib ?? 0)}
            </div>
          </div>
        </div>

        {/* 1. Perusahaan yang Dimiliki (PT Utama & Anak Perusahaan / Akuisisi) */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5">
              <Building2 size={14} className="text-sky-400" />
              Perseroan yang Dimiliki ({companiesOwned.length})
            </h4>
            <span className="text-[10px] text-slate-400">Kendali Manajemen Penuh</span>
          </div>

          {companiesOwned.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">
              Pemain belum memiliki perseroan tercatat atau anak perusahaan.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {companiesOwned.map((c) => (
                <div key={c.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 flex items-center gap-1">
                      <span className="font-mono text-amber-400">{c.symbol}</span> - {c.name}
                    </span>
                    <Badge tone={c.entity_type === 'PT_UTAMA' ? 'emerald' : (c.entity_type === 'AKUISISI' ? 'amber' : 'sky')}>
                      {c.entity_type === 'PT_UTAMA' ? '👑 PT UTAMA (HOLDING)' : (c.entity_type === 'AKUISISI' ? '🤝 AKUISISI' : '🏢 ANAK USAHA')}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Kas Perseroan: <strong className="text-emerald-400 font-mono">{ib(c.company_balance_ib)}</strong></span>
                    <span>Harga: <strong className="text-slate-200 font-mono">{ib(c.current_price)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Portofolio Saham di Bursa */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase flex items-center gap-1.5">
              <PieChart size={14} className="text-amber-400" />
              Portofolio Saham Publik ({portfolios.length} Emiten)
            </h4>
            <span className="text-[10px] text-slate-400">Kepemilikan Efek Bursa IPMC</span>
          </div>

          {portfolios.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-500">
              Tidak ada saham publik yang sedang dipegang di portofolio bursa.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
              {portfolios.map((p) => (
                <div key={p.company_id} className="p-2 rounded-lg bg-slate-950 flex items-center justify-between border border-slate-800/60">
                  <div>
                    <span className="font-bold text-slate-200 font-mono text-xs">{p.symbol}</span>
                    <span className="text-[11px] text-slate-400 ml-2">{p.name}</span>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {p.lots_owned} Lot @ Avg {ib(p.avg_buy_price)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-200 text-xs">
                      {ib(p.market_value)}
                    </div>
                    <div className={`text-[10px] font-bold ${p.floating_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {p.floating_profit >= 0 ? '+' : ''}{ib(p.floating_profit)} ({p.return_pct?.toFixed(1)}%)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Fasilitas Kredit Bank Sentral BIF */}
        {loan ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Landmark size={14} /> Fasilitas Kredit Bank Sentral BIF Aktif
              </span>
              <Badge tone={loan.is_overdue ? 'rose' : 'amber'}>
                {loan.is_overdue ? `MACET (${loan.days_overdue} HARI)` : 'LANCAR'}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-slate-400 block">Sisa Pokok + Bunga:</span>
                <span className="font-mono font-bold text-slate-200">{ib(loan.remaining_amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Cicilan Harian:</span>
                <span className="font-mono font-bold text-slate-200">{ib(loan.daily_payment || loan.principal_amount * 0.05)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Jatuh Tempo:</span>
                <span className="text-slate-200">{dateTime(loan.due_date)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Landmark size={14} className="text-emerald-400" /> Fasilitas Pinjaman Bank Sentral:
            </span>
            <span className="text-emerald-400 font-bold">Nihil / Bebas Hutang</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
