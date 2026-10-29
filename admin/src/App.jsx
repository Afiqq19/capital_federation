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

function AdminContent({ adminUser, onLogout }) {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
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
      case 'legal':
        return <LegalConstitutionPage />;
      case 'logs':
        return <TransactionsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <AdminLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      adminUser={adminUser}
      onLogout={onLogout}
    >
      {renderPage()}
    </AdminLayout>
  );
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
    if (!remember) {
      sessionStorage.setItem('cf_admin_token', token);
      sessionStorage.setItem('cf_admin_user', JSON.stringify(user));
    }
    setAdminUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('cf_admin_token');
    localStorage.removeItem('cf_admin_user');
    sessionStorage.removeItem('cf_admin_token');
    sessionStorage.removeItem('cf_admin_user');
    setAdminUser(null);
  };

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
