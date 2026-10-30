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
    <div className="h-screen w-screen overflow-hidden flex bg-slate-950 text-slate-100 font-sans relative">
      {/* 1. Backdrop on Mobile when Drawer is Open */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200"
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

      {/* 3. Main Content Wrapper (Full width on mobile!) */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-slate-950/60 w-full">
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
