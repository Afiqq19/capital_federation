import { useState, useEffect } from 'react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import { ib, dateTime } from '../../lib/format';
import { adminApi } from '../../api/admin';
import NotaryDeedModal from './NotaryDeedModal';
import {
  FileText,
  ShieldCheck,
  Award,
  AlertTriangle,
  Gavel,
  ScrollText,
  CheckCircle2,
  RefreshCw,
  Eye,
} from 'lucide-react';

export default function DeedRegistryPage() {
  const [deeds, setDeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedDeed, setSelectedDeed] = useState(null);

  const fetchDeeds = async () => {
    try {
      setLoading(true);
      const data = await adminApi.allDeeds();
      setDeeds(data || []);
    } catch (err) {
      console.error('Failed to load deeds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeeds();
  }, []);

  const filteredDeeds = deeds.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      (d.deed_number && d.deed_number.toLowerCase().includes(q)) ||
      (d.seller_name && d.seller_name.toLowerCase().includes(q)) ||
      (d.buyer_name && d.buyer_name.toLowerCase().includes(q)) ||
      (d.company_name && d.company_name.toLowerCase().includes(q)) ||
      (d.company_symbol && d.company_symbol.toLowerCase().includes(q));

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && d.status === 'ACTIVE') ||
      (statusFilter === 'WANPRESTASI' && d.status === 'BREACHED_WANPRESTASI');

    return matchSearch && matchStatus;
  });

  const totalValue = deeds.reduce((sum, d) => sum + (Number(d.total_price_ib) || 0), 0);
  const totalBreached = deeds.filter((d) => d.status === 'BREACHED_WANPRESTASI').length;

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Akta Teregistrasi"
          value={deeds.length}
          hint="Dokumen hukum resmi disahkan"
          icon={ScrollText}
          tone="sky"
        />
        <StatCard
          label="Akta Sah & Aktif"
          value={deeds.filter((d) => d.status === 'ACTIVE').length}
          hint="Kepemilikan saham telah beralih"
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Sengketa Wanprestasi"
          value={totalBreached}
          hint="Masuk persidangan PNAF"
          icon={AlertTriangle}
          tone={totalBreached > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          label="Total Nilai Akta Saham"
          value={ib(totalValue)}
          hint="Volume transaksi non-bursa (P2P)"
          icon={Award}
          tone="amber"
        />
      </div>

      {/* 2. Banner Informasi Notariat PNAF */}
      <Card className="bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-transparent border-amber-500/30">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Brankas Akta Notaris & Perjanjian Korporasi Republik Federasi Indigo
                <Badge tone="amber">KEPANITERAAN RESMI</Badge>
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Seluruh pengalihan porsi saham pendiri, divestasi blok saham, dan kontrak kesepakatan P2P terarsip di sini lengkap dengan bea meterai digital lunas, jam pembuatan, jam tanda tangan, dan klausul ganti rugi wanprestasi 20%.
              </p>
            </div>
          </div>

          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchDeeds} disabled={loading}>
            Segarkan
          </Button>
        </div>
      </Card>

      {/* 3. Daftar Akta Table */}
      <Card>
        <CardHeader
          title="Daftar Akta Notariat & Perjanjian Saham"
          subtitle="Arsip register akta peralihan hak saham berkekuatan hukum tetap"
          icon={ScrollText}
          tone="var(--amber)"
          action={
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-56">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Cari no akta / pihak / emiten..."
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-lg text-slate-300 w-full sm:w-auto"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Sah & Aktif</option>
                <option value="WANPRESTASI">Wanprestasi (Gugatan PNAF)</option>
              </select>
            </div>
          }
        />

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            ⏳ Memuat arsip dokumen akta kepaniteraan...
          </div>
        ) : filteredDeeds.length === 0 ? (
          <EmptyState
            title="Belum Ada Akta Tersimpan"
            description={
              search
                ? `Tidak ditemukan akta dengan kata kunci "${search}"`
                : 'Belum ada transaksi pengalihan saham P2P atau divestasi yang ditandatangani.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nomor Akta Notaris</th>
                  <th>Pihak Penjual (Pihak I)</th>
                  <th>Pihak Pembeli (Pihak II)</th>
                  <th>Objek Saham Dialihkan</th>
                  <th>Total Nilai Transaksi</th>
                  <th>Status Hukum</th>
                  <th>Meterai & Waktu</th>
                  <th className="right">Lembaran Akta</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeeds.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-900/60 transition-colors">
                    <td>
                      <div className="font-mono text-xs font-bold text-amber-300">
                        {d.deed_number}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ID: {d.id ? d.id.slice(0, 10) : '-'}...
                      </div>
                    </td>

                    <td>
                      <div className="text-xs font-semibold text-slate-200">
                        {d.seller_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Penjual / Pemilik Saham
                      </div>
                    </td>

                    <td>
                      <div className="text-xs font-semibold text-emerald-300">
                        {d.buyer_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Pembeli / Pemegang Hak Baru
                      </div>
                    </td>

                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100">{d.company_symbol}</span>
                        <Badge tone="sky">{d.percentage_transferred}% Saham</Badge>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                        {d.company_name} ({Number(d.shares_transferred || 0).toLocaleString('id-ID')} Lembar)
                      </div>
                    </td>

                    <td className="num font-bold text-slate-100">
                      {ib(d.total_price_ib)}
                    </td>

                    <td>
                      {d.status === 'BREACHED_WANPRESTASI' ? (
                        <Badge tone="rose" pulse>
                          <AlertTriangle size={10} className="mr-1" />
                          SENGKETA WANPRESTASI
                        </Badge>
                      ) : (
                        <Badge tone="emerald">
                          <CheckCircle2 size={10} className="mr-1" />
                          SAH & BERKEKUATAN HUKUM
                        </Badge>
                      )}
                    </td>

                    <td>
                      <div className="inline-block text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        METERAI LUNAS
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {dateTime(d.created_at)}
                      </div>
                    </td>

                    <td className="right">
                      <Button
                        variant="amber"
                        size="xs"
                        icon={Eye}
                        onClick={() => setSelectedDeed(d)}
                      >
                        Buka Akta
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 4. Modal Lembaran Asli Akta Notaris Otentik */}
      <NotaryDeedModal
        open={Boolean(selectedDeed)}
        onClose={() => setSelectedDeed(null)}
        deed={selectedDeed}
      />
    </div>
  );
}
