import { useState, useEffect } from 'react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { FormField, Input } from '../../components/ui/Form';
import { adminApi } from '../../api/admin';
import { useAdmin } from '../../context/AdminContext';
import {
  Flame,
  Percent,
  Sparkles,
  Zap,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Save,
  RotateCcw,
  Factory,
  Cpu,
  Coins,
  Shield,
  Layers,
} from 'lucide-react';

const SECTOR_ICONS = {
  Teknologi: Cpu,
  Energi: Zap,
  Properti: Building2,
  Keuangan: Coins,
  'F&B': Flame,
  Manufaktur: Factory,
};

export default function SectorSubsidiesPage() {
  const { notify } = useAdmin();
  const toast = {
    success: (m) => notify?.(m, 'success'),
    error: (m) => notify?.(m, 'error'),
    info: (m) => notify?.(m, 'info'),
  };
  const [subsidies, setSubsidies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadSubsidies = async (silent = false) => {
    if (silent !== true) setIsLoading(true);
    try {
      const data = await adminApi.subsidiesStatus();
      setSubsidies(data || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat status subsidi sektoral');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubsidies(false);
  }, []);

  const handleToggle = async (item) => {
    try {
      const newActive = !item.is_active;
      const res = await adminApi.subsidiesToggle({
        sector: item.sector,
        isActive: newActive,
        effectiveTaxRatePct: item.effective_tax_rate_pct,
        operationalGrantIb: item.operational_grant_ib,
      });
      toast.success(res.message);
      loadSubsidies(true);
    } catch (err) {
      toast.error(err.message || 'Gagal mengubah status subsidi');
    }
  };

  const handleFieldChange = (id, field, value) => {
    setSubsidies((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const res = await adminApi.subsidiesBatchSave({ items: subsidies });
      toast.success(res.message);
      loadSubsidies(true);
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setIsSaving(false);
    }
  };

  const activeCount = subsidies.filter((s) => s.is_active === 1 || s.is_active === true).length;

  return (
    <div className="space-y-6 page-enter pb-16">
      {/* 1. Header Banner */}
      <div className="card p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-900/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/50">
            <Flame size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-slate-100 tracking-tight">
                Insentif Fiskal & Subsidi Sektoral Dinamis (Tax Holiday)
              </h2>
              <Badge tone="emerald">Pilar 2: Akselerasi Industri</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-2xl">
              Berikan potongan PPh Badan terarah dan bantuan operasional langsung untuk memicu rotasi sektoral bursa, mendorong pendirian PT, dan memacu pertumbuhan industri prioritas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="primary"
            icon={Save}
            disabled={isSaving}
            onClick={handleSaveAll}
            className="shadow-lg shadow-emerald-500/20"
          >
            {isSaving ? 'Menyimpan...' : 'Simpan Semua Kebijakan'}
          </Button>
        </div>
      </div>

      {/* 2. KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Sektor Disubsidi Aktif"
          value={`${activeCount} Sektor`}
          subValue={`Dari Total ${subsidies.length} Sektor Industri`}
          hint="Menerima diskon tarif PPh Badan"
          icon={Flame}
          tone="emerald"
        />
        <StatCard
          label="Rata-rata Diskon PPh"
          value="Diskon 50%"
          subValue="PPh Badan normal 10% ➔ Menjadi 5%"
          hint="Mendorong laba bersih perseroan naik"
          icon={Percent}
          tone="gold"
        />
        <StatCard
          label="Dampak Bursa Saham"
          value="Bullish Sektoral"
          subValue="Memacu minat beli investor ritel"
          hint="Disiarkan lewat Breaking News bursa"
          icon={TrendingUp}
          tone="sky"
        />
      </div>

      {/* 3. Grid Kartu Sektor Industri */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">Memuat katalog sektor industri...</div>
        ) : (
          subsidies.map((item) => {
            const isActive = item.is_active === 1 || item.is_active === true;
            const Icon = SECTOR_ICONS[item.sector] || Building2;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 relative overflow-hidden ${
                  isActive
                    ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                )}

                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isActive
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-100">{item.sector}</h4>
                      <Badge tone={isActive ? 'emerald' : 'slate'} className="mt-0.5">
                        {isActive ? '🔥 TAX HOLIDAY AKTIF' : 'STANDAR REGULASI'}
                      </Badge>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle(item)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                    }`}
                  >
                    {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>

                {/* Form Pengaturan Parameter Sektor */}
                <div className="space-y-3 pt-2 border-t border-slate-800/80 relative z-10 text-xs">
                  <FormField
                    label="Tarif PPh Badan Efektif (%)"
                    hint={isActive ? 'Tarif diskon aktif yang diterapkan' : 'Tarif jika subsidi diaktifkan'}
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="25"
                        step="0.5"
                        value={item.effective_tax_rate_pct || 5}
                        onChange={(e) => handleFieldChange(item.id, 'effective_tax_rate_pct', e.target.value)}
                        className="font-mono font-bold text-amber-300"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs text-slate-400">% PPh</span>
                    </div>
                  </FormField>

                  <FormField
                    label="Bantuan Subsidi Operasional (IB / Siklus)"
                    hint="Pengurangan beban kantor disubsidi Kas Negara"
                  >
                    <Input
                      type="number"
                      min="0"
                      step="500000"
                      value={item.operational_grant_ib || 0}
                      onChange={(e) => handleFieldChange(item.id, 'operational_grant_ib', e.target.value)}
                      className="font-mono"
                    />
                  </FormField>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  📢 <strong>Status Berita:</strong> {item.headline_news || `Program Insentif Sektor ${item.sector}`}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
