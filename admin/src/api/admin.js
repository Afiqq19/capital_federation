import { request } from './http';

/** Seluruh pemanggilan endpoint admin di satu tempat. */
export const adminApi = {
  // ---- Autentikasi Otoritas Admin ----
  login: (username, password) => request('/api/admin/auth/login', { method: 'POST', body: { username, password } }),
  verifyMe: () => request('/api/admin/auth/me'),

  // ---- Data ----
  overview: () => request('/api/admin/overview'),
  marketOverview: () => request('/api/market/overview'),
  companies: () => request('/api/admin/companies'),
  users: () => request('/api/admin/users'),
  transactions: () => request('/api/admin/transactions'),
  settings: () => request('/api/admin/settings'),
  saveSettings: (settings) => request('/api/admin/settings', { method: 'PUT', body: { settings } }),

  // ---- Bank Sentral ----
  bankOverview: () => request('/api/admin/bank/overview'),
  setRate: (rate) => request('/api/admin/bank/set-rate', { method: 'POST', body: { rate } }),
  seizeDebtor: (loanId, note) => request('/api/admin/bank/seize-debtor', { method: 'POST', body: { loanId, note } }),

  // ---- Pengawasan Bursa ----
  oversight: () => request('/api/admin/oversight'),
  flagUma: (companyId, reason, direction) => request('/api/admin/uma/flag', { method: 'POST', body: { companyId, reason, direction } }),
  clearUma: (companyId) => request('/api/admin/uma/clear', { method: 'POST', body: { companyId } }),
  suspend: (companyId, until, reason) => request('/api/admin/suspension/apply', { method: 'POST', body: { companyId, until, reason } }),
  liftSuspension: (companyId) => request('/api/admin/suspension/lift', { method: 'POST', body: { companyId } }),
  rolloverMarket: () => request('/api/admin/market/rollover', { method: 'POST' }),
  deleteCompany: (companyId) => request(`/api/admin/companies/${companyId}`, { method: 'DELETE' }),

  // ---- Pemain ----
  toggleBan: (userId) => request(`/api/admin/users/${userId}/ban`, { method: 'POST' }),
  editUser: (userId, form) => request(`/api/admin/users/${userId}/edit`, { method: 'POST', body: form }),
  deleteUser: (userId) => request(`/api/admin/users/${userId}`, { method: 'DELETE' }),

  // ---- Bot & Makro ----
  setBotStatus: (companyId, status) => request(`/api/admin/bots/${companyId}/status`, { method: 'PUT', body: { status } }),
  liquidityInjection: () => request('/api/admin/bank/liquidity-injection', { method: 'POST' }),
  triggerEvent: (payload) => request('/api/admin/events/trigger', { method: 'POST', body: payload }),
  injectNews: (payload) => request('/api/admin/news/inject', { method: 'POST', body: payload }),

  // ---- Pengadilan Niaga Federasi (PNAF) & Makro Federasi ----
  federationMacro: () => request('/api/federation/macro'),
  setFederationMacroState: (state) => request('/api/federation/macro/state', { method: 'POST', body: { economicState: state, state } }),
  courtCases: () => request('/api/court/cases'),
  fileCourtCase: (payload) => request('/api/court/file-case', { method: 'POST', body: payload }),
  issueVerdict: (payload) => request('/api/court/verdict', { method: 'POST', body: payload }),
  courtRoom: (caseId) => request(`/api/court/room/${caseId}`),
  courtRoomVerdict: (payload) => request('/api/court/room/verdict', { method: 'POST', body: payload }),
  scheduleCourtHearing: (caseId, payload) => request(`/api/court/room/${caseId}/schedule`, { method: 'POST', body: payload }),
  sendCourtSummons: (caseId) => request(`/api/court/room/${caseId}/send-summons`, { method: 'POST' }),
  sendCourtMessage: (caseId, payload) => request(`/api/court/room/${caseId}/messages`, { method: 'POST', body: payload }),
  courtAutoJudgeStatus: () => request('/api/court/auto-judge/status'),
  toggleCourtAutoJudge: (enabled) => request('/api/court/auto-judge/toggle', { method: 'POST', body: { enabled } }),
  processCourtAutoJudgeNow: (caseId = null) => request('/api/court/auto-judge/process-now', { method: 'POST', body: { caseId } }),

  // ---- Sita Perusahaan & BUMN ----
  seizeCompany: (companyId, reason) => request(`/api/companies/${companyId}/seize`, { method: 'POST', body: { reason } }),
  unseizeCompany: (companyId) => request(`/api/companies/${companyId}/unseize`, { method: 'POST' }),
  convertBumn: (companyId) => request(`/api/companies/${companyId}/convert-bumn`, { method: 'POST' }),

  // ---- Brankas Kas Negara (Treasury) & Akta Notaris (Deeds) ----
  treasurySummary: () => request('/api/treasury/summary'),
  treasuryLedger: () => request('/api/treasury/ledger'),
  treasuryBailout: (payload) => request('/api/treasury/bailout', { method: 'POST', body: payload }),
  treasuryDistributeDividend: (payload) => request('/api/treasury/distribute-dividend', { method: 'POST', body: payload }),
  treasuryWithdrawFunds: (payload) => request('/api/treasury/withdraw-funds', { method: 'POST', body: payload }),
  allDeeds: () => request('/api/deals/all-deeds'),

  // ---- 4 PILAR KEBIJAKAN EKONOMI STRATEGIS NEGARA ----
  // 1. Surat Utang Negara (Obligasi Pemerintah)
  bondsActive: () => request('/api/bonds/active'),
  bondsOrder: (payload) => request('/api/bonds/order', { method: 'POST', body: payload }),
  bondsIssue: (payload) => request('/api/bonds/admin/issue', { method: 'POST', body: payload }),
  bondsRedeem: (bondId) => request(`/api/bonds/admin/redeem/${bondId}`, { method: 'POST' }),

  // 2. Subsidi & Tax Holiday Sektoral
  subsidiesStatus: () => request('/api/subsidies/status'),
  subsidiesToggle: (payload) => request('/api/subsidies/toggle', { method: 'POST', body: payload }),
  subsidiesBatchSave: (payload) => request('/api/subsidies/batch-save', { method: 'POST', body: payload }),

  // 3. Tender Pengadaan Proyek Pemerintah
  tendersList: () => request('/api/tenders/list'),
  tenderDetail: (tenderId) => request(`/api/tenders/${tenderId}`),
  tendersCreate: (payload) => request('/api/tenders/admin/create', { method: 'POST', body: payload }),
  tendersUpdate: (tenderId, payload) => request(`/api/tenders/admin/${tenderId}`, { method: 'PUT', body: payload }),
  tendersDelete: (tenderId) => request(`/api/tenders/admin/${tenderId}`, { method: 'DELETE' }),
  tendersAward: (payload) => request('/api/tenders/admin/award', { method: 'POST', body: payload }),

  // 4. Pemutihan Utang & Restrukturisasi Bank Sentral
  massPenaltyWaiver: () => request('/api/admin/bank/mass-penalty-waiver', { method: 'POST' }),
  restructureLoan: (payload) => request('/api/admin/bank/restructure-loan', { method: 'POST', body: payload }),
};

