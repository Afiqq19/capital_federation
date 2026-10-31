import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Toasts from '../ui/Toasts';
import { useAdmin } from '../../context/AdminContext';

export default function AdminLayout({ currentPage, onNavigate, adminUser, onLogout, children }) {
  const { toasts } = useAdmin();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleNavigate = (pageId) => {
    onNavigate(pageId);
    setMobileSidebarOpen(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#060a13] text-slate-100 font-sans relative selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Background Decorative Mesh & Radial Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top-center emerald glow */}
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-emerald-500/12 via-teal-500/5 to-transparent rounded-full blur-[100px]" />
        {/* Top-right violet accent */}
        <div className="absolute top-[-50px] right-[-50px] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
        {/* Bottom-left gold/emerald accent */}
        <div className="absolute -bottom-40 left-10 w-[600px] h-[500px] bg-emerald-600/10 rounded-full blur-[130px]" />
        {/* Subtle technical grid overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-40 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      {/* 1. Backdrop on Mobile when Drawer is Open */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden transition-opacity duration-200"
        />
      )}

      {/* 2. Responsive Sidebar (Off-canvas Drawer on mobile, stationary on desktop) */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        adminUser={adminUser}
        onLogout={onLogout}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* 3. Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-950/40 backdrop-blur-sm w-full z-10 relative">
        {/* Top Header */}
        <Header
          currentPage={currentPage}
          adminUser={adminUser}
          onLogout={onLogout}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-6">
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
