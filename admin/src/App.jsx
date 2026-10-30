import { useState, useEffect } from 'react';
import { AdminProvider } from './context/AdminContext';
import AdminLayout from './components/layout/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { adminApi } from './api/admin';

// Modular Page Imports
import DashboardPage from './pages/dashboard/DashboardPage';
import BankCentralPage from './pages/bank/BankCentralPage';
import CourtOversightPage from './pages/court/CourtOversightPage';
import UmaPage from './pages/oversight/UmaPage';
import SuspensionPage from './pages/oversight/SuspensionPage';
import CompaniesPage from './pages/companies/CompaniesPage';
import UsersPage from './pages/users/UsersPage';
import MacroEventsPage from './pages/macro/MacroEventsPage';
import TransactionsPage from './pages/transactions/TransactionsPage';
import SettingsPage from './pages/settings/SettingsPage';
import DeedRegistryPage from './pages/deeds/DeedRegistryPage';
import TreasuryVaultPage from './pages/treasury/TreasuryVaultPage';
import LegalConstitutionPage from './pages/legal/LegalConstitutionPage';
import SovereignBondsPage from './pages/treasury/SovereignBondsPage';
import SectorSubsidiesPage from './pages/treasury/SectorSubsidiesPage';
import GovernmentTendersPage from './pages/tenders/GovernmentTendersPage';
import ApkManagerPage from './pages/apk/ApkManagerPage';
import PublicDownloadLandingPage from './pages/public/PublicDownloadLandingPage';

const ADMIN_SECRET_KEY = '19122004';

const ROUTE_MAP = {
  dashboard: '/dashboard',
  bank: '/banksentral',
  treasury: '/kas-negara',
  bonds: '/obligasi',
  subsidies: '/subsidi',
  tenders: '/tender',
  court: '/pengadilan',
  uma: '/uma',
  suspension: '/suspensi',
  companies: '/emiten',
  deeds: '/akta',
  users: '/pemain',
  macro: '/krisis-makro',
  apk: '/setting-apk',
  legal: '/konstitusi',
  logs: '/transaksi',
  settings: '/pengaturan',
};

function getPageFromPath(pathname) {
  const clean = (pathname || window.location.pathname || '/').toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!clean || clean === 'dashboard' || clean === 'logincapital') return 'dashboard';
  if (clean === 'banksentral' || clean === 'bank' || clean === 'bank-sentral') return 'bank';
  if (clean === 'kas-negara' || clean === 'treasury' || clean === 'kas') return 'treasury';
  if (clean === 'obligasi' || clean === 'bonds' || clean === 'sbn') return 'bonds';
  if (clean === 'subsidi' || clean === 'subsidies' || clean === 'tax-holiday') return 'subsidies';
  if (clean === 'tender' || clean === 'tenders') return 'tenders';
  if (clean === 'pengadilan' || clean === 'court' || clean === 'pnaf') return 'court';
  if (clean === 'uma') return 'uma';
  if (clean === 'suspensi' || clean === 'suspension') return 'suspension';
  if (clean === 'emiten' || clean === 'companies' || clean === 'saham') return 'companies';
  if (clean === 'akta' || clean === 'deeds' || clean === 'notaris') return 'deeds';
  if (clean === 'pemain' || clean === 'users' || clean === 'investor') return 'users';
  if (clean === 'krisis-makro' || clean === 'macro' || clean === 'berita') return 'macro';
  if (clean === 'setting-apk' || clean === 'rilis-apk' || clean === 'apk' || clean === 'apk-manager') return 'apk';
  if (clean === 'konstitusi' || clean === 'legal') return 'legal';
  if (clean === 'transaksi' || clean === 'logs') return 'logs';
  if (clean === 'pengaturan' || clean === 'settings') return 'settings';
  return 'dashboard';
}

function AdminContent({ adminUser, onLogout }) {
  const [currentPage, setCurrentPageState] = useState(() => getPageFromPath(window.location.pathname));

  const handleNavigate = (page) => {
    setCurrentPageState(page);
    const targetPath = ROUTE_MAP[page] || '/dashboard';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page }, '', targetPath);
    }
  };

  useEffect(() => {
    const onPopState = () => {
      setCurrentPageState(getPageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);

    // Initial path normalization
    const initialPage = getPageFromPath(window.location.pathname);
    const normalizedPath = ROUTE_MAP[initialPage] || '/dashboard';
    const cleanPath = (window.location.pathname || '/').toLowerCase().replace(/^\/+|\/+$/g, '');
    if (cleanPath === 'logincapital' || !cleanPath) {
      window.history.replaceState({ page: initialPage }, '', normalizedPath);
    }

    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'bank':
        return <BankCentralPage />;
      case 'treasury':
        return <TreasuryVaultPage />;
      case 'bonds':
        return <SovereignBondsPage />;
      case 'subsidies':
        return <SectorSubsidiesPage />;
      case 'tenders':
        return <GovernmentTendersPage />;
      case 'court':
        return <CourtOversightPage />;
      case 'uma':
        return <UmaPage />;
      case 'suspension':
        return <SuspensionPage />;
      case 'companies':
        return <CompaniesPage />;
      case 'deeds':
        return <DeedRegistryPage />;
      case 'users':
        return <UsersPage />;
      case 'macro':
        return <MacroEventsPage />;
      case 'apk':
        return <ApkManagerPage />;
      case 'legal':
        return <LegalConstitutionPage />;
      case 'logs':
        return <TransactionsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <AdminLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      adminUser={adminUser}
      onLogout={onLogout}
    >
      {renderPage()}
    </AdminLayout>
  );
}

function checkIsAdminPortalUnlocked() {
  try {
    const pathname = (window.location.pathname || '/').toLowerCase().replace(/^\/+|\/+$/g, '');
    const params = new URLSearchParams(window.location.search || '');
    const key = params.get('key');

    // 1. BLOKIR TOTAL URL '/login' BIASA:
    // Tidak boleh menampilkan form login admin. Alihkan ke '/' (Landing Page)
    if (pathname === 'login') {
      window.history.replaceState({}, '', '/');
      return false;
    }

    // 2. AKSES RAHASIA ADMIN: HANYA DIIZINKAN DENGAN /logincapital?key=19122004
    if (pathname === 'logincapital') {
      if (key === ADMIN_SECRET_KEY) {
        sessionStorage.setItem('cf_admin_portal_unlocked', '1');
        return true;
      }
      // Jika tanpa key atau key salah, jangan beri tahu ada halaman login, langsung alihkan ke '/'
      window.history.replaceState({}, '', '/');
      return false;
    }

    // 3. DAFTAR HALAMAN PUBLIK: Selalu tampilkan Website Landing Page Resmi
    const publicPaths = ['', 'download', 'peringkat', 'tentang', 'fitur', 'spesifikasi'];
    if (publicPaths.includes(pathname) || params.get('preview') === 'public') {
      return false;
    }

    // 4. Jika sesi portal admin sudah dibuka dan pengguna mengakses route admin (/dashboard, /setting-apk, dll)
    if (sessionStorage.getItem('cf_admin_portal_unlocked') === '1') {
      return true;
    }

    const hasToken = Boolean(localStorage.getItem('cf_admin_token') || sessionStorage.getItem('cf_admin_token'));
    if (hasToken) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export default function App() {
  const [adminUser, setAdminUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('cf_admin_user') || sessionStorage.getItem('cf_admin_user');
      const savedToken = localStorage.getItem('cf_admin_token') || sessionStorage.getItem('cf_admin_token');
      if (savedUser && savedToken) {
        return JSON.parse(savedUser);
      }
    } catch {
      /* ignore parse error */
    }
    return null;
  });

  const [portalUnlocked, setPortalUnlocked] = useState(() => checkIsAdminPortalUnlocked());

  useEffect(() => {
    const onUrlChange = () => {
      setPortalUnlocked(checkIsAdminPortalUnlocked());
    };
    window.addEventListener('popstate', onUrlChange);
    return () => window.removeEventListener('popstate', onUrlChange);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('cf_admin_token') || sessionStorage.getItem('cf_admin_token');
    if (!token) return;
    adminApi
      .verifyMe()
      .then((res) => {
        if (res?.user) {
          setAdminUser(res.user);
        }
      })
      .catch((err) => {
        if (String(err?.message || '').includes('401') || String(err?.message || '').includes('403') || String(err?.message || '').includes('Sesi')) {
          localStorage.removeItem('cf_admin_token');
          localStorage.removeItem('cf_admin_user');
          sessionStorage.removeItem('cf_admin_token');
          sessionStorage.removeItem('cf_admin_user');
          setAdminUser(null);
        }
      });
  }, []);

  const handleLoginSuccess = ({ token, user, remember }) => {
    localStorage.setItem('cf_admin_token', token);
    localStorage.setItem('cf_admin_user', JSON.stringify(user));
    sessionStorage.setItem('cf_admin_portal_unlocked', '1');
    if (!remember) {
      sessionStorage.setItem('cf_admin_token', token);
      sessionStorage.setItem('cf_admin_user', JSON.stringify(user));
    }
    window.history.pushState({ page: 'dashboard' }, '', '/dashboard');
    setPortalUnlocked(true);
    setAdminUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('cf_admin_token');
    localStorage.removeItem('cf_admin_user');
    sessionStorage.removeItem('cf_admin_token');
    sessionStorage.removeItem('cf_admin_user');
    sessionStorage.removeItem('cf_admin_portal_unlocked');
    window.history.pushState({}, '', '/');
    setPortalUnlocked(false);
    setAdminUser(null);
  };

  // Tampilkan Website Resmi Download APK jika pengunjung mengakses halaman utama '/' atau belum membuka kunci /logincapital?key=19122004
  if (!portalUnlocked) {
    return (
      <ErrorBoundary>
        <PublicDownloadLandingPage />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {!adminUser ? (
        <AdminLoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <AdminProvider>
          <AdminContent adminUser={adminUser} onLogout={handleLogout} />
        </AdminProvider>
      )}
    </ErrorBoundary>
  );
}
