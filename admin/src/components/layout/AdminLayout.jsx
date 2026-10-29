import Sidebar from './Sidebar';
import Header from './Header';
import Toasts from '../ui/Toasts';
import { useAdmin } from '../../context/AdminContext';

export default function AdminLayout({ currentPage, onNavigate, adminUser, onLogout, children }) {
  const { toasts } = useAdmin();

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-100 font-sans">
      {/* 1. Stationary Sidebar (fixed, non-scrolling) */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        adminUser={adminUser}
        onLogout={onLogout}
      />

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-950/60">
        {/* Top Header */}
        <Header currentPage={currentPage} adminUser={adminUser} onLogout={onLogout} />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Floating System Toasts */}
      <Toasts toasts={toasts || []} />
    </div>
  );
}
