import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi } from '../api/admin';
import { socket } from '../lib/socket';
import { ib } from '../lib/format';

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

const EMPTY_BANK = { interest_rate: 0, total_issued: 0, total_outstanding: 0, total_paid: 0, npl_count: 0, active_loans_count: 0, loans: [] };
const EMPTY_OVERSIGHT = { config: { autoEnabled: true, thresholdPct: 15, clearPct: 7 }, umaList: [], suspensionList: [], log: [] };

export function AdminProvider({ children }) {
  const [overview, setOverview] = useState(null);
  const [marketIndex, setMarketIndex] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [bank, setBank] = useState(EMPTY_BANK);
  const [oversight, setOversight] = useState(EMPTY_OVERSIGHT);
  const [transactions, setTransactions] = useState([]);
  const [settings, setSettings] = useState({});
  const [feed, setFeed] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [online, setOnline] = useState(socket.connected);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  // ---------- Notifikasi ----------
  const pushFeed = useCallback((text, type = 'info') => {
    setFeed((prev) => [{ id: `${Date.now()}-${Math.random()}`, text, type, time: new Date().toISOString() }, ...prev].slice(0, 30));
  }, []);

  const notify = useCallback((text, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    pushFeed(text, type);
  }, [pushFeed]);

  // ---------- Pengambilan data (tiap sumber terisolasi: satu gagal tidak merusak yang lain) ----------
  const load = useCallback(async (fetcher, setter, pick = (x) => x) => {
    try {
      const data = await fetcher();
      if (mounted.current && data) setter(pick(data));
    } catch (e) {
      console.warn('Gagal memuat data:', e.message);
    }
  }, []);

  const refreshCompanies = useCallback(() => load(adminApi.companies, setCompanies, (d) => (Array.isArray(d) ? d : [])), [load]);
  const refreshUsers = useCallback(() => load(adminApi.users, setUsers, (d) => (Array.isArray(d) ? d : [])), [load]);
  const refreshBank = useCallback(() => load(adminApi.bankOverview, setBank, (d) => ({ ...EMPTY_BANK, ...d, loans: d.loans || [] })), [load]);
  const refreshOversight = useCallback(() => load(adminApi.oversight, setOversight, (d) => ({ ...EMPTY_OVERSIGHT, ...d })), [load]);
  const refreshOverview = useCallback(() => load(adminApi.overview, setOverview), [load]);
  const refreshMarketIndex = useCallback(() => load(adminApi.marketOverview, setMarketIndex), [load]);
  const refreshTransactions = useCallback(() => load(adminApi.transactions, setTransactions, (d) => (Array.isArray(d) ? d : [])), [load]);
  const refreshSettings = useCallback(() => load(adminApi.settings, setSettings), [load]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshOverview(), refreshMarketIndex(), refreshCompanies(), refreshUsers(), refreshBank(),
      refreshOversight(), refreshTransactions(), refreshSettings(),
    ]);
    if (mounted.current) setLoading(false);
  }, [refreshOverview, refreshMarketIndex, refreshCompanies, refreshUsers, refreshBank, refreshOversight, refreshTransactions, refreshSettings]);

  useEffect(() => {
    mounted.current = true;
    refreshAll();
    const t = setInterval(refreshAll, 30000);
    return () => {
      mounted.current = false;
      clearInterval(t);
    };
  }, [refreshAll]);

  // ---------- Realtime ----------
  useEffect(() => {
    const onConnect = () => setOnline(true);
    const onDisconnect = () => setOnline(false);

    const onTicker = (updated) => {
      if (!Array.isArray(updated)) return;
      const map = new Map(updated.map((c) => [c.id, c]));
      setCompanies((prev) => prev.map((c) => (map.has(c.id) ? { ...c, ...map.get(c.id) } : c)));
    };
    const onTrade = (t) => {
      pushFeed(`💰 ${t.userName} ${t.type} ${t.lots} lot ${t.symbol}`, 'info');
      refreshTransactions();
    };
    const onMacro = (ev) => {
      pushFeed(`📢 Event makro aktif: ${ev.title} (${ev.priceImpactPct > 0 ? '+' : ''}${ev.priceImpactPct}%)`, 'info');
      refreshOverview();
    };
    const onRate = (d) => {
      const rate = d.interestRate ?? d.rate;
      if (rate !== undefined) {
        setBank((b) => ({ ...b, interest_rate: rate }));
        pushFeed(`🏛️ Suku bunga acuan ditetapkan ${rate}% p.a.`, 'info');
      }
    };
    const onStatus = () => { refreshCompanies(); refreshOversight(); };
    const onUma = (d) => {
      pushFeed(d?.uma ? `⚠️ UMA ${d.source === 'AUTO' ? 'otomatis' : 'manual'}: ${d.symbol}` : `✅ UMA dicabut: ${d?.symbol || ''}`, 'info');
      refreshCompanies(); refreshOversight();
    };
    const onNews = (n) => n?.title && pushFeed(n.title, 'info');
    const onIntervention = (d) => { pushFeed(`🏛️ QE: ${d.symbol} disuntik likuiditas`, 'info'); };
    const onSeized = () => { refreshCompanies(); refreshOversight(); refreshOverview(); };
    const onUserUpdate = () => { refreshUsers(); refreshOverview(); };
    const onTreasury = () => { refreshOverview(); refreshBank(); };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('market:ticker', onTicker);
    socket.on('trade:executed', onTrade);
    socket.on('macro:event_triggered', onMacro);
    socket.on('central_bank:rate', onRate);
    socket.on('company:status_changed', onStatus);
    socket.on('market:company_status_changed', onStatus);
    socket.on('company:seized_status', onSeized);
    socket.on('company:uma_changed', onUma);
    socket.on('market:uma_changed', onUma);
    socket.on('user:balance_updated', onUserUpdate);
    socket.on('treasury:updated', onTreasury);
    socket.on('market:breaking_news', onNews);
    socket.on('market:intervention', onIntervention);
    const onMarketOverview = (mkt) => {
      if (mkt) setMarketIndex(mkt);
    };

    socket.on('market:overview', onMarketOverview);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('market:overview', onMarketOverview);
      socket.off('market:ticker', onTicker);
      socket.off('trade:executed', onTrade);
      socket.off('macro:event_triggered', onMacro);
      socket.off('central_bank:rate', onRate);
      socket.off('company:status_changed', onStatus);
      socket.off('market:company_status_changed', onStatus);
      socket.off('company:seized_status', onSeized);
      socket.off('company:uma_changed', onUma);
      socket.off('market:uma_changed', onUma);
      socket.off('user:balance_updated', onUserUpdate);
      socket.off('treasury:updated', onTreasury);
      socket.off('market:breaking_news', onNews);
      socket.off('market:intervention', onIntervention);
    };
  }, [pushFeed, refreshCompanies, refreshOversight, refreshOverview, refreshTransactions, refreshUsers, refreshBank]);

  // ---------- Aksi ----------
  /** Menjalankan aksi API: toast sukses/gagal + refresh data terkait. Mengembalikan true bila berhasil. */
  const run = useCallback(async (fn, { refresh = [] } = {}) => {
    try {
      const res = await fn();
      if (res?.message) notify(res.message, 'success');
      await Promise.all(refresh.map((f) => f()));
      return true;
    } catch (e) {
      notify(e.message, 'error');
      return false;
    }
  }, [notify]);

  const actions = useMemo(() => {
    const oversightRefresh = { refresh: [refreshOversight, refreshCompanies] };
    return {
      flagUma: (companyId, reason, direction) => run(() => adminApi.flagUma(companyId, reason, direction), oversightRefresh),
      clearUma: (companyId) => run(() => adminApi.clearUma(companyId), oversightRefresh),
      suspend: (companyId, untilIso, reason) => run(() => adminApi.suspend(companyId, untilIso, reason), oversightRefresh),
      liftSuspension: (companyId) => run(() => adminApi.liftSuspension(companyId), oversightRefresh),
      saveUmaConfig: (cfg) =>
        run(
          async () => {
            await adminApi.saveSettings({
              uma_auto_enabled: String(cfg.autoEnabled),
              uma_threshold_pct: String(cfg.thresholdPct),
              uma_clear_pct: String(cfg.clearPct),
            });
            return { message: 'Pengaturan UMA otomatis disimpan' };
          },
          { refresh: [refreshOversight] }
        ),
      setRate: (rate) => run(() => adminApi.setRate(rate), { refresh: [refreshBank] }),
      seizeDebtor: (loanId, note) =>
        run(() => adminApi.seizeDebtor(loanId, note), { refresh: [refreshBank, refreshUsers] }),
      liquidityInjection: () => run(() => adminApi.liquidityInjection(), { refresh: [refreshCompanies] }),
      toggleBan: (userId) =>
        run(async () => {
          const r = await adminApi.toggleBan(userId);
          return { message: r.isBanned ? 'Akun pemain dibekukan' : 'Akun pemain dipulihkan' };
        }, { refresh: [refreshUsers] }),
      editUser: (userId, form) =>
        run(async () => {
          await adminApi.editUser(userId, form);
          return { message: 'Data & saldo pemain berhasil disimpan' };
        }, { refresh: [refreshUsers, refreshBank] }),
      deleteUser: (userId) =>
        run(async () => {
          const r = await adminApi.deleteUser(userId);
          return { message: r.message || 'Akun pemain berhasil dihapus permanen' };
        }, { refresh: [refreshUsers, refreshBank, refreshOverview] }),
      setBotStatus: (companyId, status) =>
        run(async () => {
          await adminApi.setBotStatus(companyId, status);
          return { message: `Fundamental emiten diubah menjadi ${status}` };
        }, { refresh: [refreshCompanies] }),
      triggerEvent: (payload) => run(() => adminApi.triggerEvent(payload), { refresh: [refreshOverview, refreshCompanies] }),
      injectNews: (payload) =>
        run(async () => {
          await adminApi.injectNews(payload);
          return { message: 'Berita berhasil disiarkan ke seluruh pemain' };
        }),
      seizeCompany: (companyId, reason) =>
        run(async () => {
          const r = await adminApi.seizeCompany(companyId, reason);
          return { message: r.message || 'Perseroan resmi disita oleh Pengadilan Niaga Federasi' };
        }, { refresh: [refreshCompanies, refreshOverview] }),
      unseizeCompany: (companyId) =>
        run(async () => {
          const r = await adminApi.unseizeCompany(companyId);
          return { message: r.message || 'Status sitaan perseroan berhasil dicabut' };
        }, { refresh: [refreshCompanies, refreshOverview] }),
      convertBumn: (companyId) =>
        run(async () => {
          const r = await adminApi.convertBumn(companyId);
          return { message: r.message || 'Status kepemilikan BUMF Federasi berhasil diperbarui' };
        }, { refresh: [refreshCompanies, refreshOverview] }),
      deleteCompany: (companyId) =>
        run(async () => {
          const r = await adminApi.deleteCompany(companyId);
          return { message: r.message || 'Perusahaan dan seluruh saham investor berhasil dihapus permanen' };
        }, { refresh: [refreshCompanies, refreshOverview, refreshUsers] }),
      rolloverMarket: () =>
        run(async () => {
          const r = await adminApi.rolloverMarket();
          return { message: 'Sesi baru bursa berhasil dibuka! Seluruh batas ARA/ARB telah di-rollover.' };
        }, { refresh: [refreshCompanies, refreshOverview] }),
      saveSettings: (values) =>
        run(async () => {
          await adminApi.saveSettings(values);
          return { message: 'Regulasi berhasil disimpan' };
        }, { refresh: [refreshSettings] }),
    };
  }, [run, refreshOversight, refreshCompanies, refreshBank, refreshUsers, refreshOverview, refreshSettings]);

  const value = {
    overview, marketIndex, companies, users, bank, oversight, transactions, settings, feed, toasts, online, loading,
    refreshAll, notify, actions,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

// util lokal agar import `ib` tidak dianggap tak terpakai oleh linter bila dipakai di masa depan
export const formatIb = ib;
