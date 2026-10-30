import { useState } from 'react';
import {
  RefreshCw,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { NAV_GROUPS } from '../../config/navigation';
import { useAdmin } from '../../context/AdminContext';

export default function Sidebar({ currentPage, onNavigate, adminUser, onLogout, isOpen, onClose }) {
  const { oversight, bank, companies, users, online, refreshAll } = useAdmin();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hitung badge dinamis untuk menu
  const getBadge = (key) => {
    switch (key) {
      case 'uma': {
        const count = oversight?.umaList?.length || 0;
        return count > 0 ? { label: `${count} UMA`, tone: 'amber' } : null;
      }
      case 'suspension': {
        const count = oversight?.suspensionList?.length || 0;
        return count > 0 ? { label: `${count} Beku`, tone: 'rose' } : null;
      }
      case 'rate': {
        const rate = bank?.interest_rate ?? 0;
        return { label: `${rate}%`, tone: 'emerald' };
      }
      case 'companies': {
        const count = companies?.length || 0;
        return count > 0 ? { label: `${count}`, tone: 'slate' } : null;
      }
      case 'users': {
        const count = users?.length || 0;
        return count > 0 ? { label: `${count}`, tone: 'slate' } : null;
      }
      default:
        return null;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAll();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:w-64 xl:w-72 h-screen shrink-0 flex flex-col border-r border-slate-800/80 bg-slate-950/98 backdrop-blur-2xl select-none shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black text-sm tracking-wider">
            CF
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-100 tracking-tight">IPMC TERMINAL</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 font-mono font-semibold border border-amber-400/30">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">Otoritas Moneter & Bursa</p>
          </div>
        </div>

        {/* Tombol Tutup Sidebar di Layar HP (Mobile) */}
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/90 border border-slate-800 transition cursor-pointer"
          title="Tutup Menu Navigasi"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav Groups Menu (Scrollable if viewport is tiny, but stationary relative to layout) */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-500">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              const badge = getBadge(item.badgeKey);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group text-left ${
                    isActive
                      ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30 shadow-sm shadow-amber-400/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isActive
                          ? 'bg-amber-400/20 text-amber-300'
                          : 'bg-slate-900 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800'
                      }`}
                    >
                      <Icon size={15} />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </div>

                  {badge && (
                    <span
                      className={`ml-2 px-1.5 py-0.5 text-[10.5px] font-mono font-bold rounded-md shrink-0 ${
                        badge.tone === 'amber'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : badge.tone === 'rose'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                          : badge.tone === 'emerald'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                      }`}
                    >
                      {badge.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer System Status & Admin Profile */}
      <div className="px-4 py-3.5 border-t border-slate-800/80 bg-slate-950/90 shrink-0 space-y-2.5">
        {adminUser && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck size={14} className="text-sky-400" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-100 truncate">
                  {adminUser.username}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold truncate">
                  Otoritas Admin IPMC
                </div>
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Keluar dari Konsol Admin"
                className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition cursor-pointer shrink-0"
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                online ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-400 text-[11px] font-medium">
              {online ? 'Sistem Terhubung' : 'Terputus (Offline)'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Sinkronisasi Data"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-amber-400' : ''} />
          </button>
        </div>

        <div className="text-[10px] text-slate-500 font-mono truncate">
          v1.4.0-CFX • Bank Sentral BCF & IPMC Exchange
        </div>
      </div>
    </aside>
  );
}
