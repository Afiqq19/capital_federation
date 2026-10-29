import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import FlagUmaModal from './FlagUmaModal';
import { ib, changePct, signedPct, dateTime } from '../../lib/format';
import {
  AlertTriangle,
  Zap,
  Sliders,
  CheckCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  Info,
} from 'lucide-react';

export default function UmaPage() {
  const { oversight, companies, actions } = useAdmin();
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [search, setSearch] = useState('');

  // Konfigurasi Auto-UMA
  const cfg = oversight?.config || { autoEnabled: true, thresholdPct: 15, clearPct: 7 };
  const [autoEnabled, setAutoEnabled] = useState(Boolean(cfg.autoEnabled));
  const [thresholdPct, setThresholdPct] = useState(Number(cfg.thresholdPct) || 15);
  const [clearPct, setClearPct] = useState(Number(cfg.clearPct) || 7);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const umaList = oversight?.umaList || [];

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSavingConfig(true);
    await actions.saveUmaConfig({ autoEnabled, thresholdPct, clearPct });
    setIsSavingConfig(false);
  };

  const filteredUma = umaList.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.symbol && c.symbol.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.uma_reason && c.uma_reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Educational Header Banner */}
      <div className="card p-5 bg-gradient-to-r from-amber-500/15 via-slate-900/60 to-transparent border-amber-500/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-300 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Radar Peringatan UMA (Unusual Market Activity)
              <Badge tone="amber">Peringatan Publik</Badge>
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              UMA merupakan penandaan resmi bagi saham yang mengalami peningkatan atau penurunan harga serta volume di luar kebiasaan.
              <strong className="text-amber-300"> Perdagangan saham tetap berjalan normal</strong> (tidak dibekukan). Investor diimbau memperhatikan keterbukaan informasi.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Emiten Radar UMA"
          value={umaList.length}
          hint="Saham dalam pemantauan ketat"
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Mesin Auto-UMA"
          value={autoEnabled ? 'AKTIF' : 'NONAKTIF'}
          hint={`Pemicu: Fluktuasi ≥ ${thresholdPct}%`}
          icon={Zap}
          tone={autoEnabled ? 'emerald' : 'slate'}
        />
        <StatCard
          label="Ambang Normalisasi"
          value={`≤ ${clearPct}%`}
          hint="Otomatis dicabut bila stabil"
          icon={ShieldCheck}
          tone="sky"
        />
      </div>

      {/* 3. Auto-UMA Engine Config & Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engine Settings */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Konfigurasi Mesin Deteksi Auto-UMA"
            subtitle="Sistem otomatis memindai harga seluruh emiten setiap siklus bursa"
            icon={Sliders}
            tone="var(--amber)"
          />

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Aktifkan Deteksi Otomatis (Auto-Surveillance)
                </span>
                <span className="text-[11px] text-slate-400">
                  Emiten yang melompat melebihi batas toleransi akan langsung diberi sinyal UMA.
                </span>
              </div>
              <button
                type="button"
                className="switch"
                data-on={autoEnabled}
                onClick={() => setAutoEnabled(!autoEnabled)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <label className="label">Ambang Deteksi UMA (% Perubahan 24 Jam)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={thresholdPct}
                    onChange={(e) => setThresholdPct(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-mono font-bold text-amber-400 text-sm w-12 text-right">
                    {thresholdPct}%
                  </span>
                </div>
                <p className="hint">Bursa akan otomatis menandai UMA jika kenaikan/penurunan ≥ {thresholdPct}%</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <label className="label">Ambang Pencabutan Otomatis (% Toleransi Stabil)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="2"
                    max="20"
                    step="1"
                    value={clearPct}
                    onChange={(e) => setClearPct(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="font-mono font-bold text-sky-400 text-sm w-12 text-right">
                    {clearPct}%
                  </span>
                </div>
                <p className="hint">Status UMA dicabut otomatis jika volatilitas turun kembali ≤ {clearPct}%</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="amber" type="submit" disabled={isSavingConfig}>
                {isSavingConfig ? 'Menyimpan...' : 'Simpan Konfigurasi Auto-UMA'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Manual Action Card */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 flex flex-col justify-between">
          <CardHeader
            title="Intervensi UMA Manual"
            subtitle="Tetapkan peringatan secara langsung"
            icon={ShieldAlert}
            tone="var(--amber)"
          />

          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Otoritas Bursa dapat menetapkan status UMA secara manual terhadap emiten yang dicurigai adanya manipulasi pasar (cornering, spoofing, rumor palsu).
            </p>

            <Button
              variant="amber"
              block
              onClick={() => setShowFlagModal(true)}
              icon={AlertTriangle}
            >
              Terbitkan Radar UMA Manual
            </Button>
          </div>
        </Card>
      </div>

      {/* 4. Active UMA Table */}
      <Card>
        <CardHeader
          title="Daftar Emiten dalam Radar UMA"
          subtitle="Emiten yang saat ini berstatus dalam pengawasan ketat bursa"
          icon={AlertTriangle}
          tone="var(--amber)"
          action={
            <div className="w-64">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Cari simbol / nama / alasan..."
              />
            </div>
          }
        />

        {filteredUma.length === 0 ? (
          <EmptyState
            title="Tidak Ada Emiten Berstatus UMA"
            description={
              search
                ? `Tidak ditemukan emiten UMA dengan pencarian "${search}"`
                : 'Saat ini kondisi pergerakan seluruh emiten di bursa berada dalam batas kewajaran normal.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Emiten</th>
                  <th>Harga Saat Ini</th>
                  <th>Perubahan 24 Jam</th>
                  <th>Sumber Deteksi</th>
                  <th>Tanggal Terbit</th>
                  <th>Alasan / Keterbukaan Informasi</th>
                  <th className="right">Tindakan Otoritas</th>
                </tr>
              </thead>
              <tbody>
                {filteredUma.map((c) => {
                  const chg = changePct(c);
                  const isAuto = c.uma_source === 'AUTO' || !c.uma_source;
                  const isUp = c.uma_direction ? c.uma_direction === 'UP' : chg >= 0;

                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{c.symbol}</span>
                          <Badge tone={isUp ? 'emerald' : 'rose'}>
                            {isUp ? 'UMA NAIK ▲' : 'UMA TURUN ▼'}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {c.name}
                        </div>
                      </td>

                      <td className="num font-bold text-slate-200">
                        {ib(c.current_price)}
                      </td>

                      <td className="num font-bold">
                        <span className={chg >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {signedPct(chg)}
                        </span>
                      </td>

                      <td>
                        <Badge tone={isAuto ? 'sky' : 'violet'}>
                          {isAuto ? 'AUTO-ENGINE' : 'MANUAL ADMIN'}
                        </Badge>
                      </td>

                      <td className="text-xs text-slate-400">
                        {dateTime(c.uma_date || c.updated_at)}
                      </td>

                      <td className="text-xs text-slate-300 max-w-xs truncate" title={c.uma_reason}>
                        {c.uma_reason || 'Pergerakan harga kumulatif tidak lazim'}
                      </td>

                      <td className="right">
                        <Button
                          variant="emerald"
                          size="sm"
                          icon={CheckCircle}
                          onClick={() => actions.clearUma(c.id)}
                        >
                          Cabut UMA
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

      {/* Modal Terbitkan UMA Manual */}
      <FlagUmaModal
        open={showFlagModal}
        onClose={() => setShowFlagModal(false)}
        companies={companies}
        onConfirm={actions.flagUma}
      />
    </div>
  );
}
