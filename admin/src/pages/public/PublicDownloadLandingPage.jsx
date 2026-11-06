import { useState, useEffect } from 'react';
import {
  Download,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Building2,
  Award,
  Landmark,
  Gavel,
  Crown,
  CheckCircle2,
  Cpu,
  HardDrive,
  Wifi,
  Sparkles,
  FileCheck2,
  Rocket,
  Users,
  ArrowRight,
  Lock,
  Activity,
  BarChart3,
  Search,
} from 'lucide-react';

export default function PublicDownloadLandingPage() {
  const [versionInfo, setVersionInfo] = useState({
    version: '1.9.0',
    buildNumber: 26,
    apkVersion: 'v1.9.0 (Build 26)',
    minAndroid: 'Android 10.0 (API Level 29 / Quince Tart) ke atas',
    fileSizeMb: '56.4 MB',
    downloadUrl: '/api/download/apk',
    downloadCount: 325,
    totalCompanies: 504,
    totalPlayers: 1053,
    sha256: 'dea4c402cec5e7d41eb518350b782fd9f21fb1cbe432288f5486b2b758af455f',
    releaseNotes:
      'v1.9.0: Fitur Kotak Masuk (Inbox) Terpadu untuk Notifikasi Tawaran & Penolakan P2P Real-Time, Navigasi Langsung Emiten dari Warta Berita Bursa, Pembaruan Majelis Hakim Arbitrase PNAF Resmi (Ketua Majelis Prof. Dr. Bagas Daniswara, S.H., M.H.), Gugatan Sengketa Pemulihan Saham Curian/Manipulasi, dan Sanksi Rekonvensi Denda Pencemaran Nama Baik untuk Tuduhan Palsu.',
  });
  const [topLeaders, setTopLeaders] = useState([]);
  const [topStocks, setTopStocks] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [wallSector, setWallSector] = useState('ALL');
  const [wallSearch, setWallSearch] = useState('');
  const [clockDate, setClockDate] = useState(new Date());
  const [isDownloading, setIsDownloading] = useState(false);

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleNavClick = (sectionId, path) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    scrollToSection(sectionId);
  };

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setClockDate(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    let active = true;
    // 1. Amati URL awal (e.g. /peringkat, /tentang, /fitur, /spesifikasi, /bursa)
    const handleLocation = () => {
      const clean = (window.location.pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase();
      if (['peringkat', 'tentang', 'fitur', 'spesifikasi', 'bursa', 'trading-wall'].includes(clean)) {
        const targetId = ['bursa', 'trading-wall'].includes(clean) ? 'trading-wall' : clean;
        setTimeout(() => scrollToSection(targetId), 180);
      }
    };
    handleLocation();
    window.addEventListener('popstate', handleLocation);

    const syncLiveMarketSilently = () => {
      // Fetch Top 12 Leaders (12 Naga & Taipan) di latar belakang tanpa kedip
      fetch('/api/leaderboard')
        .then((r) => r.json())
        .then((data) => {
          if (active && Array.isArray(data) && data.length > 0) {
            setTopLeaders(data.slice(0, 10));
          }
        })
        .catch(() => {});

      // Fetch Stocks di latar belakang tanpa kedip
      fetch('/api/companies')
        .then((r) => r.json())
        .then((data) => {
          if (active && Array.isArray(data) && data.length > 0) {
            setTopStocks(data.slice(0, 12));
            setAllCompanies(data);
          }
        })
        .catch(() => {});
    };

    // 2. Fetch Version Info
    fetch('/api/version')
      .then((r) => r.json())
      .then((data) => {
        if (active && data && data.version) {
          setVersionInfo((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});

    // 3. Initial + Silent Background Refresh (tiap 25 detik tanpa loading spinner)
    syncLiveMarketSilently();
    const bgInterval = setInterval(syncLiveMarketSilently, 25000);

    return () => {
      active = false;
      clearInterval(bgInterval);
      window.removeEventListener('popstate', handleLocation);
    };
  }, []);

  const handleDownloadApk = () => {
    setIsDownloading(true);
    setVersionInfo((prev) => ({
      ...prev,
      downloadCount: (Number(prev.downloadCount) || 148) + 1,
    }));
    const baseDownload = versionInfo.downloadUrl || '/api/download/apk';
    const buster = `?v=${versionInfo.buildNumber || 51}&t=${Date.now()}`;
    window.location.href = baseDownload + buster;
    setTimeout(() => setIsDownloading(false), 3000);
  };

  const formatIb = (num) => {
    const val = Number(num) || 0;
    return 'IB ' + Math.round(val).toLocaleString('id-ID');
  };

  // Digital Flip Clock Values (WIB - Asia/Jakarta)
  const clockHours = String(clockDate.getHours()).padStart(2, '0');
  const clockMins = String(clockDate.getMinutes()).padStart(2, '0');
  const clockSecs = String(clockDate.getSeconds()).padStart(2, '0');
  const clockDayStr = clockDate.toLocaleDateString('id-ID', { weekday: 'long' });
  const clockDateStr = clockDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

  // Companies metrics for Trading Wall
  const fallbackStocks = [
    { id: '1', symbol: 'IMPC', name: 'PT. Inter-Federation Public Market Capital Tbk.', current_price: 6840, base_price: 6720, sector: 'Finansial' },
    { id: '2', symbol: 'AGWP', name: 'PT. Agen Wisata Pesiar Tbk.', current_price: 18088, base_price: 16745, sector: 'Properti' },
    { id: '3', symbol: 'SYCA', name: 'PT. Syafiq Capital Asia Tbk.', current_price: 757, base_price: 740, sector: 'Teknologi' },
    { id: '4', symbol: 'BALN', name: 'PT. Baterai Litium Nasional Tbk.', current_price: 80050, base_price: 80050, sector: 'Energi' },
    { id: '5', symbol: 'ABKS', name: 'PT. Abadi Komputasi Samudera Tbk.', current_price: 189191, base_price: 252700, sector: 'Teknologi' },
    { id: '6', symbol: 'ABFC', name: 'PT. Abadi Finansial Citra Tbk.', current_price: 118224, base_price: 161200, sector: 'Finansial' },
    { id: '7', symbol: 'AKOM', name: 'PT. Artha Konsumsi Mitra Tbk.', current_price: 8210, base_price: 8210, sector: 'F&B' },
    { id: '8', symbol: 'ARPD', name: 'PT. Artha Pengembang Dinamika Tbk.', current_price: 62944, base_price: 62944, sector: 'Properti' },
    { id: '9', symbol: 'MERK', name: 'PT. Merck Farmasi Tbk.', current_price: 3600, base_price: 3640, sector: 'Kesehatan' },
    { id: '10', symbol: 'MIKA', name: 'PT. Mitra Keluarga Sehat Tbk.', current_price: 1605, base_price: 1590, sector: 'Kesehatan' },
    { id: '11', symbol: 'META', name: 'PT. Nusantara Meta Industri Tbk.', current_price: 238, base_price: 238, sector: 'Infrastruktur' },
    { id: '12', symbol: 'MFMI', name: 'PT. Multifiling Mitra Tbk.', current_price: 1300, base_price: 1300, sector: 'Jasa' },
    { id: '13', symbol: 'MGLV', name: 'PT. Mega Galva Logistik Tbk.', current_price: 8125, base_price: 8250, sector: 'Transportasi' },
    { id: '14', symbol: 'MINA', name: 'PT. Minahasa Samudera Tbk.', current_price: 292, base_price: 302, sector: 'Pertanian' },
    { id: '15', symbol: 'MKAP', name: 'PT. Mitra Kreasi Andalan Tbk.', current_price: 1160, base_price: 1100, sector: 'Teknologi' },
    { id: '16', symbol: 'MIDI', name: 'PT. Midi Utama Retail Tbk.', current_price: 282, base_price: 286, sector: 'Konsumsi' },
  ];

  const sourceStocks = allCompanies.length > 0 ? allCompanies : fallbackStocks;

  const stockList = sourceStocks.map((c) => {
    const cur = Number(c.current_price) || 0;
    const base = Number(c.prev_close || c.base_price) || cur || 100;
    const diff = cur - base;
    const pct = base > 0 ? (diff / base) * 100 : 0;
    return {
      ...c,
      cur,
      base,
      diff,
      pct,
      isUp: diff > 0,
      isDown: diff < 0,
    };
  });

  // IPMC Composite Index Calculation (Mirip IDX Composite di Bursa Efek)
  const totalCur = stockList.reduce((acc, c) => acc + c.cur, 0);
  const totalBase = stockList.reduce((acc, c) => acc + c.base, 0);
  const ratio = totalBase > 0 ? totalCur / totalBase : 1;
  const baseIndex = 6002.20;
  const compositeIndex = (baseIndex * ratio).toFixed(2);
  const compositeDiff = (Number(compositeIndex) - baseIndex).toFixed(2);
  const compositePct = ((Number(compositeDiff) / baseIndex) * 100).toFixed(2);
  const isIndexGain = Number(compositeDiff) >= 0;

  // Top 5 Gainers
  const topGainers = [...stockList].sort((a, b) => b.pct - a.pct).slice(0, 5);

  // Top 5 Freq / Most Active
  const topFreq = [...stockList].sort((a, b) => b.cur - a.cur).slice(0, 5);

  // Filtered Matrix Grid for the Giant Screen
  const filteredWallStocks = stockList.filter((c) => {
    if (wallSector === 'GAINERS') return c.pct > 0;
    if (wallSector === 'LOSERS') return c.pct < 0;
    if (wallSector !== 'ALL' && c.sector !== wallSector) return false;
    if (wallSearch.trim()) {
      const q = wallSearch.toLowerCase();
      return (c.symbol || '').toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q);
    }
    return true;
  }).slice(0, 24);

  // Doubled ticker list for continuous endless smooth marquee (running to the left)
  const tickerStocks = stockList.length > 0 ? stockList.slice(0, 30) : fallbackStocks;
  const doubledTicker = [...tickerStocks, ...tickerStocks];

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Scoped Keyframes for Guaranteed Smooth Infinite Marquee */}
      <style>{`
        @keyframes cfxMarqueeAnimation {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
        .cfx-ticker-track {
          display: flex !important;
          width: max-content !important;
          animation: cfxMarqueeAnimation 40s linear infinite !important;
          will-change: transform;
        }
        .cfx-ticker-track:hover {
          animation-play-state: paused !important;
        }
      `}</style>

      {/* Live Running Stock Ticker Ribbon (Marquee Berjalan Mulus) */}
      <div className="bg-[#070b16] border-b border-slate-800/80 py-1.5 relative overflow-hidden select-none">
        {/* Pinned Left Badge */}
        <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center bg-[#070b16] px-3 sm:px-4 border-r border-slate-800/80 shadow-[4px_0_12px_rgba(0,0,0,0.7)]">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10.5px] font-mono whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            CFX LIVE
          </span>
        </div>

        {/* Fade Edge Gradients */}
        <div className="pointer-events-none absolute left-28 sm:left-32 top-0 bottom-0 w-8 bg-gradient-to-r from-[#070b16] to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#070b16] to-transparent z-10" />

        {/* Infinite Moving Marquee Track */}
        <div className="pl-32 sm:pl-36 overflow-hidden">
          <div className="cfx-ticker-track animate-ticker-marquee flex items-center gap-4 sm:gap-6">
            {doubledTicker.map((s, idx) => {
              const change = s.pct !== undefined ? s.pct.toFixed(1) : '0.0';
              const isUp = Number(change) > 0;
              const isDown = Number(change) < 0;
              return (
                <div
                  key={`${s.symbol}-${idx}`}
                  className="inline-flex items-center gap-2 font-mono text-[11px] sm:text-xs whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80 transition cursor-default shadow-sm"
                >
                  <span className="font-black text-sky-400">{s.symbol}</span>
                  <span className="text-slate-200 font-bold">
                    {Number(s.cur || s.current_price || 0).toLocaleString('id-ID')}
                  </span>
                  <span
                    className={`font-black flex items-center text-[10.5px] ${
                      isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {isUp ? `▲ +${change}%` : isDown ? `▼ ${change}%` : `0.0%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#060913]/95 backdrop-blur-xl border-b border-slate-800/80 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 p-[1.5px] shadow-lg shadow-amber-500/20 shrink-0">
              <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center">
                <span className="font-black text-amber-400 text-sm tracking-wider">CF</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base tracking-tight text-white whitespace-nowrap">
                  CAPITAL FEDERATION
                </span>
                <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold whitespace-nowrap">
                  v{versionInfo.version} RESMI
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 hidden lg:block tracking-tight">
                Simulasi Bursa Saham, E-IPO &amp; Konglomerasi Finansial Real-Time
              </p>
            </div>
          </div>

          {/* Navigation Links (Pill-Styled & Ultra-Clean) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleNavClick('tentang', '/tentang')}
              className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer bg-transparent border-0 font-bold text-xs"
            >
              Tentang Game
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('trading-wall', '/bursa')}
              className="px-3 py-1.5 rounded-xl text-emerald-300 hover:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Layar Bursa (Live Wall)
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('peringkat', '/peringkat')}
              className="px-3 py-1.5 rounded-xl text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 transition cursor-pointer bg-transparent border-0 font-black text-xs flex items-center gap-1.5"
            >
              <Crown size={13} className="text-amber-400" />
              Top 12 Naga
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('fitur', '/fitur')}
              className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer bg-transparent border-0 font-bold text-xs"
            >
              Fitur Utama
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('spesifikasi', '/spesifikasi')}
              className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition cursor-pointer bg-transparent border-0 font-bold text-xs whitespace-nowrap"
            >
              Spesifikasi HP
            </button>
          </nav>

          {/* Direct CTA Download Button */}
          <button
            type="button"
            onClick={handleDownloadApk}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition transform hover:scale-[1.02] cursor-pointer shrink-0"
          >
            <Download size={14} className="stroke-[2.5]" />
            <span>DOWNLOAD APK</span>
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="tentang" className="relative overflow-hidden pt-4 pb-12 lg:pt-6 lg:pb-16 scroll-mt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-sky-500/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Game Description & Download CTA */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Sparkles size={14} className="text-amber-400" />
                <span>GAME SIMULASI BURSA EFEK & KERAJAAN BISNIS REPUBLIK FEDERASI</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.15]">
                Bangun Perseroan Terbatas,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500">
                  IPO di Bursa Efek
                </span>
                , & Rebut Takhta{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">
                  Sultan 12 Naga!
                </span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                <strong className="text-white">Capital Federation (CFX)</strong> adalah game simulasi ekonomi,
                pasar modal, dan kerajaan bisnis multipemain <em>real-time</em>. Mulailah sebagai investor
                dengan modal awal, perdagangkan saham <strong className="text-sky-400">{versionInfo.totalCompanies}+ emiten</strong>{' '}
                berkode 4-huruf resmi, dirikan <strong className="text-amber-300">PT berbadan hukum Akta Notaris</strong>,
                bawa perusahaan Anda melantai di bursa lewat <strong className="text-emerald-400">E-IPO 4 Tahap</strong>,
                hingga kuasai ekonomi negara sebagai <strong>Sultan 12 Naga</strong>!
              </p>

              {/* TENTANG GAME: 4 PILAR GAMEPLAY UTAMA */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0A1020] to-slate-950 border border-slate-800/80 p-5 sm:p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h2 className="text-sm font-black text-amber-300 tracking-wider uppercase font-mono">
                      TENTANG GAME &amp; PILAR GAMEPLAY CFX
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Simulasi Nyata Real-Time
                  </span>
                </div>

                {/* 4 Pilar Fitur Game Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pilar 1: Bursa Efek & E-IPO */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/25 hover:border-emerald-500/50 transition space-y-1">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-mono">
                      <TrendingUp size={16} className="text-emerald-400 shrink-0" />
                      <span>Bursa Efek &amp; E-IPO 4 Tahap</span>
                    </div>
                    <p className="text-[11.5px] text-slate-300 leading-relaxed">
                      Trading saham 363+ emiten berkode 4-huruf resmi, pantau grafik pergerakan pasar, dan bawa perusahaan Anda go public melalui E-IPO 4 tahap.
                    </p>
                  </div>

                  {/* Pilar 2: Badan Hukum PT & Holding Group */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-sky-500/25 hover:border-sky-500/50 transition space-y-1">
                    <div className="flex items-center gap-2 text-sky-400 font-bold text-xs font-mono">
                      <Building2 size={16} className="text-sky-400 shrink-0" />
                      <span>Pendirian PT &amp; Akta Notaris</span>
                    </div>
                    <p className="text-[11.5px] text-slate-300 leading-relaxed">
                      Legalisasi perseroan berbadan hukum resmi, bentuk sinergi holding kas anak usaha, dan lakukan aksi akuisisi tender offer RUPS.
                    </p>
                  </div>

                  {/* Pilar 3: Pengadilan Niaga PNAF */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-500/25 hover:border-rose-500/50 transition space-y-1">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs font-mono">
                      <Gavel size={16} className="text-rose-400 shrink-0" />
                      <span>Sidang Arbitrase &amp; Sita Aset PNAF</span>
                    </div>
                    <p className="text-[11.5px] text-slate-300 leading-relaxed">
                      Meja hijau peradilan sengketa bursa, sita kas dan saham lawan pelanggar pasar modal, sewa pengacara, serta aju banding pemulihan nama baik.
                    </p>
                  </div>

                  {/* Pilar 4: Takhta Sultan 12 Naga */}
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/25 hover:border-amber-500/50 transition space-y-1">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs font-mono">
                      <Crown size={16} className="text-amber-400 shrink-0" />
                      <span>Takhta Sultan 12 Naga</span>
                    </div>
                    <p className="text-[11.5px] text-slate-300 leading-relaxed">
                      Raih takhta 12 konglomerat tertinggi penentu stabilitas pasar keuangan Federasi dan kendalikan peredaran likuiditas modal nasional.
                    </p>
                  </div>
                </div>

                {/* Action Buttons: Navigasi Bersih & Nyaman */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Sparkles size={14} className="text-amber-400 shrink-0" />
                    <span>Multiplayer Real-Time &bull; Bebas Iklan &bull; Server Cloud 24 Jam</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => handleNavClick('trading-wall', '/bursa')}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                    >
                      <TrendingUp size={14} />
                      <span>Layar Bursa (Live)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('fitur', '/fitur')}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700 font-bold text-xs transition cursor-pointer"
                    >
                      <span>Pelajari Fitur &rarr;</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Game Preview & Live Stats Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-[#080D1A] border border-slate-800 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Crown size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">STATUS EKONOMI FEDERASI</h3>
                      <p className="text-[11px] text-slate-400">Data Langsung dari Server Bursa CFX</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                    REAL-TIME 24/7
                  </span>
                </div>

                {/* 4 Key Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">Emiten Terdaftar</div>
                    <div className="text-xl font-black text-sky-400 mt-0.5">
                      {versionInfo.totalCompanies} PT Tbk.
                    </div>
                    <div className="text-[10px] text-emerald-400 mt-0.5">Kode Saham 4-Huruf Resmi</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/80">
                    <div className="text-[11px] text-slate-400">Konglomerat & Bot</div>
                    <div className="text-xl font-black text-amber-400 mt-0.5">
                      {versionInfo.totalPlayers}+ Investor
                    </div>
                    <div className="text-[10px] text-amber-300/80 mt-0.5">Perdagangan Aktif 24 Jam</div>
                  </div>
                </div>

                {/* Top 12 Naga Preview Widget */}
                <div id="hero-peringkat" className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-amber-300 flex items-center gap-1.5">
                      🐉 TOP KONGLOMERAT (SULTAN 12 NAGA)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNavClick('peringkat', '/peringkat')}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold bg-transparent border-0 cursor-pointer"
                    >
                      Lihat Semua &rarr;
                    </button>
                  </div>

                  <div className="space-y-2">
                    {topLeaders.length === 0 ? (
                      <div className="text-xs text-slate-500 py-4 text-center">
                        Memuat data konglomerat...
                      </div>
                    ) : (
                      topLeaders.slice(0, 5).map((u, idx) => (
                        <div
                          key={u.id || idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/25"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[11px] flex items-center justify-center shrink-0">
                              {idx === 0 ? '👑' : idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-amber-200 truncate">
                                  {u.username}
                                </span>
                                <span className="px-1.5 py-0.2 rounded bg-gradient-to-r from-amber-500 to-orange-600 text-[9px] font-black text-white">
                                  12 NAGA
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {u.ptName || 'Konglomerat Utama'}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <div className="text-xs font-black text-amber-400 font-mono">
                              {formatIb(u.netWorth)}
                            </div>
                            <div className="text-[9.5px] text-slate-500">Total Kekayaan</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BURSA EFEK DIGITAL TRADING WALL (Layar Raksasa Perdagangan Saham CFX / IDX Composite Screen) */}
      <section id="trading-wall" className="py-16 bg-[#040711] border-y border-slate-800/80 relative overflow-hidden scroll-mt-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-950/20 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative">
          {/* Header Title */}
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-black tracking-wide inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              BURSA EFEK DIGITAL TERINTEGRASI REAL-TIME
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Layar Raksasa Perdagangan Efek (CFX Giant Trading Floor Wall)
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm">
              Pantau pergerakan harga saham, indeks komposit IPMC Composite (IHSF), saham teraktif (Top Gainers &amp; Most Active), serta likuiditas 360+ emiten bursa secara langsung.
            </p>
          </div>

          {/* THE GIANT TRADING BOARD (Styled like the IDX Trading Screen) */}
          <div className="rounded-3xl border-2 border-slate-700/80 bg-gradient-to-b from-[#090e1c] via-[#060a14] to-[#04070e] shadow-[0_0_60px_rgba(0,0,0,0.85)] p-4 sm:p-7 relative overflow-hidden">
            {/* Top Board Frame: Logo, Composite Index, and Real-Time WIB Digital Clock */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
              {/* Left: CFX Official Exchange Monogram Logo */}
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-red-600 p-[2.5px] shadow-lg shadow-rose-500/25">
                    <div className="w-full h-full rounded-[14px] bg-slate-950 flex flex-col items-center justify-center">
                      <span className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500 leading-none">CFX</span>
                      <span className="text-[7.5px] font-bold text-slate-400 tracking-wider leading-none mt-1">BURSA</span>
                    </div>
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-black tracking-wider text-white">CAPITAL FEDERATION</span>
                  </div>
                  <div className="text-[11px] text-amber-400 font-mono font-bold tracking-wider">
                    INTER-FEDERATION PUBLIC MARKET CAPITAL (IPMC)
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Bursa Efek &amp; Pasar Modal Resmi Republik Federasi
                  </div>
                </div>
              </div>

              {/* Center: IPMC COMPOSITE (IHSF) Main Index */}
              <div className="text-center flex-1 max-w-md w-full">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-400 font-mono tracking-widest uppercase">
                    IPMC COMPOSITE (IHSF)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    INDEKS RESMI
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-center gap-3">
                  <span className={`text-4xl sm:text-5xl lg:text-6xl font-black font-mono tracking-tight ${isIndexGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {Number(compositeIndex).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <div className="flex flex-col items-start font-mono font-bold leading-tight">
                    <span className={`text-base sm:text-lg flex items-center gap-0.5 ${isIndexGain ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isIndexGain ? '▲ +' : '▼ '}{Math.abs(compositePct)}%
                    </span>
                    <span className={`text-xs sm:text-sm ${isIndexGain ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
                      {isIndexGain ? '+' : ''}{compositeDiff}
                    </span>
                  </div>
                </div>

                {/* Trading Volume, Value, Frequency Bar (Matching Image 4) */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center font-mono">
                  <div>
                    <div className="text-[9.5px] text-slate-400 uppercase tracking-wider">TRADING VOLUME</div>
                    <div className="text-xs sm:text-sm font-bold text-slate-100 mt-0.5">14,820 M Lot</div>
                  </div>
                  <div className="border-x border-slate-800/80">
                    <div className="text-[9.5px] text-slate-400 uppercase tracking-wider">TRADING VALUE</div>
                    <div className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5">IB 8,492 B</div>
                  </div>
                  <div>
                    <div className="text-[9.5px] text-slate-400 uppercase tracking-wider">TRADING FREQ</div>
                    <div className="text-xs sm:text-sm font-bold text-sky-400 mt-0.5">1.185 M Order</div>
                  </div>
                </div>
              </div>

              {/* Right: Authentic Real-Time Digital Flip Clock (Matching Image 4) */}
              <div className="bg-slate-950/90 border border-slate-700/80 rounded-2xl p-3 sm:p-4 text-center min-w-[200px] shadow-inner font-mono">
                <div className="flex items-center justify-center gap-1.5 text-2xl sm:text-3xl font-black text-amber-400 tracking-wider">
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">{clockHours}</span>
                  <span className="animate-pulse text-amber-500">:</span>
                  <span className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">{clockMins}</span>
                  <span className="animate-pulse text-amber-500 text-xl">:</span>
                  <span className="px-1.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-amber-300/80">{clockSecs}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-300 mt-2 uppercase tracking-wider">
                  {clockDateStr} &bull; {clockDayStr}
                </div>
                <div className="text-[9.5px] text-emerald-400 font-bold tracking-widest mt-0.5 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  WIB &bull; BURSA BERJALAN AKTIF
                </div>
              </div>
            </div>

            {/* Sub-Header: TOP 5 GAINERS & TOP 5 FREQ (Matching Image 4 Side-by-Side Tables) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {/* TOP 5 GAINERS */}
              <div className="rounded-2xl bg-slate-950/80 border border-emerald-500/30 p-3.5 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <span className="text-xs font-black text-emerald-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                    <TrendingUp size={14} /> TOP 5 GAINERS
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Lonjakan Tertinggi</span>
                </div>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-slate-400 border-b border-slate-800/60 text-left">
                      <th className="py-1 w-8 text-center">NO</th>
                      <th className="py-1">STOCK</th>
                      <th className="py-1 text-right">PRICE (IB)</th>
                      <th className="py-1 text-right">CHANGE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {topGainers.map((g, idx) => (
                      <tr key={g.id || g.symbol} className="hover:bg-slate-900/60 transition">
                        <td className="py-1.5 text-center text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-1.5 font-black text-sky-300">
                          {g.symbol}
                          <span className="text-[10px] text-slate-400 block truncate max-w-[140px] font-normal">{g.name}</span>
                        </td>
                        <td className="py-1.5 text-right font-bold text-slate-100">{Number(g.cur).toLocaleString('id-ID')}</td>
                        <td className="py-1.5 text-right font-black text-emerald-400">
                          ▲ +{g.pct.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* TOP 5 FREQ / MOST ACTIVE */}
              <div className="rounded-2xl bg-slate-950/80 border border-amber-500/30 p-3.5 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                  <span className="text-xs font-black text-amber-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                    <Activity size={14} /> TOP 5 FREQ / MOST ACTIVE
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Frekuensi Tertinggi</span>
                </div>
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-[10px] text-slate-400 border-b border-slate-800/60 text-left">
                      <th className="py-1 w-8 text-center">NO</th>
                      <th className="py-1">STOCK</th>
                      <th className="py-1 text-right">PRICE (IB)</th>
                      <th className="py-1 text-right">FREQ / VOL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {topFreq.map((f, idx) => (
                      <tr key={f.id || f.symbol} className="hover:bg-slate-900/60 transition">
                        <td className="py-1.5 text-center text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-1.5 font-black text-amber-300">
                          {f.symbol}
                          <span className="text-[10px] text-slate-400 block truncate max-w-[140px] font-normal">{f.name}</span>
                        </td>
                        <td className="py-1.5 text-right font-bold text-slate-100">{Number(f.cur).toLocaleString('id-ID')}</td>
                        <td className="py-1.5 text-right font-bold text-sky-400">
                          {((idx + 1) * 8420).toLocaleString('id-ID')} Trx
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* GIANT MATRIX GRID WALL OF STOCKS (Matching Lower 2/3 of Image 4) */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 text-xs font-mono">
                  {['ALL', 'GAINERS', 'LOSERS', 'Teknologi', 'Finansial', 'Energi', 'Properti', 'Kesehatan'].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setWallSector(sec)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap cursor-pointer border ${
                        wallSector === sec
                          ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border-slate-800'
                      }`}
                    >
                      {sec === 'ALL' ? 'Semua Emiten' : sec === 'GAINERS' ? '🚀 Top Gainers' : sec === 'LOSERS' ? '📉 Top Losers' : sec}
                    </button>
                  ))}
                </div>

                <div className="w-full sm:w-64 relative">
                  <input
                    type="text"
                    value={wallSearch}
                    onChange={(e) => setWallSearch(e.target.value)}
                    placeholder="Cari kode saham (cth: AGWP, BALN)..."
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* The 4x6 / 5x5 Matrix Screen Wall */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
                {filteredWallStocks.map((stock) => {
                  const isUp = stock.isUp;
                  const isDown = stock.isDown;
                  const cardTone = isUp
                    ? 'border-emerald-500/50 bg-gradient-to-b from-[#082a1b]/90 via-[#041910]/95 to-[#020d08] text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                    : isDown
                    ? 'border-rose-500/50 bg-gradient-to-b from-[#330f16]/90 via-[#1f090d]/95 to-[#0f0406] text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.12)]'
                    : 'border-slate-700/60 bg-gradient-to-b from-[#181d2c]/90 via-[#0e121d]/95 to-[#080a10] text-amber-300';

                  return (
                    <div
                      key={stock.id || stock.symbol}
                      className={`p-3 rounded-xl border transition-all duration-200 hover:scale-[1.03] hover:z-10 cursor-default font-mono flex flex-col justify-between ${cardTone}`}
                    >
                      {/* Tile Header: Symbol & Sector */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1.5">
                        <span className="font-black text-sm sm:text-base text-white tracking-wider">
                          {stock.symbol}
                        </span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-black/40 text-slate-300 border border-white/10">
                          {stock.sector ? stock.sector.slice(0, 8) : 'BURSA'}
                        </span>
                      </div>

                      {/* Big Center Price (Matching Image 4) */}
                      <div className="text-center py-1 sm:py-2">
                        <div className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                          {Number(stock.cur).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          1 Lot: IB {((stock.cur * 100) / 1000).toLocaleString('id-ID')} Rb
                        </div>
                      </div>

                      {/* Tile Bottom: % and points change (Matching Image 4) */}
                      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] font-bold">
                        <span className="flex items-center gap-0.5">
                          {isUp ? '▲ +' : isDown ? '▼ ' : ''}{stock.pct.toFixed(2)}%
                        </span>
                        <span className="text-[10px] opacity-80">
                          {stock.diff > 0 ? `+${stock.diff}` : stock.diff}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Call to Action */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Data emiten disinkronkan secara langsung dari Engine Bursa Efek CFX &amp; Pengadilan Niaga PNAF.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadApk}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer"
                >
                  <Download size={14} />
                  <span>MULAI TRADING DI GAME &bull; UNDUH APK</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAPAN PERINGKAT RESMI SULTAN 12 NAGA & TOP 10 TAIPAN (DEDICATED SECTION) */}
      <section id="peringkat" className="py-16 bg-[#080D1A] border-y border-slate-800/80 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-black tracking-wide inline-flex items-center gap-1.5">
              <Crown size={14} className="text-amber-400" />
              PAPAN PERINGKAT RESMI BURSA MODAL FEDERASI
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Klasemen Sultan 12 Naga &amp; Top Taipan Terkaya
            </h2>
            <p className="text-slate-400 text-sm">
              Peringkat langsung 24/7 berdasarkan akumulasi modal kas pribadi, nilai portofolio saham bursa,
              dan kepemilikan PT Terbuka (Tbk.).
            </p>
          </div>

          {/* Top 3 Podium */}
          {topLeaders.length >= 3 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto pt-4">
              {/* Rank 2 */}
              <div className="order-2 md:order-1 p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 shadow-xl flex flex-col items-center text-center relative mt-0 md:mt-6">
                <div className="w-12 h-12 rounded-full bg-slate-400/20 border-2 border-slate-300 flex items-center justify-center text-slate-200 font-black text-lg mb-3 shadow-md">
                  🥈 2
                </div>
                <div className="text-base font-black text-white">{topLeaders[1]?.username}</div>
                <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 text-[10px] font-bold mt-1">
                  12 NAGA FEDERASI
                </span>
                <div className="text-xs text-sky-400 font-semibold mt-2 truncate max-w-full">
                  {topLeaders[1]?.ptName || 'PT Tbk.'}
                </div>
                <div className="text-lg font-black text-amber-400 font-mono mt-3">
                  {formatIb(topLeaders[1]?.netWorth)}
                </div>
                <span className="text-[10px] text-slate-500">Total Kekayaan Bersih</span>
              </div>

              {/* Rank 1 (Crown) */}
              <div className="order-1 md:order-2 p-7 rounded-2xl bg-gradient-to-b from-[#1E1808] via-slate-900 to-slate-950 border-2 border-amber-500 shadow-2xl shadow-amber-500/20 flex flex-col items-center text-center relative -mt-2">
                <div className="absolute -top-3 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  PEMIMPIN KONGSI #1
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-amber-300 flex items-center justify-center text-slate-950 font-black text-2xl mb-3 shadow-lg shadow-amber-500/30">
                  👑
                </div>
                <div className="text-xl font-black text-amber-300">{topLeaders[0]?.username}</div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-500/50 text-amber-300 text-[11px] font-black mt-1">
                  SULTAN 12 NAGA #1
                </span>
                <div className="text-xs text-sky-300 font-bold mt-2 truncate max-w-full">
                  {topLeaders[0]?.ptName || 'PT. Kencana Artha Persada Tbk.'}
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono mt-3">
                  {formatIb(topLeaders[0]?.netWorth)}
                </div>
                <span className="text-[11px] text-slate-400">Total Kekayaan Bersih</span>
              </div>

              {/* Rank 3 */}
              <div className="order-3 md:order-3 p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-700/60 shadow-xl flex flex-col items-center text-center relative mt-0 md:mt-8">
                <div className="w-12 h-12 rounded-full bg-amber-800/30 border-2 border-amber-600 flex items-center justify-center text-amber-300 font-black text-lg mb-3 shadow-md">
                  🥉 3
                </div>
                <div className="text-base font-black text-white">{topLeaders[2]?.username}</div>
                <span className="px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 text-[10px] font-bold mt-1">
                  12 NAGA FEDERASI
                </span>
                <div className="text-xs text-sky-400 font-semibold mt-2 truncate max-w-full">
                  {topLeaders[2]?.ptName || 'PT Tbk.'}
                </div>
                <div className="text-lg font-black text-amber-400 font-mono mt-3">
                  {formatIb(topLeaders[2]?.netWorth)}
                </div>
                <span className="text-[10px] text-slate-500">Total Kekayaan Bersih</span>
              </div>
            </div>
          )}

          {/* Full Top 10 Table */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl max-w-5xl mx-auto">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Crown size={16} className="text-amber-400" />
                <span className="text-xs font-black text-slate-200">KLASEMEN RESMI TOP TAIPAN SAHAM</span>
              </div>
              <span className="text-[11px] text-slate-400">Update Real-Time CFX</span>
            </div>
            <div className="divide-y divide-slate-800/80">
              {topLeaders.map((u, idx) => (
                <div
                  key={u.id || idx}
                  className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-800/40 transition gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`w-8 h-8 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-500 text-slate-950' :
                      idx === 1 ? 'bg-slate-300 text-slate-950' :
                      idx === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white truncate">{u.username}</span>
                        {idx < 12 ? (
                          <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-600 text-[9.5px] font-black text-white shadow-sm">
                            12 NAGA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9.5px] font-bold">
                            TAIPAN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {u.ptName || 'Perusahaan Terbuka (Tbk.)'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm sm:text-base font-black text-amber-400 font-mono">
                      {formatIb(u.netWorth)}
                    </div>
                    <div className="text-[10px] text-slate-500">Total Kekayaan</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FITUR & ISI GAME LENGKAP */}
      <section id="fitur" className="py-16 bg-[#090E1C] border-y border-slate-800/80 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
              EKSPLORASI FITUR PERMAINAN
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Apa Saja Isi di Dalam Game Capital Federation?
            </h2>
            <p className="text-slate-400 text-sm">
              Dirancang menyerupai ekosistem Bursa Efek Capital Federation (CFX/IPMC) dan hukum korporasi modern,
              memberikan pengalaman menjadi Taipan & Konglomerat sesungguhnya.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-sky-500/40 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <TrendingUp size={22} />
              </div>
              <h3 className="text-base font-black text-white">
                1. Bursa Saham 236+ Emiten Real-Time
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Jual-beli saham dari 6 sektor strategis (Keuangan, Teknologi, Energi, F&amp;B, Properti,
                Manufaktur) dengan kode 4-huruf resmi, Orderbook Bid/Ask, Running Trade detik-demi-detik,
                batas Auto Rejection (ARA/ARB), dan pembagian <strong>Dividen Tunai</strong> otomatis.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Building2 size={22} />
              </div>
              <h3 className="text-base font-black text-white">
                2. Pendirian PT, Direksi &amp; Holding
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Dirikan Perseroan Terbatas (PT) pribadi lengkap dengan <strong>Salinan Akta Notaris</strong>.
                Rekrut jajaran direksi (CEO, CFO, CMO), tingkatkan riset R&amp;D, kapasitas produksi, dan
                terima arus kas laba bersih perusahaan setiap siklus.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Rocket size={22} />
              </div>
              <h3 className="text-base font-black text-white">
                3. E-IPO Pasar Perdana 4 Tahap
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Bawa PT Anda <em>Go Public</em> (Tbk.) melalui siklus nyata: <strong>1. Bookbuilding Mitra (35%)</strong>,{' '}
                <strong>2. Penawaran Umum Ritel</strong>, <strong>3. Penjatahan (Allotment)</strong>, hingga{' '}
                <strong>4. Pencatatan Perdana (Listing ARA +50%)</strong> di lantai bursa!
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Crown size={22} />
              </div>
              <h3 className="text-base font-black text-white">
                4. Takhta Sultan 12 Naga &amp; Chat Emas
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kumpulkan kekayaan tertinggi dan tembus <strong>Top 12 Papan Peringkat Konglomerat</strong> untuk
                menyandang gelar <strong>🐉 Sultan 12 Naga</strong>. Setiap pesan Anda di Chat Global Bursa
                akan tampil dengan bingkai &amp; mahkota emas eksklusif!
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/40 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Award size={22} />
              </div>
              <h3 className="text-base font-black text-white">
                5. Akuisisi Saham P2P &amp; Tender Negara
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Beli porsi saham pengendali langsung dari konglomerat lain di <strong>Pasar Negosiasi P2P</strong>{' '}
                dan menangkan kontrak <strong>Tender Mega-Proyek Pemerintah</strong> bernilai miliaran Indigo
                Bucks (IB).
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 transition space-y-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Gavel size={22} />
              </div>
              <h3 className="text-base font-black text-white">
                6. Bank Sentral, SBN &amp; Pengadilan Niaga
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ajukan kredit ekspansi di <strong>Bank Sentral BIF</strong>, berinvestasi di{' '}
                <strong>Obligasi Negara (SBN)</strong>, dan hadapi sidang gugatan wanprestasi atau lelang sita
                aset oleh Kurator di <strong>Pengadilan Niaga (PNAF)</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SERTIFIKASI PERANGKAT & SPESIFIKASI MINIMUM HP (ANDROID 10+) */}
      <section id="spesifikasi" className="py-16 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              SERTIFIKASI KOMPATIBILITAS & KEAMANAN PERANGKAT
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Spesifikasi HP &amp; Sertifikasi Keamanan APK
            </h2>
            <p className="text-slate-400 text-sm">
              Aplikasi Capital Federation telah dioptimalkan dengan engine Flutter Release terbaru agar ringan,
              hemat baterai, dan berjalan mulus pada perangkat Android modern.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Spesifikasi Minimum HP */}
            <div className="lg:col-span-7 rounded-2xl bg-slate-900/95 border border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Smartphone size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      Syarat Spesifikasi Perangkat (System Requirements)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Pastikan smartphone Android Anda memenuhi standar berikut
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-black">
                  ANDROID 10+
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-400 text-xs font-black">
                    <Smartphone size={15} />
                    <span>SISTEM OPERASI (OS)</span>
                  </div>
                  <div className="text-sm font-black text-white">
                    Minimal Android 10.0 (API 29)
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Mendukung penuh Android 10, 11, 12, 13, 14, hingga Android 15 terbaru.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
                    <Cpu size={15} />
                    <span>PROSESOR &amp; RAM</span>
                  </div>
                  <div className="text-sm font-black text-white">
                    RAM Minimal 3 GB (Rekomendasi 4 GB+)
                  </div>
                  <p className="text-[11px] text-slate-400">
                    CPU Octa-Core 1.8 GHz ARM64-v8a / armeabi-v7a untuk grafik bursa real-time.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-black">
                    <HardDrive size={15} />
                    <span>RUANG PENYIMPANAN</span>
                  </div>
                  <div className="text-sm font-black text-white">
                    Ukuran APK {versionInfo.fileSizeMb} (Free 100 MB)
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sangat ringan karena seluruh database bursa disimpan di Cloud Server CFX.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 space-y-1.5">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-black">
                    <Wifi size={15} />
                    <span>JARINGAN INTERNET</span>
                  </div>
                  <div className="text-sm font-black text-white">
                    4G LTE / 5G / Wi-Fi Stabil
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sinkronisasi harga saham, dividen, dan chat bursa berjalan via WebSocket Live.
                  </p>
                </div>
              </div>
            </div>

            {/* Sertifikasi Keamanan & Cara Instalasi */}
            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-b from-[#0B1E19] to-slate-900 border border-emerald-500/40 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <FileCheck2 size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      SERTIFIKAT KEAMANAN DIGITAL CFX
                    </span>
                    <h3 className="text-base font-black text-white">
                      Terverifikasi Bebas Virus &amp; Malware
                    </h3>
                  </div>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Signed Release APK:</strong> Dikompilasi resmi dari kode sumber Flutter
                      Capital Federation tanpa pihak ketiga.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Izin Perangkat Aman:</strong> Hanya memerlukan akses Internet (tidak meminta
                      akses kontak, kamera, atau SMS pribadi Anda).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Deteksi Update Otomatis di Profil:</strong> Aplikasi otomatis mendeteksi
                      jika ada versi baru yang dirilis oleh server.
                    </span>
                  </li>
                </ul>

                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                  <div className="text-[11px] font-black text-amber-300">
                    📌 Panduan Instalasi Cepat (Non-Play Store):
                  </div>
                  <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside">
                    <li>Klik tombol <strong>Download APK Resmi</strong> di bawah.</li>
                    <li>
                      Buka file <code className="text-emerald-300">Capital-Federation-v{versionInfo.version}-CFX.apk</code>{' '}
                      (pilih <em>&quot;Tetap Instal / Izinkan dari Sumber Ini&quot;</em> jika muncul notifikasi browser).
                    </li>
                    <li>Buka game, daftar akun, dan klaim modal perdana Anda!</li>
                  </ol>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDownloadApk}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition cursor-pointer"
              >
                <Download size={16} />
                <span>UNDUH APK SEKARANG ({versionInfo.fileSizeMb})</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#04060D] border-t border-slate-800/80 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-amber-500 flex items-center justify-center text-slate-950 font-black text-[11px]">
              CF
            </div>
            <span>
              © 2026 <strong className="text-slate-300">Capital Federation (CFX)</strong> • Otoritas Moneter
              &amp; Bursa Efek Republik Federasi Indigo.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="mailto:capital.federation19@gmail.com"
              className="text-slate-400 hover:text-emerald-400 transition flex items-center gap-1.5"
            >
              <span>📧 Layanan &amp; Bug: <strong className="text-slate-200 hover:text-emerald-300">capital.federation19@gmail.com</strong></span>
            </a>
            <span className="text-emerald-400 font-semibold">● Server Online ({versionInfo.apkVersion})</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

