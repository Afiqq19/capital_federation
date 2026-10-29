import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import TradeSlipModal from './TradeSlipModal';
import { ib, ibShort, dateTime } from '../../lib/format';
import {
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  ShieldCheck,
  Activity,
  Eye,
  RefreshCw,
} from 'lucide-react';

export default function TransactionsPage() {
  const { transactions } = useAdmin();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedTrade, setSelectedTrade] = useState(null);

  const list = Array.isArray(transactions) ? transactions : [];

  const totalVolume = list.reduce((acc, t) => {
    const price = Number(t.price_per_share || t.price || 0);
    const total = Number(t.total_amount || t.total_amount_ib || t.total_ib || (t.lots * 100 * price) || 0);
    return acc + total;
  }, 0);

  const buyCount = list.filter((t) => t.type === 'BUY').length;
  const sellCount = list.filter((t) => t.type === 'SELL').length;

  const filtered = list.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (t.symbol && t.symbol.toLowerCase().includes(q)) ||
      (t.username && t.username.toLowerCase().includes(q)) ||
      (t.company_name && t.company_name.toLowerCase().includes(q));

    const matchesType = typeFilter === 'ALL' || t.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Transaksi Masuk"
          value={list.length}
          hint="Audit Trail 100 Terakhir"
          icon={FileText}
          tone="sky"
        />
        <StatCard
          label="Total Nilai Transaksi"
          value={ibShort(totalVolume)}
          hint="Volume Perputaran Dana"
          icon={Activity}
          tone="gold"
        />
        <StatCard
          label="Order Beli (BUY)"
          value={buyCount}
          hint="Tekanan Beli Pasar"
          icon={ArrowUpRight}
          tone="emerald"
        />
        <StatCard
          label="Order Jual (SELL)"
          value={sellCount}
          hint="Tekanan Jual Pasar"
          icon={ArrowDownRight}
          tone="rose"
        />
      </div>

      {/* 2. Transactions Table */}
      <Card>
        <CardHeader
          title="Audit Trail Transaksi Bursa & Kliring"
          subtitle="Setiap eksekusi order saham, nilai transaksi riil, kuantitas lot, dan biaya bursa dicatat permanen"
          icon={FileText}
          tone="var(--sky)"
          action={
            <div className="flex items-center gap-2">
              <div className="w-56">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Cari simbol / pemain / PT..."
                />
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-xl"
              >
                <option value="ALL">Semua Tipe Order</option>
                <option value="BUY">BUY (Beli Saham)</option>
                <option value="SELL">SELL (Jual Saham)</option>
                <option value="DIVIDEND">DIVIDEND (Bagi Dividen)</option>
                <option value="IPO">IPO (Penawaran Perdana)</option>
                <option value="TAKEOVER">TAKEOVER (Akuisisi)</option>
              </select>
            </div>
          }
        />

        {filtered.length === 0 ? (
          <EmptyState
            title="Tidak Ada Riwayat Transaksi"
            description={
              search
                ? `Tidak ditemukan transaksi yang sesuai dengan kata kunci "${search}"`
                : 'Belum ada transaksi perdagangan saham yang tercatat di bursa.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table min-w-[850px]">
              <thead>
                <tr>
                  <th>Waktu Eksekusi</th>
                  <th>Konglomerat (User)</th>
                  <th>Emiten</th>
                  <th>Tipe Order</th>
                  <th>Kuantitas (Lot / Saham)</th>
                  <th>Harga Eksekusi</th>
                  <th>Biaya Bursa (0.1%)</th>
                  <th className="right">Total Nilai Transaksi</th>
                  <th className="right">Slip</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => {
                  const isBuy = t.type === 'BUY';
                  const price = Number(t.price_per_share || t.price || 0);
                  const total = Number(t.total_amount || t.total_amount_ib || t.total_ib || (t.lots * 100 * price) || 0);
                  const fee = Number(t.fee || total * 0.001 || 0);
                  const lots = t.lots != null ? t.lots : Math.round((t.shares || 0) / 100);

                  return (
                    <tr
                      key={t.id || idx}
                      className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                      onClick={() => setSelectedTrade(t)}
                    >
                      <td className="text-xs text-slate-400 font-mono">
                        {dateTime(t.created_at)}
                      </td>

                      <td>
                        <span className="font-semibold text-slate-100">
                          {t.username || `User #${t.user_id}`}
                        </span>
                      </td>

                      <td>
                        <div className="font-bold text-slate-200">{t.symbol}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                          {t.company_name}
                        </div>
                      </td>

                      <td>
                        <Badge tone={isBuy ? 'emerald' : 'rose'}>
                          {isBuy ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
                          {t.type}
                        </Badge>
                      </td>

                      <td className="num font-semibold text-slate-200">
                        {lots.toLocaleString('id-ID')} lot <span className="text-[10px] text-slate-500">({(lots * 100).toLocaleString('id-ID')} lbr)</span>
                      </td>

                      <td className="num font-bold text-slate-200">
                        {ib(price)}
                      </td>

                      <td className="num text-slate-400 font-mono text-xs">
                        {ib(fee)}
                      </td>

                      <td className="right num font-black text-amber-300">
                        {ib(total)}
                      </td>

                      <td className="right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="xs"
                          icon={Eye}
                          onClick={() => setSelectedTrade(t)}
                        >
                          Slip
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

      {/* Trade Slip Modal */}
      <TradeSlipModal
        open={Boolean(selectedTrade)}
        onClose={() => setSelectedTrade(null)}
        trade={selectedTrade}
      />
    </div>
  );
}
