import { useState, useEffect } from 'react';
import { NAV_ITEMS } from '../../config/navigation';
import { useAdmin } from '../../context/AdminContext';
import { changePct, signedPct } from '../../lib/format';
import { ShieldAlert, Radio, Ban, Clock, LogOut, Menu } from 'lucide-react';

export default function Header({ currentPage, adminUser, onLogout, onToggleMobileSidebar }) {
  const { companies, oversight } = useAdmin();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' WIB'
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentNav = NAV_ITEMS.find((item) => item.id === currentPage) || {
    title: 'Terminal Otoritas Moneter',
    subtitle: 'Pengawasan Pasar Modal & Kebijakan Likuiditas Bank Sentral',
  };

  const topMovers = (companies || []).slice(0, 6);
  const umaCount = oversight?.umaList?.length || 0;
  const suspCount = oversight?.suspensionList?.length || 0;

  return (
    <header className="h-16 shrink-0 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-4 z-20 overflow-hidden">
      {/* Page Title & Breadcrumb + Mobile Hamburger Button */}
      <div className="flex items-center gap-3 min-w-0 shrink">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/90 border border-slate-800 transition cursor-pointer shrink-0"
            title="Buka Menu Navigasi"
          >
            <Menu size={20} />
          </button>
        )}

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-bold text-slate-100 tracking-tight flex items-center gap-2 truncate">
            {currentNav.title}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">{currentNav.subtitle}</p>
        </div>
      </div>

      {/* Right Controls: Ticker + Badges + Clock */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Ticker tape preview (Truncated safely, never pushes badges out) */}
        <div className="hidden xl:flex items-center gap-2.5 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono max-w-[420px] 2xl:max-w-[560px] overflow-hidden whitespace-nowrap">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 shrink-0">
            <Radio size={11} className="text-emerald-400 animate-pulse" />
            BURSA:
          </span>
          <div className="flex items-center gap-3 overflow-hidden text-ellipsis whitespace-nowrap">
            {topMovers.map((c) => {
              const chg = changePct(c);
              const isUp = chg >= 0;
              return (
                <div key={c.id} className="flex items-center gap-1 shrink-0">
                  <span className="font-bold text-slate-200">{c.symbol}</span>
                  <span className="text-slate-400 text-[11px]">
                    {c.current_price?.toLocaleString('id-ID')}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${
                      isUp ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {signedPct(chg, 1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Oversight Quick Status Badges (Never wrap, strictly shrink-0) */}
        <div className="flex items-center gap-2 shrink-0">
          {umaCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold whitespace-nowrap shrink-0 shadow-sm"
              title="Emiten dalam pengawasan Radar UMA"
            >
              <ShieldAlert size={13} className="text-amber-400 animate-pulse shrink-0" />
              <span>{umaCount} UMA</span>
            </div>
          )}

          {suspCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold whitespace-nowrap shrink-0 shadow-sm"
              title="Perdagangan saham dibekukan sementara"
            >
              <Ban size={13} className="text-rose-400 shrink-0" />
              <span>{suspCount} Suspensi</span>
            </div>
          )}

          {/* Live System Time */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono whitespace-nowrap shrink-0">
            <Clock size={12} className="text-slate-400 shrink-0" />
            <span>{timeStr || 'LIVE'}</span>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title={`Keluar (${adminUser?.username || 'Admin'})`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold whitespace-nowrap shrink-0 transition cursor-pointer"
            >
              <LogOut size={12} className="text-rose-400 shrink-0" />
              <span className="hidden md:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
