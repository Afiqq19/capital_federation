import { useState, useEffect, useMemo, useRef } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { FormField, Input, Select } from '../../components/ui/Form';
import {
  Sliders,
  Shield,
  Landmark,
  Scale,
  Save,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Clock,
  Building2,
  TrendingUp,
  Zap,
  RotateCcw,
  Sparkles,
  Calculator,
  Gauge,
  Flame,
  ShieldAlert,
  DollarSign,
  ArrowRight,
  Activity,
  Layers,
  FileCheck2,
  Database,
  Download,
  Camera,
  ShieldCheck,
} from 'lucide-react';

const TABS = [
  { id: 'fiscal', label: 'Fiskal & Pajak', icon: Coins, tone: 'gold' },
  { id: 'corporate', label: 'Operasional PT & Pailit', icon: Building2, tone: 'emerald' },
  { id: 'monetary', label: 'Moneter & Bank Sentral', icon: Landmark, tone: 'sky' },
  { id: 'market', label: 'Bursa Efek & IPO', icon: TrendingUp, tone: 'violet' },
  { id: 'legal', label: 'Hukum Niaga & PNAF', icon: Scale, tone: 'rose' },
  { id: 'backup', label: 'Cadangan Basis Data', icon: Database, tone: 'emerald' },
];

export default function SettingsPage() {
  const { settings, actions, toast } = useAdmin();

  // Master Form State covering all engine parameters
  const [form, setForm] = useState({
    // Fiskal & Kas Negara
    corporate_tax_rate_pct: '10',
    trading_fee_pct: '0.15',
    stamp_duty_fee_ib: '10000',
    pnk_filing_fee_ib: '500000',

    // Operasional Perseroan & Pailit
    cash_flow_interval_minutes: '25',
    bankruptcy_limit_ib: '-50000000',
    base_operational_cost_ib: '3000000',
    employee_salary_per_head_ib: '100000',
    pt_establishment_cost_ib: '10000000',
    initial_pt_cash_ib: '10000000',

    // Moneter & Perbankan
    interest_rate: '6.5',
    max_loan_limit: '1000000000',
    inflation_rate: '8.3',
    economic_state: 'NORMAL',

    // Bursa & Pasar Modal
    market_status: 'OPEN',
    ara_limit_pct: '25',
    arb_limit_pct: '25',
    uma_threshold_pct: '48',
    uma_auto_enabled: 'true',
    bot_auto_intervention: 'true',
    min_ipo_capital: '50000000',
    ipo_min_level: '4',

    // Hukum Niaga
    market_manipulation_fine_ib: '25000000',
  });

  const [activeTab, setActiveTab] = useState('fiscal');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const [backupSnapshots, setBackupSnapshots] = useState([]);
  const [isSnapshotting, setIsSnapshotting] = useState(false);

  const fetchBackupStatus = async () => {
    try {
      const res = await fetch('/api/admin/backup/status?key=19122004');
      const data = await res.json();
      if (data && data.snapshots) {
        setBackupSnapshots(data.snapshots);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (activeTab === 'backup') {
      fetchBackupStatus();
    }
  }, [activeTab]);

  const handleCreateSnapshot = async () => {
    setIsSnapshotting(true);
    try {
      const res = await fetch('/api/admin/backup/snapshot?key=19122004', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast?.success?.('Snapshot Berhasil', data.message);
        fetchBackupStatus();
      } else {
        toast?.error?.('Gagal Snapshot', data.error || 'Terjadi kesalahan');
      }
    } catch (err) {
      toast?.error?.('Koneksi Gagal', err.message);
    } finally {
      setIsSnapshotting(false);
    }
  };

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      // PENTING: Jangan timpa input admin saat sedang mengetik (isDirty)
      if (!isDirtyRef.current) {
        setForm((prev) => ({
          ...prev,
          ...settings,
        }));
      }
    }
  }, [settings]);

  const handleChange = (key, value) => {
    isDirtyRef.current = true;
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handlePreset = (presetName) => {
    isDirtyRef.current = true;
    if (presetName === 'stimulus') {
      setForm((prev) => ({
        ...prev,
        corporate_tax_rate_pct: '5',
        trading_fee_pct: '0.1',
        interest_rate: '3.5',
        max_loan_limit: '2000000000',
        base_operational_cost_ib: '2000000',
        bankruptcy_limit_ib: '-75000000',
        economic_state: 'EXPANSION',
      }));
    } else if (presetName === 'balanced') {
      setForm((prev) => ({
        ...prev,
        corporate_tax_rate_pct: '10',
        trading_fee_pct: '0.15',
        interest_rate: '6.5',
        max_loan_limit: '1000000000',
        base_operational_cost_ib: '3000000',
        bankruptcy_limit_ib: '-50000000',
        cash_flow_interval_minutes: '25',
        economic_state: 'NORMAL',
      }));
    } else if (presetName === 'hawkish') {
      setForm((prev) => ({
        ...prev,
        corporate_tax_rate_pct: '18',
        trading_fee_pct: '0.3',
        interest_rate: '11.5',
        max_loan_limit: '500000000',
        base_operational_cost_ib: '5000000',
        bankruptcy_limit_ib: '-30000000',
        economic_state: 'CONTRACTION',
      }));
    }
    setIsDirty(true);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await actions.saveSettings(form);
      isDirtyRef.current = false;
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Simulation Calculations for User Insight
  const sim = useMemo(() => {
    const tax = parseFloat(form.corporate_tax_rate_pct) || 10;
    const intervalMin = parseInt(form.cash_flow_interval_minutes, 10) || 25;
    const ops = parseFloat(form.base_operational_cost_ib) || 3000000;
    const salary = parseFloat(form.employee_salary_per_head_ib) || 100000;
    const bankruptLimit = Math.abs(parseFloat(form.bankruptcy_limit_ib) || 50000000);
    
    // Asumsi contoh PT level 2 dengan 10 staf
    const sampleBurnPerCycle = ops + (10 * salary);
    const cyclesPerDay = Math.floor((24 * 60) / intervalMin);
    const maxSurvivingCycles = Math.floor(bankruptLimit / sampleBurnPerCycle);
    const maxSurvivingHours = ((maxSurvivingCycles * intervalMin) / 60).toFixed(1);

    return {
      cyclesPerDay,
      sampleBurnPerCycle,
      maxSurvivingCycles,
      maxSurvivingHours,
      sampleTaxFrom50M: (50000000 * (tax / 100)).toLocaleString('id-ID'),
    };
  }, [form]);

  return (
    <div className="space-y-6 page-enter pb-16">
      {/* 1. Federal Header Command Center */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shrink-0 shadow-lg shadow-indigo-950/50">
              <Sliders size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-slate-100 tracking-tight">
                  Pusat Kendali Regulasi & Ekonomi Game
                </h2>
                <Badge tone="emerald" className="animate-pulse">
                  <Activity size={12} className="inline mr-1" />
                  Live Sync APK & WebSocket
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-3xl">
                Seluruh parameter moneter, tarif pajak negara, siklus omzet perseroan, dan limitasi bursa disinkronkan secara instan ke jutaan perangkat aplikasi seluler pemain tanpa perlu restart server.
              </p>
            </div>
          </div>

          {/* Quick Macro Presets */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 shrink-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1.5">
              <Zap size={13} className="text-amber-400" />
              Preset:
            </span>
            <button
              type="button"
              onClick={() => handlePreset('stimulus')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all hover:scale-105"
              title="Pajak 5%, Bunga 3.5%, Plafon 2M"
            >
              🌱 Stimulus Pro-Bisnis
            </button>
            <button
              type="button"
              onClick={() => handlePreset('balanced')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-all hover:scale-105"
              title="Pajak 10%, Bunga 6.5%, Plafon 1M, Siklus 25m"
            >
              ⚖️ Golden Balance
            </button>
            <button
              type="button"
              onClick={() => handlePreset('hawkish')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all hover:scale-105"
              title="Pajak 18%, Bunga 11.5%, Pailit Cepat"
            >
              🦅 Hawkish Ketat
            </button>
          </div>
        </div>
      </div>

      {/* 2. Mini KPI Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Siklus Arus Kas"
          value={`${form.cash_flow_interval_minutes} Menit`}
          subValue={`${sim.cyclesPerDay}x Eksekusi / Hari`}
          hint="Perputaran omzet & beban gaji PT"
          icon={Clock}
          tone="sky"
        />
        <StatCard
          label="Tarif PPh Badan"
          value={`${form.corporate_tax_rate_pct}%`}
          subValue="Masuk Brankas Kas Negara"
          hint="Dipotong dari laba bersih PT"
          icon={Coins}
          tone="gold"
        />
        <StatCard
          label="Batas Defisit Pailit"
          value={`IB ${(Math.abs(Number(form.bankruptcy_limit_ib || 50000000)) / 1000000).toFixed(0)} Jt`}
          subValue={`Toleransi ~${sim.maxSurvivingHours} Jam Burn`}
          hint="Ambang batas PT dibekukan sistem"
          icon={ShieldAlert}
          tone="rose"
        />
        <StatCard
          label="Suku Bunga Acuan BCF"
          value={`${form.interest_rate}%`}
          subValue={`Status: ${form.economic_state || 'NORMAL'}`}
          hint="Kredit likuiditas bank sentral"
          icon={Landmark}
          tone="emerald"
        />
      </div>

      {/* 3. Modern Category Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/15 backdrop-blur-md scale-[1.02]'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-slate-800/90'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-emerald-400' : ''} />
              <span>{tab.label}</span>
              {isActive ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              ) : (
                tab.id === 'fiscal' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400/70" />
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Tab Content Panel */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: FISKAL & PAJAK NEGARA */}
        {/* ========================================================= */}
        {activeTab === 'fiscal' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Instrumen Penerimaan Perpajakan Negara"
                subtitle="Penetapan tarif pajak langsung dan pungutan resmi yang disetorkan ke Kas Negara"
                icon={Coins}
                tone="var(--gold)"
              />
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormField
                    label="Tarif Pajak PPh Badan (%)"
                    hint="Persentase laba operasional bersih setiap PT yang otomatis dipungut ke Brankas Kas Negara setiap siklus arus kas."
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={form.corporate_tax_rate_pct}
                        onChange={(e) => handleChange('corporate_tax_rate_pct', e.target.value)}
                        required
                        className="font-mono text-base font-bold text-amber-300"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">% PPh</span>
                    </div>
                  </FormField>

                  <FormField
                    label="Pajak Transaksi Perdagangan Bursa (%)"
                    hint="Potongan pajak transaksi atas seluruh aktivitas jual-beli saham ritel dan pasar negosiasi P2P."
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.01"
                        value={form.trading_fee_pct}
                        onChange={(e) => handleChange('trading_fee_pct', e.target.value)}
                        required
                        className="font-mono text-base font-bold text-amber-300"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">% Fee</span>
                    </div>
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-800/80">
                  <FormField
                    label={
                      <div className="flex items-center justify-between w-full">
                        <span>Bea Meterai Digital Korporasi (IB)</span>
                        <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                          IB {Number(form.stamp_duty_fee_ib || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    }
                    hint="Biaya pengesahan Akta Notaris Elektronik untuk setiap penandatanganan perjanjian saham P2P."
                  >
                    <Input
                      type="number"
                      min="0"
                      step="1000"
                      value={form.stamp_duty_fee_ib}
                      onChange={(e) => handleChange('stamp_duty_fee_ib', e.target.value)}
                      required
                      className="font-mono text-base font-bold text-slate-100"
                    />
                  </FormField>

                  <FormField
                    label={
                      <div className="flex items-center justify-between w-full">
                        <span>Biaya Pendaftaran Gugatan PNAF (IB)</span>
                        <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                          IB {Number(form.pnk_filing_fee_ib || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    }
                    hint="Biaya pendaftaran perkara sengketa wanprestasi di Pengadilan Niaga Federasi yang disetor penggugat."
                  >
                    <Input
                      type="number"
                      min="0"
                      step="50000"
                      value={form.pnk_filing_fee_ib}
                      onChange={(e) => handleChange('pnk_filing_fee_ib', e.target.value)}
                      required
                      className="font-mono text-base font-bold text-slate-100"
                    />
                  </FormField>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
                  <Coins size={18} className="shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 font-bold block mb-1">
                      Konektivitas Brankas Kas Negara Terpadu:
                    </strong>
                    Semua penerimaan dari PPh Badan ({form.corporate_tax_rate_pct}%), pajak bursa ({form.trading_fee_pct}%), dan bea meterai (IB {Number(form.stamp_duty_fee_ib || 10000).toLocaleString('id-ID')}) langsung menambah saldo <strong>Treasury Vault</strong> secara real-time. Anda dapat mencairkan atau mendistribusikan dana ini kapan saja melalui menu <em>Kas Negara (Treasury)</em>.
                  </div>
                </div>
              </div>
            </Card>

            {/* Fiscal Simulator Card */}
            <Card>
              <CardHeader
                title="Simulasi Dampak Fiskal"
                subtitle="Estimasi penerimaan kas negara"
                icon={Calculator}
                tone="var(--gold)"
              />
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-medium">Contoh: PT Laba IB 50.000.000 / siklus</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Setoran PPh ke Negara:</span>
                    <span className="font-mono font-bold text-amber-400">IB {sim.sampleTaxFrom50M}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Laba Bersih Masuk PT:</span>
                    <span className="font-mono text-emerald-400">IB {(50000000 * (1 - (form.corporate_tax_rate_pct / 100))).toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-medium">Estimasi 10 Transaksi Akta P2P (IB 100Jt)</div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Total Pajak Bursa:</span>
                    <span className="font-mono font-bold text-sky-400">
                      IB {(1000000000 * (form.trading_fee_pct / 100)).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Total Bea Meterai Digital:</span>
                    <span className="font-mono font-bold text-sky-400">
                      IB {(10 * Number(form.stamp_duty_fee_ib || 10000)).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-900/40 text-[11px] text-indigo-300">
                  💡 <strong>Saran Ekonomi:</strong> Tarif pajak 8% - 12% memberikan insentif ekspansi optimal bagi konglomerat tanpa mencekik likuiditas kas operasional.
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: OPERASIONAL PT & PAILIT */}
        {/* ========================================================= */}
        {activeTab === 'corporate' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Siklus Arus Kas & Parameter Beban Usaha"
                subtitle="Atur durasi perputaran omzet, gaji tenaga kerja, dan batas kebangkrutan PT"
                icon={Building2}
                tone="var(--emerald)"
              />
              <div className="space-y-5">
                <FormField
                  label="Interval Waktu Siklus Arus Kas Perusahaan"
                  hint="Durasi jeda di antara eksekusi otomatis perhitungan omzet penjualan produk, pemotongan gaji, dan pajak PPh seluruh perseroan aktif."
                >
                  <Select
                    value={form.cash_flow_interval_minutes || '25'}
                    onChange={(e) => handleChange('cash_flow_interval_minutes', e.target.value)}
                    className="font-bold text-emerald-400"
                  >
                    <option value="5">⚡ Tiap 5 Menit (Mode Simulasi Sangat Cepat)</option>
                    <option value="15">🚀 Tiap 15 Menit (Cepat & Dinamis)</option>
                    <option value="25">⭐ Tiap 25 Menit (Standar Rekomendasi Game Capital Federation)</option>
                    <option value="30">🍵 Tiap 30 Menit (Moderasi Santai)</option>
                    <option value="60">⏳ Tiap 60 Menit (1 Jam - Mode Realistis)</option>
                  </Select>
                </FormField>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-800/80">
                  <FormField
                    label={
                      <div className="flex items-center justify-between w-full">
                        <span>Batas Toleransi Defisit Pailit (IB)</span>
                        <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                          IB {Number(form.bankruptcy_limit_ib || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    }
                    hint="Batas maksimum saldo kas perusahaan minus. Jika kas PT tembus di bawah angka ini, PT dibekukan (PAILIT)."
                  >
                    <Input
                      type="number"
                      step="5000000"
                      value={form.bankruptcy_limit_ib}
                      onChange={(e) => handleChange('bankruptcy_limit_ib', e.target.value)}
                      required
                      className="font-mono font-bold text-rose-400"
                    />
                  </FormField>

                  <FormField
                    label={
                      <div className="flex items-center justify-between w-full">
                        <span>Beban Operasional Dasar PT (IB / Siklus)</span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                          IB {Number(form.base_operational_cost_ib || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    }
                    hint="Beban tetap pemeliharaan kantor, server, dan legalitas yang wajib dibayar PT tiap siklus waktu."
                  >
                    <Input
                      type="number"
                      min="0"
                      step="500000"
                      value={form.base_operational_cost_ib}
                      onChange={(e) => handleChange('base_operational_cost_ib', e.target.value)}
                      required
                      className="font-mono font-bold text-slate-100"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2 border-t border-slate-800/80">
                  <FormField
                    label={
                      <div className="flex items-center justify-between w-full">
                        <span>Gaji Pegawai (IB)</span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                          IB {Number(form.employee_salary_per_head_ib || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    }
                    hint="Beban upah per unit karyawan"
                  >
                    <Input
                      type="number"
                      min="0"
                      step="25000"
                      value={form.employee_salary_per_head_ib}
                      onChange={(e) => handleChange('employee_salary_per_head_ib', e.target.value)}
                      required
                      className="font-mono font-bold text-slate-100"
                    />
                  </FormField>

                  <FormField
                    label={
                      <div className="flex items-center justify-between w-full">
                        <span>Biaya Pendirian PT (IB)</span>
                        <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                          IB {Number(form.pt_establishment_cost_ib || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    }
                    hint="Modal setor awal saat dirikan PT"
                  >
                    <Input
                      type="number"
                      min="1000000"
                      step="1000000"
                      value={form.pt_establishment_cost_ib}
                      onChange={(e) => handleChange('pt_establishment_cost_ib', e.target.value)}
                      required
                      className="font-mono font-bold text-slate-100"
                    />
                  </FormField>

                  <FormField
                    label={
                      <div className="flex items-center justify-between w-full">
                        <span>Kas Saldo Awal PT (IB)</span>
                        <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                          IB {Number(form.initial_pt_cash_ib || 0).toLocaleString('id-ID')}
                        </span>
                      </div>
                    }
                    hint="Saldo awal rekening PT baru"
                  >
                    <Input
                      type="number"
                      min="0"
                      step="1000000"
                      value={form.initial_pt_cash_ib}
                      onChange={(e) => handleChange('initial_pt_cash_ib', e.target.value)}
                      required
                      className="font-mono font-bold text-slate-100"
                    />
                  </FormField>
                </div>

                {/* Banner Penjelasan Skema Subsidi Akun Baru vs Tarif Penuh */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-cyan-950/40 border border-emerald-500/30 text-xs text-slate-300 leading-relaxed space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm">
                    <Sparkles size={16} className="shrink-0 text-emerald-400" />
                    <span>Mekanisme Regulasi Biaya PT: Khusus Akun Baru vs PT Ke-2 / Pasca Penjualan</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                    <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/30 space-y-1">
                      <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        Khusus Akun Baru (PT Pertama Pemula):
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Mendapatkan <strong>Subsidi Penuh Kas Negara</strong>: Biaya pendirian tetap tarif standar murah pemula <strong>IB 10.000.000</strong> (dengan Kas Awal <strong>IB 10.000.000</strong>) serta kemudahan IPO Perdana (Kas PT minimal cukup IB 15.000.000 & Bebas Biaya Listing IB 0).
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-950/50 border border-amber-500/30 space-y-1">
                      <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        PT Ke-2 (Anak Usaha) / Pasca PT Utama Dijual:
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Wajib mengikuti <strong>Tarif Penuh Regulasi Settingan Anda Di Atas</strong> (Biaya: <strong>IB {Number(form.pt_establishment_cost_ib || 10000000000).toLocaleString('id-ID')}</strong>, Kas Awal: <strong>IB {Number(form.initial_pt_cash_ib || 1000000000).toLocaleString('id-ID')}</strong>). Syarat IPO berikutnya juga berlaku regulasi penuh bursa!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Corporate Health Simulator */}
            <Card>
              <CardHeader
                title="Kalkulator Kelangsungan PT"
                subtitle="Prediksi ketahanan modal perseroan"
                icon={Flame}
                tone="var(--emerald)"
              />
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-medium">Beban Tetap PT Tipikal (10 Karyawan):</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">Biaya per Siklus:</span>
                    <span className="font-mono font-bold text-rose-400">
                      -IB {sim.sampleBurnPerCycle.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Frekuensi Siklus:</span>
                    <span className="font-mono text-slate-200">Setiap {form.cash_flow_interval_minutes} Menit</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-medium">Ketahanan Jika Tanpa Penjualan:</div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Maksimum Siklus Bertahan:</span>
                    <span className="font-mono font-bold text-amber-400">{sim.maxSurvivingCycles}x Siklus</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Waktu Hingga Pailit:</span>
                    <span className="font-mono font-bold text-amber-400">~{sim.maxSurvivingHours} Jam Nyata</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-900/40 text-[11px] text-emerald-300">
                  🛡️ <strong>Aturan Pailit:</strong> Jika kas PT menyentuh IB {Number(form.bankruptcy_limit_ib).toLocaleString('id-ID')}, sistem membekukan transaksi dividen & penjualan saham sampai pemilik melunasi defisit atau mendapat bailout Kas Negara.
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: MONETER & BANK SENTRAL */}
        {/* ========================================================= */}
        {activeTab === 'monetary' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader
                title="Kebijakan Moneter & Suku Bunga BCF"
                subtitle="Instrumen pengendalian likuiditas dan pembiayaan konglomerat"
                icon={Landmark}
                tone="var(--sky)"
              />
              <div className="space-y-4">
                <FormField
                  label="Suku Bunga Acuan Pinjaman Bank Sentral (%)"
                  hint="Suku bunga dasar yang dikenakan kepada konglomerat yang menarik pinjaman modal likuiditas dari Bank Sentral."
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      step="0.25"
                      value={form.interest_rate}
                      onChange={(e) => handleChange('interest_rate', e.target.value)}
                      required
                      className="font-mono text-base font-bold text-sky-300"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">% p.a.</span>
                  </div>
                </FormField>

                <FormField
                  label={
                    <div className="flex items-center justify-between w-full">
                      <span>Plafon Pinjaman Maksimum Per Debitur (IB)</span>
                      <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/60">
                        IB {Number(form.max_loan_limit || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  }
                  hint="Batas tertinggi akumulasi fasilitas pinjaman kredit yang dapat disetujui untuk satu akun pemain."
                >
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.max_loan_limit}
                    onChange={(e) => handleChange('max_loan_limit', e.target.value)}
                    required
                    className="font-mono font-bold text-slate-100"
                  />
                </FormField>

                <FormField
                  label="Fase Siklus Makroekonomi Federasi"
                  hint="Kondisi sentimen makro yang mempengaruhi volatilitas harga komoditas dan bursa efek."
                >
                  <Select
                    value={form.economic_state || 'NORMAL'}
                    onChange={(e) => handleChange('economic_state', e.target.value)}
                  >
                    <option value="EXPANSION">🌱 Ekspansi Cepat (Suku Bunga Rendah, Daya Beli Naik)</option>
                    <option value="NORMAL">⚖️ Normal / Moderat (Pertumbuhan Stabil)</option>
                    <option value="CONTRACTION">🍂 Kontraksi Ekonomi (Likuiditas Mengetat)</option>
                    <option value="CRISIS">⚡ Krisis Moneter / Resesi (Bailout Aktif Diperlukan)</option>
                  </Select>
                </FormField>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Prinsip Kehati-hatian Perbankan & Agunan"
                subtitle="Proteksi risiko gagal bayar kredit"
                icon={Shield}
                tone="var(--sky)"
              />
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 text-sky-400 font-bold">
                    <CheckCircle2 size={16} />
                    <span>Sinkronisasi Otomatis ke Modul Bank Mobile</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Setiap kali Anda menaikkan atau menurunkan plafon (saat ini <strong>IB {Number(form.max_loan_limit || 1000000000).toLocaleString('id-ID')}</strong>), pemain yang membuka tab Bank BCF pada ponsel akan langsung melihat plafon terbaru tersebut.
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400">
                    <span>Suku Bunga Efektif:</span>
                    <span className="font-mono font-bold text-sky-400">{form.interest_rate}%</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 leading-relaxed">
                  ⚠️ <strong>Sanksi Gagal Bayar:</strong> Jika pemain gagal melunasi pinjaman saat jatuh tempo, Anda dapat menyita saham atau mengubah PT miliknya menjadi BUMN melalui menu <em>Bank Sentral & Pinjaman</em>.
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: BURSA EFEK & IPO */}
        {/* ========================================================= */}
        {activeTab === 'market' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader
                title="Regulasi Perdagangan Bursa Efek (IPMC)"
                subtitle="Batas fluktuasi harian dan integritas pasar modal"
                icon={TrendingUp}
                tone="var(--violet)"
              />
              <div className="space-y-4">
                <FormField
                  label="Status Jam Perdagangan Bursa"
                  hint="Status operasional server order matching bursa saham."
                >
                  <Select
                    value={form.market_status || 'OPEN'}
                    onChange={(e) => handleChange('market_status', e.target.value)}
                    className="font-bold text-violet-400"
                  >
                    <option value="OPEN">🟢 Bursa Buka (Normal Trading - Limit Orders Aktif)</option>
                    <option value="PRE_CLOSING">🟡 Pre-Closing Session (Sesi Penyelesaian Hari Ini)</option>
                    <option value="HALTED">🔴 Bursa Diliburkan / Halted (Maintenance Regulasi)</option>
                  </Select>
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    label="Batas Auto-Reject Atas (ARA %)"
                    hint="Maksimum kenaikan harga per hari"
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={form.ara_limit_pct}
                        onChange={(e) => handleChange('ara_limit_pct', e.target.value)}
                        required
                        className="font-mono font-bold text-emerald-400"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                    </div>
                  </FormField>

                  <FormField
                    label="Batas Auto-Reject Bawah (ARB %)"
                    hint="Maksimum penurunan harga per hari"
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={form.arb_limit_pct}
                        onChange={(e) => handleChange('arb_limit_pct', e.target.value)}
                        required
                        className="font-mono font-bold text-rose-400"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                    </div>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                  <FormField
                    label="Ambang Batas UMA Volatilitas (%)"
                    hint="Pemicu investigasi otomatis"
                  >
                    <div className="relative">
                      <Input
                        type="number"
                        min="10"
                        max="100"
                        value={form.uma_threshold_pct}
                        onChange={(e) => handleChange('uma_threshold_pct', e.target.value)}
                        required
                        className="font-mono"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                    </div>
                  </FormField>

                  <FormField
                    label="Pengawasan UMA Otomatis"
                    hint="Status bot radar anomali"
                  >
                    <Select
                      value={form.uma_auto_enabled || 'true'}
                      onChange={(e) => handleChange('uma_auto_enabled', e.target.value)}
                    >
                      <option value="true">✅ Aktif Otomatis</option>
                      <option value="false">❌ Nonaktif (Manual)</option>
                    </Select>
                  </FormField>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Ketentuan Penawaran Umum Perdana (E-IPO)"
                subtitle="Standar kelayakan emiten baru masuk bursa efek"
                icon={Scale}
                tone="var(--violet)"
              />
              <div className="space-y-4">
                <FormField
                  label={
                    <div className="flex items-center justify-between w-full">
                      <span>Modal Minimum Pengajuan E-IPO (IB)</span>
                      <span className="text-[11px] font-mono font-bold text-violet-400 bg-violet-950/80 px-2 py-0.5 rounded border border-violet-800/60">
                        IB {Number(form.min_ipo_capital || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  }
                  hint="Kekayaan bersih / kas minimum yang wajib dimiliki konglomerat sebelum diizinkan menerbitkan prospektus IPO."
                >
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.min_ipo_capital}
                    onChange={(e) => handleChange('min_ipo_capital', e.target.value)}
                    required
                    className="font-mono text-base font-bold text-slate-100"
                  />
                </FormField>

                <FormField
                  label="Level Minimum Perseroan untuk E-IPO"
                  hint="Tingkat kematangan PT untuk memenuhi asas perlindungan investor publik."
                >
                  <Select
                    value={form.ipo_min_level || '4'}
                    onChange={(e) => handleChange('ipo_min_level', e.target.value)}
                  >
                    <option value="2">Level 2 (Pertumbuhan Awal - Resiko Tinggi)</option>
                    <option value="3">Level 3 (Berkembang Stabil)</option>
                    <option value="4">Level 4 (Mature / Rekomendasi Bursa)</option>
                    <option value="5">Level 5 (Konglomerat Penuh)</option>
                  </Select>
                </FormField>

                <FormField
                  label="Intervensi Bot Likuiditas (Market Maker)"
                  hint="Pemberian likuiditas otomatis untuk saham yang sepi antrean order."
                >
                  <Select
                    value={form.bot_auto_intervention || 'true'}
                    onChange={(e) => handleChange('bot_auto_intervention', e.target.value)}
                  >
                    <option value="true">🤖 Aktif (Bot Menjaga Spread Harga)</option>
                    <option value="false">⛔ Nonaktif (Murni Order Pemain)</option>
                  </Select>
                </FormField>

                {/* Banner Subsidi IPO Akun Baru */}
                <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs text-violet-200/90 leading-relaxed flex items-start gap-3">
                  <Sparkles size={18} className="shrink-0 text-violet-400 mt-0.5" />
                  <div>
                    <strong className="text-violet-300 font-bold block mb-1">
                      🌟 Insentif Subsidi IPO Perdana Pemula:
                    </strong>
                    Khusus akun baru yang melakukan IPO Pertama Kali, sistem bursa memberikan kemudahan: Kas PT cukup <strong>IB 15.000.000</strong>, Level PT 1, dan <strong>Bebas Biaya Listing (IB 0)</strong>. Syarat ketat regulasi di atas (Level {form.ipo_min_level || 4} & Kas Min IB {Number(form.min_ipo_capital || 0).toLocaleString('id-ID')} + Fee IB 100 Jt) berlaku untuk IPO berikutnya / emiten konglomerasi.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: HUKUM NIAGA & PNAF */}
        {/* ========================================================= */}
        {activeTab === 'legal' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader
                title="Penegakan Hukum Niaga & Sanksi Finansial"
                subtitle="Instrumen keadilan bagi sengketa antar konglomerat"
                icon={Scale}
                tone="var(--rose)"
              />
              <div className="space-y-4">
                <FormField
                  label={
                    <div className="flex items-center justify-between w-full">
                      <span>Denda Pelanggaran Manipulasi Pasar (IB)</span>
                      <span className="text-[11px] font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60">
                        IB {Number(form.market_manipulation_fine_ib || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  }
                  hint="Besaran denda ganti rugi yang diputuskan Hakim Pengadilan Niaga Federasi (PNAF) terhadap pelaku manipulasi saham atau insider trading."
                >
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={form.market_manipulation_fine_ib}
                    onChange={(e) => handleChange('market_manipulation_fine_ib', e.target.value)}
                    required
                    className="font-mono font-bold text-rose-400"
                  />
                </FormField>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <ShieldAlert size={16} />
                    <span>Yurisdiksi Pengadilan Niaga Arbitrase Federasi (PNAF)</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Setiap putusan sidang vonis PNAF yang menyatakan tergugat bersalah akan memotong saldo kas pelaku dan menyetorkan denda tersebut langsung ke Kas Negara.
                  </p>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-400">
                    <span>Biaya Pendaftaran Perkara:</span>
                    <span className="font-mono font-bold text-slate-200">
                      IB {Number(form.pnk_filing_fee_ib || 500000).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="Standar Notariat & Akta Saham Digital"
                subtitle="Kepastian hukum perpindahan kepemilikan saham"
                icon={FileCheck2}
                tone="var(--rose)"
              />
              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="font-semibold text-slate-200">Ketentuan Akta Notaris Perjanjian:</div>
                  <p className="text-slate-400 leading-relaxed">
                    Setiap transaksi saham tertutup (P2P Deal) mewajibkan pembayaran Bea Meterai Digital sebesar <strong>IB {Number(form.stamp_duty_fee_ib || 10000).toLocaleString('id-ID')}</strong>. Akta resmi yang diterbitkan memiliki nomor seri unik dan dapat dijadikan alat bukti sah dalam persidangan jika terjadi sengketa.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-900/40 text-[11px] text-indigo-300">
                  📜 <strong>Status Akta:</strong> Semua akta perjanjian yang telah ditandatangani tersimpan rapi di menu <em>Akta Notaris (Deeds)</em> dan kas negara langsung menerima setoran bea meterai.
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 6. TAB: CADANGAN BASIS DATA (DISASTER RECOVERY) */}
        {activeTab === 'backup' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 space-y-6">
              <CardHeader
                title="Pencadangan Basis Data & Pemulihan (Disaster Recovery)"
                subtitle="Amankan seluruh 268 akun konglomerat, kepemilikan saham, kas, dan akta hukum ke komputer Anda"
                icon={Database}
                tone="var(--emerald)"
              />

              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs leading-relaxed flex items-start gap-3">
                <ShieldCheck size={20} className="shrink-0 mt-0.5 text-emerald-400" />
                <div>
                  <strong className="block font-bold text-sm mb-1 text-emerald-200">Perlindungan Data Mutlak (Zero Data Loss Policy)</strong>
                  Database game menggunakan SQLite dengan mode WAL (Write-Ahead Logging) terisolasi. Data pemain TIDAK AKAN PERNAH terhapus saat update server. Anda dapat mengunduh salinan database mentah (.sqlite) kapan saja sebagai cadangan fisik.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-mono">Total Akun Pemain</span>
                  <div className="text-2xl font-black text-slate-100 mt-1">268 Pemain</div>
                  <span className="text-[10px] text-emerald-400 font-bold">● Tersimpan Permanen</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-mono">Total Emiten Bursa</span>
                  <div className="text-2xl font-black text-sky-400 mt-1">119 Emiten</div>
                  <span className="text-[10px] text-slate-400">Portofolio & Buku Order</span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase font-mono">Format & Mode Simpan</span>
                  <div className="text-2xl font-black text-amber-400 mt-1">SQLite WAL</div>
                  <span className="text-[10px] text-slate-400">ACID Compliance Aktif</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href="/api/admin/backup/download?key=19122004"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-emerald flex-1 py-3 text-center flex items-center justify-center gap-2 font-bold shadow-lg shadow-emerald-500/20"
                >
                  <Download size={18} />
                  UNDUH BACKUP DATABASE (.SQLITE) KE LAPTOP
                </a>
                <button
                  type="button"
                  onClick={handleCreateSnapshot}
                  disabled={isSnapshotting}
                  className="btn btn-sky flex-1 py-3 text-center flex items-center justify-center gap-2 font-bold"
                >
                  <Camera size={18} />
                  {isSnapshotting ? 'Membuat Snapshot...' : 'BUAT SNAPSHOT DI SERVER SEKARANG'}
                </button>
              </div>
            </Card>

            <Card className="space-y-4">
              <CardHeader
                title="Riwayat Snapshot Server"
                subtitle="Arsip cadangan lokal di folder data server"
                icon={Clock}
                tone="var(--sky)"
              />
              <div className="space-y-2 text-xs">
                {backupSnapshots.length === 0 ? (
                  <p className="text-slate-500 italic p-4 text-center">Belum ada snapshot lokal. Klik tombol 'Buat Snapshot' untuk mengarsipkan database saat ini.</p>
                ) : (
                  backupSnapshots.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-slate-200 font-bold text-[11px]">{s.filename}</div>
                        <div className="text-[10px] text-slate-500">{new Date(s.createdAt).toLocaleString('id-ID')}</div>
                      </div>
                      <Badge tone="sky">{s.sizeKb} KB</Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* 5. Sticky Bottom Save Bar */}
        <div className="sticky bottom-4 z-20 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isDirty ? (
              <span className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/30">
                <AlertTriangle size={14} />
                Ada perubahan regulasi yang belum disimpan
              </span>
            ) : (
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Seluruh parameter tersinkronisasi dengan server
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (settings) setForm((prev) => ({ ...prev, ...settings }));
                isDirtyRef.current = false;
                setIsDirty(false);
              }}
              disabled={isSaving || !isDirty}
              icon={RotateCcw}
            >
              Reset Perubahan
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              icon={Save}
              className="shadow-lg shadow-amber-500/20"
            >
              {isSaving ? 'Menerapkan Kebijakan...' : 'Simpan & Terapkan ke Seluruh APK'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
