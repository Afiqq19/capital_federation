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
} from 'lucide-react';

export default function PublicDownloadLandingPage() {
  const [versionInfo, setVersionInfo] = useState({
    version: '1.6.7',
    buildNumber: 21,
    apkVersion: 'v1.6.7 (Build 21)',
    minAndroid: 'Android 10.0 (API Level 29 / Quince Tart) ke atas',
    fileSizeMb: '25.0 MB',
    downloadUrl: '/api/download/apk',
    downloadCount: 196,
    totalCompanies: 504,
    totalPlayers: 1055,
    sha256: '5998839556ddf9a3e0b1c89bdc67fe2cc071dba550e8607aecf08457920efa85',
    releaseNotes:
      'Ekspansi 12 Naga & 1.000+ Konglomerat, Perbaikan Profil Realtime, Validasi Pendirian PT, dan Performa Optimal',
  });
  const [topLeaders, setTopLeaders] = useState([]);
  const [topStocks, setTopStocks] = useState([]);
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
    // 1. Amati URL awal (e.g. /peringkat, /tentang, /fitur, /spesifikasi)
    const handleLocation = () => {
      const clean = (window.location.pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase();
      if (['peringkat', 'tentang', 'fitur', 'spesifikasi'].includes(clean)) {
        setTimeout(() => scrollToSection(clean), 180);
      }
    };
    handleLocation();
    window.addEventListener('popstate', handleLocation);

    // 2. Fetch Version Info
    fetch('/api/version')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.version) {
          setVersionInfo((prev) => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});

    // 3. Fetch Top 12 Leaders (12 Naga & Taipan)
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTopLeaders(data.slice(0, 10));
        }
      })
      .catch(() => {});

    // 4. Fetch Stocks
    fetch('/api/companies')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTopStocks(data.slice(0, 8));
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  const handleDownloadApk = () => {
    setIsDownloading(true);
    setVersionInfo((prev) => ({
      ...prev,
      downloadCount: (Number(prev.downloadCount) || 148) + 1,
    }));
    window.location.href = versionInfo.downloadUrl || '/api/download/apk';
    setTimeout(() => setIsDownloading(false), 3000);
  };

  const formatIb = (num) => {
    const val = Number(num) || 0;
    return 'IB ' + Math.round(val).toLocaleString('id-ID');
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Live Stock Ticker Ribbon */}
      {topStocks.length > 0 && (
        <div className="bg-[#0A0F1E] border-b border-slate-800/80 py-2 px-4 overflow-x-auto whitespace-nowrap text-xs">
          <div className="max-w-7xl mx-auto flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              BURSA CFX LIVE
            </span>
            {topStocks.map((s) => {
              const change = s.base_price
                ? (((s.current_price - s.base_price) / s.base_price) * 100).toFixed(1)
                : '0.0';
              const isUp = Number(change) >= 0;
              return (
                <div key={s.id || s.symbol} className="inline-flex items-center gap-2 font-mono text-[11.5px]">
                  <span className="font-black text-sky-400">{s.symbol}</span>
                  <span className="text-slate-200 font-bold">
                    {Number(s.current_price || 0).toLocaleString('id-ID')}
                  </span>
                  <span className={isUp ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {isUp ? `+${change}%` : `${change}%`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#060913]/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 text-slate-950 font-black text-base">
              CF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-white">
                  CAPITAL FEDERATION
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                  v{versionInfo.version} RESMI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Simulasi Bursa Saham, E-IPO & Konglomerasi Finansial Real-Time
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-300">
            <button
              type="button"
              onClick={() => handleNavClick('tentang', '/tentang')}
              className="hover:text-amber-400 transition cursor-pointer bg-transparent border-0 p-0 text-slate-300 font-bold text-xs"
            >
              Tentang Game
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('fitur', '/fitur')}
              className="hover:text-amber-400 transition cursor-pointer bg-transparent border-0 p-0 text-slate-300 font-bold text-xs"
            >
              Fitur Utama
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('peringkat', '/peringkat')}
              className="hover:text-amber-300 transition cursor-pointer bg-transparent border-0 p-0 text-amber-300 font-black text-xs flex items-center gap-1.5"
            >
              <Crown size={13} className="text-amber-400" />
              Top 12 Naga
            </button>
            <button
              type="button"
              onClick={() => handleNavClick('spesifikasi', '/spesifikasi')}
              className="hover:text-amber-400 transition cursor-pointer bg-transparent border-0 p-0 text-slate-300 font-bold text-xs"
            >
              Sertifikasi &amp; Spesifikasi HP
            </button>
          </nav>

          <button
            type="button"
            onClick={handleDownloadApk}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            <Download size={15} />
            <span>DOWNLOAD APK</span>
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <section id="tentang" className="relative overflow-hidden pt-12 pb-16 lg:pt-16 lg:pb-24 scroll-mt-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-sky-500/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Game Description & Download CTA */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Sparkles size={14} className="text-amber-400" />
                <span>GAME SIMULASI BURSA EFEK & KONGLOMERASI #1 INDONESIA</span>
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

              {/* Main Download Box */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900/95 via-[#0B1325] to-slate-900 border border-amber-500/40 shadow-2xl shadow-amber-500/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black">
                        INSTALLER RESMI ANDROID (.APK)
                      </span>
                      <span className="text-xs text-amber-300 font-mono font-bold">
                        {versionInfo.apkVersion}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-white">
                      Unduh Aplikasi Capital Federation Sekarang
                    </h2>
                    <p className="text-xs text-slate-400">
                      Distribusi langsung resmi dari Server Capital Federation (Bebas Iklan & 100% Gratis).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadApk}
                    disabled={isDownloading}
                    className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition transform hover:-translate-y-0.5 cursor-pointer shrink-0"
                  >
                    <Download size={20} className="stroke-[2.5]" />
                    <div className="text-left">
                      <div className="leading-none">
                        {isDownloading ? 'MENGUNDUH APK...' : 'DOWNLOAD APK RESMI'}
                      </div>
                      <div className="text-[10px] font-bold opacity-80 mt-0.5">
                        Ukuran: {versionInfo.fileSizeMb} • Android 10+
                      </div>
                    </div>
                  </button>
                </div>

                {/* Quick Certification Badges inside CTA */}
                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold">
                    <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                    <span>Sertifikasi Aman Play Protect</span>
                  </div>
                  <div className="flex items-center gap-2 text-sky-300 font-semibold">
                    <Smartphone size={15} className="text-sky-400 shrink-0" />
                    <span>Min. Android 10.0 (API 29)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <Users size={15} className="text-amber-400 shrink-0" />
                    <span>{versionInfo.downloadCount}+ Unduhan Aktif</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-300 font-semibold">
                    <Lock size={15} className="text-purple-400 shrink-0" />
                    <span>Enkripsi Akun Cloud Server</span>
                  </div>
                </div>

                {/* Release Notes */}
                {versionInfo.releaseNotes && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
                    <span className="font-black text-amber-400">🆕 Pembaruan v{versionInfo.version}: </span>
                    {versionInfo.releaseNotes}
                  </div>
                )}
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
              Dirancang menyerupai ekosistem Bursa Efek Indonesia (BEI/IDX) dan hukum korporasi nyata,
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
              href="mailto:projek.msyafiq19@gmail.com"
              className="text-slate-400 hover:text-emerald-400 transition flex items-center gap-1.5"
            >
              <span>📧 Layanan &amp; Bug: <strong className="text-slate-200 hover:text-emerald-300">projek.msyafiq19@gmail.com</strong></span>
            </a>
            <span className="text-emerald-400 font-semibold">● Server Online ({versionInfo.apkVersion})</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

