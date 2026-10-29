import { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { FormField, Input, Textarea, Select } from '../../components/ui/Form';
import { adminApi } from '../../api/admin';
import {
  Zap,
  Radio,
  Flame,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Globe,
  Send,
  Landmark,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

const PRESETS = [
  {
    title: 'Krisis Likuiditas Finansial',
    description: 'Terjadi kepanikan likuiditas di pasar global yang memicu pengetatan kredit dan aksi jual massal.',
    affectedSector: 'ALL',
    priceImpactPct: -15,
    sentiment: 'BEARISH',
  },
  {
    title: 'Ledakan Investasi AI & Semikonduktor',
    description: 'Injeksi modal asing raksasa ke sektor teknologi bursa mendorong optimisme pasar modal.',
    affectedSector: 'TECHNOLOGY',
    priceImpactPct: 18,
    sentiment: 'BULLISH',
  },
  {
    title: 'Penemuan Cadangan Energi Baru',
    description: 'Departemen Energi Federasi mengumumkan temuan ladang migas baru dengan potensi devisa triliunan.',
    affectedSector: 'ENERGY',
    priceImpactPct: 12,
    sentiment: 'BULLISH',
  },
  {
    title: 'Kenaikan Suku Bunga Global Ekstrem',
    description: 'Pengetatan moneter agresif memicu capital outflow dari bursa berkembang.',
    affectedSector: 'FINANCE',
    priceImpactPct: -10,
    sentiment: 'BEARISH',
  },
  {
    title: 'Resesi Ekonomi & Penurunan Konsumsi',
    description: 'Daya beli masyarakat merosot tajam akibat inflasi barang pokok berkepanjangan.',
    affectedSector: 'CONSUMER',
    priceImpactPct: -12,
    sentiment: 'BEARISH',
  },
  {
    title: 'Paket Stimulus Fiskal Nasional',
    description: 'Pemerintah merilis paket pemulihan ekonomi senilai triliunan IB untuk mendorong dunia usaha.',
    affectedSector: 'ALL',
    priceImpactPct: 14,
    sentiment: 'BULLISH',
  },
];

export default function MacroEventsPage() {
  const { actions, overview, notify } = useAdmin();

  // Konoha Macro State
  const [macroData, setMacroData] = useState(null);
  const [isSwitchingMacro, setIsSwitchingMacro] = useState(false);

  const fetchMacro = async () => {
    try {
      const data = await adminApi.konohaMacro();
      setMacroData(data);
    } catch (err) {
      console.warn('Gagal memuat status makro:', err);
    }
  };

  useEffect(() => {
    fetchMacro();
  }, []);

  const handleSetMacroState = async (state) => {
    try {
      setIsSwitchingMacro(true);
      const res = await adminApi.setKonohaMacroState(state);
      await fetchMacro();
      if (notify) {
        notify(res?.message || `Iklim ekonomi resmi diubah menjadi ${state}`, 'success');
      }
    } catch (err) {
      if (notify) {
        notify('Gagal mengubah iklim ekonomi: ' + err.message, 'error');
      } else {
        alert('Gagal mengubah iklim ekonomi: ' + err.message);
      }
    } finally {
      setIsSwitchingMacro(false);
    }
  };

  // Custom event state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventSector, setEventSector] = useState('ALL');
  const [eventImpact, setEventImpact] = useState(-10);
  const [isTriggering, setIsTriggering] = useState(false);

  // News broadcast state
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsSector, setNewsSector] = useState('ALL');
  const [newsSentiment, setNewsSentiment] = useState('BULLISH');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleTriggerPreset = async (preset) => {
    try {
      setIsTriggering(true);
      await actions.triggerEvent(preset);
      if (notify) {
        notify(`Skenario '${preset.title}' berhasil diluncurkan ke pasar bursa!`, 'success');
      }
    } catch (err) {
      if (notify) notify('Gagal memicu skenario: ' + err.message, 'error');
    } finally {
      setIsTriggering(false);
    }
  };

  const handleCustomEvent = async (e) => {
    e.preventDefault();
    if (!eventTitle || !eventDesc) return;
    setIsTriggering(true);
    await actions.triggerEvent({
      title: eventTitle,
      description: eventDesc,
      affectedSector: eventSector,
      priceImpactPct: Number(eventImpact),
    });
    setEventTitle('');
    setEventDesc('');
    setIsTriggering(false);
  };

  const handleBroadcastNews = async (e) => {
    e.preventDefault();
    if (!newsTitle || !newsContent) return;
    setIsBroadcasting(true);
    await actions.injectNews({
      title: newsTitle,
      content: newsContent,
      affectedSector: newsSector,
      sentiment: newsSentiment,
    });
    setNewsTitle('');
    setNewsContent('');
    setIsBroadcasting(false);
  };

  const currentState = macroData?.economicState || 'NORMAL';

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Header Banner & Sovereign Macro Controller */}
      <Card className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/40 border-amber-500/30">
        <CardHeader
          title="Siklus Makroekonomi Republik Federasi Indigo"
          subtitle="Kendali iklim moneter negara: mengatur suku bunga acuan BIF, laju inflasi, dan sentimen bursa IPMC"
          icon={Globe}
          tone="var(--gold)"
          action={
            <Badge tone={currentState === 'BOOM' ? 'emerald' : currentState === 'CRISIS' ? 'rose' : currentState === 'RECESSION' ? 'amber' : 'sky'}>
              STATUS: {currentState}
            </Badge>
          }
        />

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* BOOM */}
            <button
              type="button"
              disabled={isSwitchingMacro}
              onClick={() => handleSetMacroState('BOOM')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                currentState === 'BOOM'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">1. Kemakmuran</span>
                <Sparkles size={14} className="text-emerald-400" />
              </div>
              <div className="font-extrabold text-sm text-slate-100">BOOM</div>
              <p className="text-[11px] text-slate-400 mt-1">Omzet PT +30%, bursa bullish, bunga BSK 4.5%</p>
            </button>

            {/* NORMAL */}
            <button
              type="button"
              disabled={isSwitchingMacro}
              onClick={() => handleSetMacroState('NORMAL')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                currentState === 'NORMAL'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-lg shadow-sky-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-sky-400">2. Stabilitas</span>
                <Landmark size={14} className="text-sky-400" />
              </div>
              <div className="font-extrabold text-sm text-slate-100">NORMAL</div>
              <p className="text-[11px] text-slate-400 mt-1">Pertumbuhan terkendali, inflasi 3%, bunga BSK 6.5%</p>
            </button>

            {/* RECESSION */}
            <button
              type="button"
              disabled={isSwitchingMacro}
              onClick={() => handleSetMacroState('RECESSION')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                currentState === 'RECESSION'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-amber-400">3. Perlambatan</span>
                <TrendingDown size={14} className="text-amber-400" />
              </div>
              <div className="font-extrabold text-sm text-slate-100">RECESSION</div>
              <p className="text-[11px] text-slate-400 mt-1">Beban usaha +20%, daya beli turun, kredit macet</p>
            </button>

            {/* CRISIS */}
            <button
              type="button"
              disabled={isSwitchingMacro}
              onClick={() => handleSetMacroState('CRISIS')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                currentState === 'CRISIS'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-200 shadow-lg shadow-rose-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-rose-400">4. Krisis Moneter</span>
                <ShieldAlert size={14} className="text-rose-400" />
              </div>
              <div className="font-extrabold text-sm text-slate-100">CRISIS</div>
              <p className="text-[11px] text-slate-400 mt-1">Bunga BSK 18%, bursa crash, emiten krisis PNAK</p>
            </button>
          </div>
        </div>
      </Card>

      {/* 2. Preset Event Triggers */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Flame size={14} className="text-amber-400" />
          Pemicu Krisis & Boom Instan (Preset Skenario)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESETS.map((p, idx) => {
            const isNegative = p.priceImpactPct < 0;
            return (
              <div
                key={idx}
                className="card p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-100">{p.title}</span>
                    <Badge tone={isNegative ? 'rose' : 'emerald'}>
                      {isNegative ? '' : '+'}{p.priceImpactPct}%
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{p.description}</p>
                  <div className="mt-2 text-[10px] font-mono text-slate-500">
                    Sektor: <span className="text-slate-300 font-semibold">{p.affectedSector}</span>
                  </div>
                </div>

                <Button
                  variant={isNegative ? 'rose' : 'emerald'}
                  size="sm"
                  block
                  disabled={isTriggering}
                  onClick={() => handleTriggerPreset(p)}
                >
                  {isNegative ? 'Luncurkan Krisis' : 'Luncurkan Boom'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Custom Event Trigger & News Injector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom Macro Shock */}
        <Card>
          <CardHeader
            title="Buat Skenario Guncangan Makro Kustom"
            subtitle="Rancang skenario ekonomi spesifik beserta persentase dampaknya"
            icon={Zap}
            tone="var(--amber)"
          />

          <form onSubmit={handleCustomEvent} className="space-y-4">
            <FormField label="Judul Peristiwa Makro" hint="Contoh: Skandal Kartel Perbankan Swasta">
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Masukkan judul skenario..."
                required
              />
            </FormField>

            <FormField label="Deskripsi Kejadian">
              <Textarea
                value={eventDesc}
                onChange={(e) => setEventDesc(e.target.value)}
                rows={3}
                placeholder="Jelaskan dinamika ekonomi yang terjadi..."
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Sektor Terdampak">
                <Select value={eventSector} onChange={(e) => setEventSector(e.target.value)}>
                  <option value="ALL">Seluruh Bursa (IPMC Total)</option>
                  <option value="FINANCE">Perbankan & Finansial</option>
                  <option value="TECHNOLOGY">Teknologi & Digital</option>
                  <option value="ENERGY">Energi & Pertambangan</option>
                  <option value="CONSUMER">Konsumer & Ritel</option>
                </Select>
              </FormField>

              <FormField label="Dampak Harga (% Shock)" hint="Negatif = Anjlok, Positif = Naik">
                <Input
                  type="number"
                  step="0.5"
                  value={eventImpact}
                  onChange={(e) => setEventImpact(e.target.value)}
                  required
                />
              </FormField>
            </div>

            <Button
              variant="primary"
              block
              type="submit"
              disabled={isTriggering || !eventTitle || !eventDesc}
              icon={Zap}
            >
              {isTriggering ? 'Menerapkan Shock...' : 'Terapkan Guncangan ke Bursa'}
            </Button>
          </form>
        </Card>

        {/* Breaking News Injector */}
        <Card>
          <CardHeader
            title="Siarkan Breaking News ke Seluruh Pemain"
            subtitle="Kirimkan push bulletin dan running ticker ke layar HP pemain"
            icon={Radio}
            tone="var(--sky)"
          />

          <form onSubmit={handleBroadcastNews} className="space-y-4">
            <FormField label="Judul Siaran Berita" hint="Akan tampil dengan label 🚨 BREAKING">
              <Input
                value={newsTitle}
                onChange={(e) => setNewsTitle(e.target.value)}
                placeholder="Contoh: Bank Sentral Siapkan Stimulus Bunga 0%"
                required
              />
            </FormField>

            <FormField label="Isi Berita / Keterbukaan Informasi">
              <Textarea
                value={newsContent}
                onChange={(e) => setNewsContent(e.target.value)}
                rows={3}
                placeholder="Tuliskan isi rilis berita lengkap..."
                required
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Sektor Relevan">
                <Select value={newsSector} onChange={(e) => setNewsSector(e.target.value)}>
                  <option value="ALL">Umum / Semua Sektor</option>
                  <option value="FINANCE">Finansial</option>
                  <option value="TECHNOLOGY">Teknologi</option>
                  <option value="ENERGY">Energi</option>
                  <option value="CONSUMER">Konsumer</option>
                </Select>
              </FormField>

              <FormField label="Sentimen Berita">
                <Select value={newsSentiment} onChange={(e) => setNewsSentiment(e.target.value)}>
                  <option value="BULLISH">Bullish (Positif Pasar)</option>
                  <option value="BEARISH">Bearish (Negatif Pasar)</option>
                  <option value="NEUTRAL">Netral (Informasi Biasa)</option>
                </Select>
              </FormField>
            </div>

            <Button
              variant="sky"
              block
              type="submit"
              disabled={isBroadcasting || !newsTitle || !newsContent}
              icon={Send}
            >
              {isBroadcasting ? 'Menyiarkan...' : 'Siarkan Berita Sekarang'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
