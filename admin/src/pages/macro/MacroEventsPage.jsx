import { useState, useEffect, useMemo } from 'react';
import { useAdmin } from '../../context/AdminContext';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import SearchInput from '../../components/ui/SearchInput';
import PaginationBar from '../../components/ui/PaginationBar';
import { FormField, Input, Textarea, Select } from '../../components/ui/Form';
import { adminApi } from '../../api/admin';
import { dateTime } from '../../lib/format';
import {
  Zap,
  Radio,
  Flame,
  TrendingDown,
  Globe,
  Send,
  Landmark,
  ShieldAlert,
  Sparkles,
  Sliders,
  ShieldCheck,
  FileText,
  History,
  RefreshCw,
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

// 6 Template Skenario Guncangan Makro Kustom (Klik langsung mengisi Judul, Deskripsi, Sektor, dan % Shock)
const CUSTOM_SHOCK_TEMPLATES = [
  {
    label: '⚔️ Perang Dunia III',
    title: 'Pecahnya Perang Dunia & Konflik Geopolitik Global',
    description:
      'Eskalasi militer skala penuh antar kekuatan besar dunia memutus jalur perdagangan internasional, melumpuhkan rantai pasok global, dan memicu kepanikan jual ekstrem (panic selling) di seluruh bursa efek.',
    sector: 'ALL',
    impact: -35,
    tone: 'rose',
  },
  {
    label: '🦠 Pandemi & Lockdown',
    title: 'Darurat Pandemi Baru & Lockdown Ekonomi Nasional',
    description:
      'Penyebaran varian patogen baru memaksa penutupan perbatasan, penghentian aktivitas pabrik, dan pembatasan mobilitas ketat yang menekan seluruh sektor riil dan ritel.',
    sector: 'ALL',
    impact: -25,
    tone: 'rose',
  },
  {
    label: '🏦 Kolaps Megabank',
    title: 'Kolapsnya Megabank Internasional & Krisis Kredit Macet',
    description:
      'Gagal bayar obligasi derivatif senilai ratusan triliun memicu kebangkrutan beruntun institusi finansial global dan membekukan likuiditas perbankan nasional.',
    sector: 'FINANCE',
    impact: -30,
    tone: 'amber',
  },
  {
    label: '🛢️ Embargo Energi',
    title: 'Embargo Minyak & Lonjakan Harga Komoditas Energi',
    description:
      'Blokade jalur distribusi minyak dunia memicu kelangkaan pasokan bahan bakar ekstrem dan melambungkan harga komoditas energi serta batu bara ke titik tertinggi sepanjang sejarah.',
    sector: 'ENERGY',
    impact: 25,
    tone: 'emerald',
  },
  {
    label: '🤖 Revolusi Super-AI',
    title: 'Terobosan Komputasi Kuantum & Revolusi Industri AI',
    description:
      'Peluncuran infrastruktur kecerdasan buatan generasi baru memicu gelombang investasi triliunan IB ke perusahaan teknologi, semikonduktor, dan pusat data nasional.',
    sector: 'TECHNOLOGY',
    impact: 30,
    tone: 'emerald',
  },
  {
    label: '🚀 Supercycle Ekonomi',
    title: 'Booming Ekonomi Emas & Banjir Investasi Asing (FDI)',
    description:
      'Surplus neraca perdagangan rekor tertinggi dan masuknya dana investasi institusional global mengangkat daya beli masyarakat serta melambungkan valuasi seluruh emiten bursa.',
    sector: 'ALL',
    impact: 25,
    tone: 'emerald',
  },
];

// 6 Template Siaran Breaking News (Klik langsung mengisi Judul & Isi Berita)
const NEWS_TEMPLATES = [
  {
    label: '⚔️ Sirene Perang Dunia',
    title: 'Darurat Geopolitik: Eskalasi Perang Dunia Guncang Bursa Global',
    content:
      'Ketegangan militer antarblok dunia meningkat tajam. Investor institusi mulai menarik likuiditas secara masif dan memicu volatilitas tinggi di lantai bursa.',
    sector: 'ALL',
    sentiment: 'BEARISH',
  },
  {
    label: '🏦 Stimulus Bunga Rendah',
    title: 'Bank Sentral BIF Pangkas Suku Bunga & Siapkan Likuiditas Murah',
    content:
      'Dewan Gubernur Bank Sentral mengumumkan pelonggaran moneter besar-besaran guna memacu ekspansi kredit korporasi dan mendongkrak gairah pasar modal.',
    sector: 'FINANCE',
    sentiment: 'BULLISH',
  },
  {
    label: '⚡ Cadangan Migas Raksasa',
    title: 'Temuan Cadangan Migas & Litium Raksasa di Wilayah Federasi',
    content:
      'Eksplorasi nasional menemukan cadangan energi bernilai puluhan triliun IB yang siap melipatgandakan laba emiten pertambangan dan energi.',
    sector: 'ENERGY',
    sentiment: 'BULLISH',
  },
  {
    label: '🤖 Mega-Kontrak Cloud AI',
    title: 'Konsorsium Global Suntik Dana Triliunan ke Sektor Teknologi & AI',
    content:
      'Emiten teknologi nasional menandatangani kontrak pembangunan pusat data AI terbesar di kawasan regional, memicu aksi beli masif investor asing.',
    sector: 'TECHNOLOGY',
    sentiment: 'BULLISH',
  },
  {
    label: '⚠️ Tekanan Inflasi Pangan',
    title: 'Lonjakan Inflasi Bahan Pokok Tekan Daya Beli Konsumen',
    content:
      'Kenaikan biaya logistik global dan bahan baku impor menyebabkan penurunan margin laba emiten ritel serta barang konsumsi masyarakat.',
    sector: 'CONSUMER',
    sentiment: 'BEARISH',
  },
  {
    label: '💎 Pesta Dividen Raya',
    title: 'Laba Korporasi Cetak Rekor, Emiten Bersiap Bagikan Dividen Jumbo',
    content:
      'Laporan keuangan kuartal terbaru menunjukkan pertumbuhan laba bersih di atas ekspektasi, mendorong reli penguatan indeks IPMC.',
    sector: 'ALL',
    sentiment: 'BULLISH',
  },
];

export default function MacroEventsPage() {
  const { actions, overview, notify } = useAdmin();
  // Federation Macro State
  const [macroData, setMacroData] = useState(null);
  const [isSwitchingMacro, setIsSwitchingMacro] = useState(false);
  const [crisisTriggerMode, setCrisisTriggerMode] = useState('MANUAL');
  const [crisisThresholdIb, setCrisisThresholdIb] = useState(-100000000000);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // History & Pagination state (25 items per page)
  const [historySearch, setHistorySearch] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchMacro = async () => {
    try {
      const data = await adminApi.federationMacro();
      setMacroData(data);
      if (data) {
        if (data.crisisTriggerMode) setCrisisTriggerMode(data.crisisTriggerMode);
        if (data.crisisDeficitThresholdIb !== undefined) setCrisisThresholdIb(data.crisisDeficitThresholdIb);
      }
    } catch (err) {
      console.warn('Gagal memuat status makro:', err);
    }
  };

  const handleSavePolicy = async () => {
    try {
      setIsSavingPolicy(true);
      const res = await adminApi.setFederationMacroPolicy({
        crisisTriggerMode,
        crisisDeficitThresholdIb: parseFloat(crisisThresholdIb),
      });
      await fetchMacro();
      if (notify) notify(res?.message || 'Kebijakan pemicu krisis fiskal berhasil disimpan!', 'success');
    } catch (err) {
      if (notify) notify('Gagal menyimpan kebijakan: ' + err.message, 'error');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  useEffect(() => {
    fetchMacro();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [historySearch, sentimentFilter]);

  const handleSetMacroState = async (state) => {
    try {
      setIsSwitchingMacro(true);
      const res = await adminApi.setFederationMacroState(state);
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
  const [eventImpact, setEventImpact] = useState(-15);
  const [isTriggering, setIsTriggering] = useState(false);

  // News broadcast state
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsSector, setNewsSector] = useState('ALL');
  const [newsSentiment, setNewsSentiment] = useState('BULLISH');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleApplyShockTemplate = (tpl) => {
    setEventTitle(tpl.title);
    setEventDesc(tpl.description);
    setEventSector(tpl.sector);
    setEventImpact(tpl.impact);
  };

  const handleApplyNewsTemplate = (tpl) => {
    setNewsTitle(tpl.title);
    setNewsContent(tpl.content);
    setNewsSector(tpl.sector);
    setNewsSentiment(tpl.sentiment);
  };

  const handleTriggerPreset = async (preset) => {
    try {
      setIsTriggering(true);
      await actions.triggerEvent(preset);
      await fetchMacro();
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
    try {
      setIsTriggering(true);
      await actions.triggerEvent({
        title: eventTitle,
        description: eventDesc,
        affectedSector: eventSector,
        priceImpactPct: Number(eventImpact),
      });
      setEventTitle('');
      setEventDesc('');
      await fetchMacro();
    } finally {
      setIsTriggering(false);
    }
  };

  const handleBroadcastNews = async (e) => {
    e.preventDefault();
    if (!newsTitle || !newsContent) return;
    try {
      setIsBroadcasting(true);
      await actions.injectNews({
        title: newsTitle,
        content: newsContent,
        affectedSector: newsSector,
        sentiment: newsSentiment,
      });
      setNewsTitle('');
      setNewsContent('');
      await fetchMacro();
    } finally {
      setIsBroadcasting(false);
    }
  };

  const currentState = macroData?.economicState || 'NORMAL';

  // Gabungkan riwayat berita & peristiwa makro
  const filteredHistory = useMemo(() => {
    const rawNews = Array.isArray(macroData?.recentNews) ? macroData.recentNews : [];
    const q = historySearch.trim().toLowerCase();
    return rawNews.filter((item) => {
      const matchSearch =
        !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.content && item.content.toLowerCase().includes(q)) ||
        (item.affected_sector && item.affected_sector.toLowerCase().includes(q));
      const matchSentiment = sentimentFilter === 'ALL' || item.sentiment === sentimentFilter;
      return matchSearch && matchSentiment;
    });
  }, [macroData?.recentNews, historySearch, sentimentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedHistory = filteredHistory.slice((safePage - 1) * pageSize, safePage * pageSize);

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
            <Badge
              tone={
                currentState === 'BOOM'
                  ? 'emerald'
                  : currentState === 'CRISIS'
                  ? 'rose'
                  : currentState === 'RECESSION'
                  ? 'amber'
                  : 'sky'
              }
            >
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
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
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
              <p className="text-[11px] text-slate-400 mt-1">Omzet PT +30%, bursa bullish, bunga BCF 4.5%</p>
            </button>

            {/* NORMAL */}
            <button
              type="button"
              disabled={isSwitchingMacro}
              onClick={() => handleSetMacroState('NORMAL')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
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
              <p className="text-[11px] text-slate-400 mt-1">Pertumbuhan terkendali, inflasi 3%, bunga BCF 6.5%</p>
            </button>

            {/* RECESSION */}
            <button
              type="button"
              disabled={isSwitchingMacro}
              onClick={() => handleSetMacroState('RECESSION')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
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
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
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
              <p className="text-[11px] text-slate-400 mt-1">Bunga BCF 18%, bursa crash, emiten krisis PNAF</p>
            </button>
          </div>
        </div>
      </Card>

      {/* 2. Mode Pemicu Krisis Moneter & Fiskal (Manual vs Auto Defisit) */}
      <Card className="bg-slate-900/90 border-slate-800">
        <CardHeader
          title="Kebijakan Pemicu Krisis Moneter & Defisit Fiskal"
          subtitle="Atur apakah krisis ekonomi berjalan 100% MANUAL (terkendali oleh Admin) atau OTOMATIS jika kas negara menembus defisit kritis"
          icon={Sliders}
          tone="var(--cyan)"
          action={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Kas Negara Saat Ini:</span>
              <Badge tone={(overview?.treasuryBalance ?? 0) >= 0 ? 'emerald' : 'rose'}>
                {(overview?.treasuryBalance ?? 0) >= 0 ? 'SURPLUS' : 'DEFISIT'}: IB{' '}
                {((overview?.treasuryBalance ?? 0) / 1e9).toFixed(1)} Miliar
              </Badge>
            </div>
          }
        />

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* MANUAL MODE */}
            <div
              onClick={() => setCrisisTriggerMode('MANUAL')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                crisisTriggerMode === 'MANUAL'
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-100 ring-1 ring-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck
                    size={18}
                    className={crisisTriggerMode === 'MANUAL' ? 'text-emerald-400' : 'text-slate-500'}
                  />
                  <span className="font-bold text-sm text-slate-100">MODE MANUAL (Rekomendasi)</span>
                </div>
                {crisisTriggerMode === 'MANUAL' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AKTIF DIPILIH
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-emerald-300">100% Terkendali Aman:</strong> Krisis moneter global{' '}
                <strong className="text-slate-200">TIDAK AKAN PERNAH</strong> aktif sendiri meskipun kas negara sedang
                berfluktuasi atau defisit. Krisis hanya akan meledak jika Admin secara sengaja menekan tombol{' '}
                <em className="text-rose-400">&quot;CRISIS&quot;</em> atau meluncurkan skenario di bawah.
              </p>
            </div>

            {/* AUTO DEFICIT MODE */}
            <div
              onClick={() => setCrisisTriggerMode('AUTO_DEFICIT')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                crisisTriggerMode === 'AUTO_DEFICIT'
                  ? 'bg-rose-500/10 border-rose-500 text-rose-100 ring-1 ring-rose-500/50'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert
                    size={18}
                    className={crisisTriggerMode === 'AUTO_DEFICIT' ? 'text-rose-400' : 'text-slate-500'}
                  />
                  <span className="font-bold text-sm text-slate-100">MODE OTOMATIS DEFISIT</span>
                </div>
                {crisisTriggerMode === 'AUTO_DEFICIT' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    AKTIF DIPILIH
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-rose-300">Pemicu Otomatis:</strong> Jika pengeluaran bailout dan subsidi negara
                melebihi batas ambang cadangan kas (defisit ekstrem), sistem secara otomatis memicu{' '}
                <strong className="text-slate-200">Krisis Moneter Global</strong> dan berita kepanikan pasar. Krisis
                pulih otomatis saat kas kembali surplus.
              </p>
            </div>
          </div>

          {/* Ambang batas & Simpan */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-300 flex items-center gap-2">
              <span className="text-slate-400">Batas Toleransi Defisit Pemicu Auto-Krisis:</span>
              <span className="font-mono font-bold text-amber-400">-IB 100.000.000.000 (-IB 100 Miliar)</span>
            </div>
            <Button variant="primary" size="sm" disabled={isSavingPolicy} onClick={handleSavePolicy}>
              {isSavingPolicy ? 'Menyimpan Kebijakan...' : 'Terapkan Kebijakan Krisis'}
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Preset Event Triggers */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Flame size={14} className="text-amber-400" />
          Pemicu Krisis & Boom Instan (6 Preset Skenario Cepat)
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
                      {isNegative ? '' : '+'}
                      {p.priceImpactPct}%
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

      {/* 4. Custom Event Trigger & News Injector (Dengan 6 Template Siap Pakai) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Custom Macro Shock */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader
              title="Buat Skenario Guncangan Makro Kustom"
              subtitle="Klik salah satu dari 6 template di bawah atau tulis skenario sendiri"
              icon={Zap}
              tone="var(--amber)"
            />

            {/* 6 Template Skenario Cepat */}
            <div className="mb-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/90">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <FileText size={12} /> 6 Template Skenario Cepat (Klik untuk Isi Otomatis)
                </span>
                {eventTitle && (
                  <button
                    type="button"
                    onClick={() => {
                      setEventTitle('');
                      setEventDesc('');
                      setEventSector('ALL');
                      setEventImpact(-15);
                    }}
                    className="text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    Reset Form
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CUSTOM_SHOCK_TEMPLATES.map((tpl, i) => {
                  const isSelected = eventTitle === tpl.title;
                  const isNeg = tpl.impact < 0;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyShockTemplate(tpl)}
                      className={`px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="text-[11px] font-bold truncate block w-full">{tpl.label}</span>
                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                        <span className="text-slate-400">{tpl.sector}</span>
                        <span className={isNeg ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {isNeg ? '' : '+'}
                          {tpl.impact}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <form onSubmit={handleCustomEvent} className="space-y-4">
            <FormField label="Judul Peristiwa Makro" hint="Contoh: Pecahnya Perang Dunia & Konflik Geopolitik Global">
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Masukkan judul skenario atau pilih template di atas..."
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader
              title="Siarkan Breaking News ke Seluruh Pemain"
              subtitle="Kirimkan push bulletin dan running ticker ke layar HP pemain"
              icon={Radio}
              tone="var(--sky)"
            />

            {/* 6 Template Berita Cepat */}
            <div className="mb-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800/90">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                  <FileText size={12} /> 6 Template Berita Cepat (Klik untuk Isi Otomatis)
                </span>
                {newsTitle && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewsTitle('');
                      setNewsContent('');
                      setNewsSector('ALL');
                      setNewsSentiment('BULLISH');
                    }}
                    className="text-[10px] text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    Reset Form
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {NEWS_TEMPLATES.map((tpl, i) => {
                  const isSelected = newsTitle === tpl.title;
                  const isBull = tpl.sentiment === 'BULLISH';
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleApplyNewsTemplate(tpl)}
                      className={`px-2.5 py-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-sm'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="text-[11px] font-bold truncate block w-full">{tpl.label}</span>
                      <div className="flex items-center justify-between mt-1 text-[10px] font-mono">
                        <span className="text-slate-400">{tpl.sector}</span>
                        <span className={isBull ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {tpl.sentiment}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* 5. Riwayat Peristiwa Makro & Siaran Berita (Paginated 25 per halaman) */}
      <Card>
        <CardHeader
          title="Riwayat Peristiwa Makro & Siaran Berita Bursa"
          subtitle="Daftar seluruh siaran berita dan guncangan ekonomi yang telah dipublikasikan ke layar pemain"
          icon={History}
          tone="var(--gold)"
          action={
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-52">
                <SearchInput
                  value={historySearch}
                  onChange={setHistorySearch}
                  placeholder="Cari judul / isi berita..."
                />
              </div>
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value)}
                className="select text-xs py-1.5 px-3 bg-slate-900 border-slate-800 rounded-xl"
              >
                <option value="ALL">Semua Sentimen</option>
                <option value="BULLISH">Bullish (Positif)</option>
                <option value="BEARISH">Bearish (Negatif)</option>
                <option value="NEUTRAL">Netral</option>
              </select>
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={fetchMacro}>
                Refresh
              </Button>
            </div>
          }
        />

        {filteredHistory.length === 0 ? (
          <EmptyState
            title="Belum Ada Riwayat Siaran Berita"
            description="Siaran breaking news dan peristiwa makro yang diluncurkan akan tercatat di sini."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Waktu Siaran</th>
                    <th>Judul Peristiwa / Berita</th>
                    <th>Isi Keterbukaan Informasi</th>
                    <th>Sektor</th>
                    <th>Sentimen</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map((item) => (
                    <tr key={item.id}>
                      <td className="text-xs font-mono text-slate-400 whitespace-nowrap">
                        {dateTime(item.published_at)}
                      </td>
                      <td className="text-xs font-bold text-slate-100 max-w-xs">
                        {item.title}
                      </td>
                      <td className="text-xs text-slate-300 max-w-md leading-relaxed">
                        {item.content}
                      </td>
                      <td>
                        <Badge tone="sky">{item.affected_sector || 'ALL'}</Badge>
                      </td>
                      <td>
                        <Badge
                          tone={
                            item.sentiment === 'BULLISH'
                              ? 'emerald'
                              : item.sentiment === 'BEARISH'
                              ? 'rose'
                              : 'amber'
                          }
                        >
                          {item.sentiment || 'NEUTRAL'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationBar
              totalItems={filteredHistory.length}
              page={safePage}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="riwayat berita"
            />
          </>
        )}
      </Card>
    </div>
  );
}
