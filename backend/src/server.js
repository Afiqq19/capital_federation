const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { query, initDb, recordCashFlow, syncAllToMariaDb } = require('./db');
const MarketSimulationEngine = require('./engine/simulation');
const SurveillanceService = require('./services/surveillance.service');
const registerAdminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'capital_federation_super_secret_jwt_key_2026';

process.on('uncaughtException', (err) => {
  console.error('Unhandled Exception caught:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Protect against malformed JSON bodies
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Format JSON request tidak valid' });
  }
  next(err);
});

// Simulation Engine Instance
const simulationEngine = new MarketSimulationEngine(io);

// Pengawasan Bursa (UMA & Suspensi) + modul route admin
const surveillance = new SurveillanceService({ query, io, simulationEngine });
registerAdminRoutes(app, { query, io, simulationEngine, surveillance });

// JWT Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token missing' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ----------------------------------------------------
// 1. AUTH & ONBOARDING (MULAI SEBAGAI INVESTOR PEMULA)
// ----------------------------------------------------

// Register (Investor Pemula, Modal Awal Rp 10.000.000 Kas Pribadi)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan kata sandi wajib diisi' });
    }

    const existing = await query.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Modal awal realistis: IB 10.000.000 kas pribadi
    await query.run(
      `INSERT INTO users (id, username, password_hash, balance_ib, company_balance_ib, has_pt, pt_name, sector, pt_level, credit_score, role)
       VALUES (?, ?, ?, 10000000.0, 0.0, 0, '', '', 1, 750, 'PLAYER')`,
      [userId, username, passwordHash]
    );

    const token = jwt.sign({ id: userId, username, role: 'PLAYER' }, JWT_SECRET, { expiresIn: '7d' });
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    delete user.password_hash;

    res.json({
      token,
      user,
      message: 'Selamat datang di Bursa Capital Federation! Modal awal tabungan pribadi IB 10.000.000 telah masuk.'
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Gagal mendaftar' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await query.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Akun Anda telah dibekukan oleh Admin (Anti-Fraud).' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const safeUser = { ...user };
    delete safeUser.password_hash;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Gagal login' });
  }
});

// Current User Profile
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await query.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    delete user.password_hash;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin Console Login (Otoritas Bursa IPMC & Bank Sentral)
app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi' });
    }

    const user = await query.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [String(username).trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Kredensial Admin tidak ditemukan atau password salah' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Username atau password Admin salah' });
    }

    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Akses Ditolak: Akun ini bukan otoritas Administrator Bank Sentral / IPMC' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    const safeUser = { ...user };
    delete safeUser.password_hash;

    res.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Gagal memproses autentikasi Admin' });
  }
});

app.get('/api/admin/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await query.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Sesi Admin tidak valid atau akses ditolak' });
    }
    delete user.password_hash;
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memverifikasi sesi Admin' });
  }
});

// Update User Profile (Username, Email, & Password Baru)
app.post('/api/user/profile/update', async (req, res) => {
  try {
    const { userId, username, email, newPassword } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID wajib disertakan' });

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    const cleanUsername = (username || user.username).trim();
    const cleanEmail = (email !== undefined ? email : (user.email || '')).trim().toLowerCase();

    // Cek keunikan username jika diubah
    if (cleanUsername !== user.username) {
      if (cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Username minimal 3 karakter' });
      }
      const existingUser = await query.get('SELECT id FROM users WHERE username = ? AND id != ?', [cleanUsername, userId]);
      if (existingUser) {
        return res.status(400).json({ error: 'Username sudah digunakan oleh konglomerat lain' });
      }
    }

    // Validasi format email jika diisi
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'Format email tidak valid (contoh: user@federation.id)' });
    }

    await query.run(
      'UPDATE users SET username = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [cleanUsername, cleanEmail, userId]
    );

    // Update password jika pengguna mengisi password baru
    if (newPassword && String(newPassword).trim().length >= 6) {
      const newHash = await bcrypt.hash(String(newPassword).trim(), 10);
      await query.run(
        'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newHash, userId]
      );
    }

    const updatedUser = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    delete updatedUser.password_hash;

    res.json({
      success: true,
      message: 'Profil akun eksekutif berhasil disimpan!',
      user: updatedUser
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Verifikasi Email Resmi Pengguna & Tautan Notariat
app.post('/api/user/email/verify', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID wajib disertakan' });

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

    const targetEmail = (email || user.email || '').trim().toLowerCase();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      return res.status(400).json({ error: 'Format email tidak valid untuk verifikasi' });
    }

    await query.run(
      'UPDATE users SET email = ?, email_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [targetEmail, userId]
    );

    const updated = await query.get('SELECT * FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      email: targetEmail,
      sender: 'projek.msyafiq19@gmail.com',
      verificationToken: `CFX-AUTH-${Date.now()}`,
      verificationLink: `https://capitalfederation.xie.my.id/auth/verify?email=${encodeURIComponent(targetEmail)}&token=CFX-SECURE`,
      message: `Tautan verifikasi telah disahkan! Email ${targetEmail} resmi berstatus Terverifikasi di Otoritas Kustodian IPMC.`,
      user: updated ? {
        id: updated.id,
        username: updated.username,
        hasPt: Boolean(updated.has_pt),
        ptName: updated.pt_name,
        sector: updated.sector,
        balanceIb: updated.balance_ib,
        companyBalanceIb: updated.company_balance_ib,
        email: updated.email,
        emailVerified: true,
        role: updated.role,
        creditTier: updated.credit_tier,
        isIpo: Boolean(updated.is_ipo)
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Pasar & Populasi Menjadi BARU & BERSIH (Fresh Reset Sesuai Permintaan Otoritas)
app.post('/api/admin/system/fresh-reset', async (req, res) => {
  try {
    const secretKey = process.env.DEPLOY_SECRET || '19122004';
    const providedKey = req.query.key || req.body?.key;
    if (providedKey !== secretKey) {
      return res.status(403).json({ error: 'Kunci otorisasi rahasia salah!' });
    }

    const { resetMarketFresh } = require('./seed');
    const result = await resetMarketFresh({ preserveHumanUsers: true });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. PENDIRIAN PT, R&D & PEMISAHAN REKENING (PRIBADI vs PT)
// ----------------------------------------------------

// Cooldown map untuk anti-spam multi-click pendirian PT
const foundCompanyCooldownMap = new Map();

// Mendirikan PT Pertama / Anak Perusahaan Baru (Akta Pendirian Notaris & Pengesahan Kemenkumham/IPMC)
app.post('/api/company/found', async (req, res) => {
  try {
    const { userId, ptName, symbol, sector, description, isSubsidiary, agreedToTerms } = req.body;
    if (!userId || !ptName || !sector) {
      return res.status(400).json({ error: 'Nama PT dan Sektor Industri wajib diisi' });
    }

    // Anti-spam / Cooldown 4 detik untuk mencegah double-click
    const nowTimestamp = Date.now();
    if (foundCompanyCooldownMap.has(userId) && (nowTimestamp - foundCompanyCooldownMap.get(userId) < 4000)) {
      return res.status(429).json({ error: 'Permintaan pendirian PT Anda sedang diverifikasi notaris. Mohon tunggu beberapa saat!' });
    }
    foundCompanyCooldownMap.set(userId, nowTimestamp);

    if (agreedToTerms === false || agreedToTerms === 'false') {
      return res.status(400).json({ error: 'Anda wajib menyetujui Akta Pendirian PT & Kepatuhan Regulasi IPMC!' });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Format nama resmi perseroan dengan titik: PT. [Nama] (Non-Tbk sampai resmi IPO)
    const officialName = formatCorporateName(ptName, false);

    // Validasi Keunikan Nama Perusahaan di Kemenkumham Federasi
    const strippedNewName = officialName.replace(/^PT\.?\s*/i, '').replace(/\s+Tbk\.?$/i, '').trim().toLowerCase();
    const existingCompByName = await query.get(
      `SELECT id, name FROM companies WHERE LOWER(REPLACE(REPLACE(REPLACE(name, 'PT.', ''), 'PT', ''), 'Tbk.', '')) = ?`,
      [strippedNewName]
    ) || await query.get(
      `SELECT id, pt_name as name FROM users WHERE has_pt = 1 AND LOWER(REPLACE(REPLACE(REPLACE(pt_name, 'PT.', ''), 'PT', ''), 'Tbk.', '')) = ?`,
      [strippedNewName]
    );

    if (existingCompByName) {
      return res.status(400).json({
        error: `Nama perseroan "${officialName}" sudah terdaftar resmi di Otoritas Kemenkumham Federasi (${existingCompByName.name}). Silakan gunakan nama PT lain yang unik!`
      });
    }

    // Validasi Kode Singkatan / Ticker Saham (Wajib 4 Huruf Kapital A-Z)
    const cleanSymbol = (symbol || '').trim().toUpperCase();
    if (!cleanSymbol || cleanSymbol.length !== 4 || !/^[A-Z]{4}$/.test(cleanSymbol)) {
      return res.status(400).json({
        error: 'Kode singkatan perseroan (Ticker) wajib tepat 4 huruf kapital (contoh: SYFQ, BBCA, ASII)'
      });
    }

    // Cek keunikan kode ticker di bursa
    const existingComp = await query.get('SELECT id, name FROM companies WHERE symbol = ?', [cleanSymbol]);
    if (existingComp) {
      return res.status(400).json({
        error: `Kode saham/singkatan ${cleanSymbol} sudah digunakan oleh ${existingComp.name}. Silakan gunakan kode 4 huruf unik lainnya!`
      });
    }

    // Validasi kepailitan: Jika ada PT milik pemain yang bangkrut / pailit (<= -50 Juta), dilarang mendirikan PT baru!
    const bankruptComp = await query.get(
      `SELECT name, company_balance_ib FROM companies 
       WHERE owner_id = ? AND (status = 'BANKRUPT' OR is_seized = 1 OR company_balance_ib <= -50000000)`,
      [userId]
    );
    if (bankruptComp || (user.company_balance_ib && user.company_balance_ib <= -50000000)) {
      return res.status(400).json({
        error: `Operasi Ditolak Pengadilan Niaga: Anda memiliki perseroan yang sedang Bangkrut / Pailit (${bankruptComp?.name || 'PT Utama'}). Anda dilarang mendirikan PT baru sebelum menyuntik modal talangan untuk menyelesaikan kepailitan!`
      });
    }

    const cleanDesc = (description || '').trim() || `Perseroan Terbatas resmi sektor ${sector} yang didirikan oleh ${user.username}.`;
    const formattedDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    let establishmentCost = 30000000.0; // Biaya akta notaris & modal disetor
    let initialPtCash = 15000000.0; // Modal awal Kas PT
    try {
      const costRow = await query.get("SELECT value FROM central_bank_settings WHERE key = 'pt_establishment_cost_ib'");
      if (costRow && !isNaN(parseFloat(costRow.value))) establishmentCost = parseFloat(costRow.value);
      const cashRow = await query.get("SELECT value FROM central_bank_settings WHERE key = 'initial_pt_cash_ib'");
      if (cashRow && !isNaN(parseFloat(cashRow.value))) initialPtCash = parseFloat(cashRow.value);
    } catch (_) {}

    // KASUS A: Pengguna sudah punya PT dan ingin mendirikan Anak Perusahaan (Subsidiary PT)
    if (user.has_pt === 1 && (isSubsidiary || req.body.is_subsidiary)) {
      let payFromCompany = false;
      if (user.company_balance_ib >= establishmentCost) {
        payFromCompany = true;
      } else if (user.balance_ib < establishmentCost) {
        return res.status(400).json({
          error: `Saldo tidak mencukupi untuk mendirikan anak perusahaan. Butuh modal IB ${establishmentCost.toLocaleString('id-ID')}`
        });
      }

      if (payFromCompany) {
        await query.run('UPDATE users SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [establishmentCost, userId]);
      } else {
        await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [establishmentCost, userId]);
      }

      const compId = uuidv4();
      await query.run(
        `INSERT INTO companies (id, symbol, name, sector, is_bot, status, current_price, base_price, total_shares, circulating_shares, dividend_rate, fundamental_score, owner_id, is_ipo, listing_status, description, founder_name, founded_at, company_balance_ib, prev_close, daily_high, daily_low, is_acquired, rd_level, marketing_level, hr_level, capacity_level, pt_level)
         VALUES (?, ?, ?, ?, 0, 'HEALTHY', 1000.0, 1000.0, 10000000, 0, 0.04, 75.0, ?, 0, 'UNLISTED', ?, ?, ?, ?, 1000.0, 1050.0, 950.0, 0, 1, 1, 1, 1, 1)`,
        [compId, cleanSymbol, officialName, sector, userId, cleanDesc, `${user.username} (Pendiri Utama)`, formattedDate, initialPtCash]
      );

      await query.run(
        'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), compId, `${user.username} (Pendiri Utama)`, 'FOUNDER', 10000000, 100.0, userId]
      );

      const updatedUser = await query.get('SELECT balance_ib, company_balance_ib FROM users WHERE id = ?', [userId]);
      io.emit('user:balance_updated', { userId, newBalance: updatedUser.balance_ib, companyBalance: updatedUser.company_balance_ib });

      return res.json({
        success: true,
        message: `Selamat! Anak Perusahaan ${officialName} (${cleanSymbol}) resmi didirikan dengan Kas Awal IB 15.000.000!`,
        companyId: compId,
        newPersonalBalance: updatedUser.balance_ib,
        newCompanyBalance: updatedUser.company_balance_ib,
      });
    }

    // KASUS B: Pendirian PT Utama Pertama
    if (user.has_pt === 1) {
      return res.status(400).json({ error: 'Anda sudah memiliki entitas PT Utama aktif! Gunakan fitur Dirikan Anak Perusahaan untuk ekspansi bisnis.' });
    }

    if (user.balance_ib < establishmentCost) {
      return res.status(400).json({
        error: `Saldo tabungan pribadi tidak cukup. Biaya pendirian PT & modal awal: IB ${establishmentCost.toLocaleString('id-ID')}`
      });
    }

    // Potong tabungan pribadi, beri modal kerja awal ke Kas PT sebesar IB 15.000.000
    await query.run(
      `UPDATE users
       SET balance_ib = balance_ib - ?,
           company_balance_ib = ?,
           has_pt = 1,
           pt_name = ?,
           sector = ?,
           pt_symbol = ?,
           pt_description = ?,
           pt_founded_at = ?,
           pt_founder_name = ?,
           pt_level = 1,
           rd_level = 1,
           fundamental_score = 75.0
       WHERE id = ?`,
      [establishmentCost, initialPtCash, officialName, sector, cleanSymbol, cleanDesc, formattedDate, user.username, userId]
    );

    const compId = uuidv4();
    await query.run(
      `INSERT INTO companies (id, symbol, name, sector, is_bot, status, current_price, base_price, total_shares, circulating_shares, dividend_rate, fundamental_score, owner_id, is_ipo, listing_status, description, founder_name, founded_at, company_balance_ib, prev_close, daily_high, daily_low)
       VALUES (?, ?, ?, ?, 0, 'HEALTHY', 1000.0, 1000.0, 10000000, 0, 0.04, 75.0, ?, 0, 'UNLISTED', ?, ?, ?, ?, 1000.0, 1050.0, 950.0)`,
      [compId, cleanSymbol, officialName, sector, userId, cleanDesc, `${user.username} (Pendiri Utama)`, formattedDate, initialPtCash]
    );

    await query.run(
      'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), compId, `${user.username} (Pendiri Utama)`, 'FOUNDER', 10000000, 100.0, userId]
    );

    const updatedUser = await query.get('SELECT balance_ib, company_balance_ib FROM users WHERE id = ?', [userId]);
    io.emit('user:balance_updated', { userId, newBalance: updatedUser.balance_ib, companyBalance: updatedUser.company_balance_ib });

    res.json({
      success: true,
      message: `Selamat! ${officialName} (${cleanSymbol}) resmi disahkan oleh Notaris & IPMC dengan kas awal IB 15.000.000!`,
      newPersonalBalance: updatedUser.balance_ib,
      newCompanyBalance: 15000000.0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Suntik Modal Investasi (Kas Pribadi -> Kas Perusahaan)
app.post('/api/company/fund', async (req, res) => {
  try {
    const { userId, amount, companyId } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'Jumlah transfer tidak valid' });

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (user.balance_ib < numAmount) {
      return res.status(400).json({ error: 'Saldo kas pribadi tidak mencukupi untuk suntik modal' });
    }

    if (companyId && companyId !== 'primary') {
      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [numAmount, userId]);
      await query.run('UPDATE companies SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?', [numAmount, companyId]);

      const updatedComp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      const updatedUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [userId]);

      await recordCashFlow({
        userId,
        companyId,
        accountType: 'PERSONAL',
        category: 'CAPITAL_INJECTION',
        title: `Suntik Modal ke ${comp.name}`,
        amountIb: numAmount,
        direction: 'EXPENSE',
        balanceAfter: updatedUser.balance_ib,
        notes: `Injeksi modal dari Kas Pribadi untuk operasional ${comp.name}`
      });
      await recordCashFlow({
        userId,
        companyId,
        accountType: 'COMPANY',
        category: 'CAPITAL_INJECTION',
        title: `Penerimaan Modal Disetor dari Pemilik`,
        amountIb: numAmount,
        direction: 'INCOME',
        balanceAfter: updatedComp.company_balance_ib,
        notes: `Injeksi modal kerja tambahan dari ${user.username}`
      });

      let rescued = false;
      if (updatedComp && (updatedComp.is_seized === 1 || updatedComp.status === 'BANKRUPT') && (updatedComp.seize_reason || '').toUpperCase().includes('PAILIT') && (updatedComp.company_balance_ib || 0) > -50000000) {
        await query.run(`
          UPDATE companies 
          SET is_seized = 0, 
              status = 'HEALTHY', 
              seized_by = NULL, 
              seize_reason = NULL, 
              seized_at = NULL 
          WHERE id = ?
        `, [companyId]);
        rescued = true;

        await query.run(`
          INSERT INTO news (id, title, content, affected_sector, sentiment, impact_multiplier, published_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          uuidv4(),
          `🚑 RESTRUKTURISASI SUKSES: ${updatedComp.name} Bangkit dari Kepailitan!`,
          `Setelah menerima suntikan modal talangan penyelamatan baru, Kepaniteraan Niaga resmi mencabut status pailit ${updatedComp.name}. Anak perusahaan resmi kembali beroperasi secara normal.`,
          updatedComp.sector || 'GENERAL',
          'POSITIVE',
          1.2
        ]);
      }

      io.emit('user:balance_updated', { userId, newBalance: updatedUser.balance_ib, companyBalance: updatedComp.company_balance_ib });

      return res.json({
        success: true,
        message: rescued
          ? `Selamat! Suntikan modal IB ${numAmount.toLocaleString('id-ID')} berhasil menyelamatkan ${comp.name} dari kepailitan! Perusahaan kembali beroperasi normal.`
          : `Berhasil menyuntikkan modal IB ${numAmount.toLocaleString('id-ID')} ke Kas ${comp.name}!`,
        newPersonalBalance: updatedUser.balance_ib,
        newCompanyBalance: updatedComp.company_balance_ib,
        rescued,
      });
    } else {
      if (!user.has_pt) return res.status(400).json({ error: 'Anda belum mendirikan PT' });

      const primaryComp = await query.get('SELECT * FROM companies WHERE owner_id = ? AND is_bot = 0', [userId]);

      await query.run(
        'UPDATE users SET balance_ib = balance_ib - ?, company_balance_ib = company_balance_ib + ? WHERE id = ?',
        [numAmount, numAmount, userId]
      );
      if (primaryComp) {
        await query.run('UPDATE companies SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?', [numAmount, primaryComp.id]);
      }

      const updatedUser = await query.get('SELECT balance_ib, company_balance_ib FROM users WHERE id = ?', [userId]);
      const updatedComp = primaryComp ? await query.get('SELECT * FROM companies WHERE id = ?', [primaryComp.id]) : null;

      await recordCashFlow({
        userId,
        companyId: primaryComp?.id || null,
        accountType: 'PERSONAL',
        category: 'CAPITAL_INJECTION',
        title: `Suntik Modal ke PT ${user.pt_name}`,
        amountIb: numAmount,
        direction: 'EXPENSE',
        balanceAfter: updatedUser.balance_ib,
        notes: `Injeksi modal tunai dari tabungan pribadi ke Kas PT Utama`
      });
      await recordCashFlow({
        userId,
        companyId: primaryComp?.id || null,
        accountType: 'COMPANY',
        category: 'CAPITAL_INJECTION',
        title: `Penerimaan Modal Disetor dari Pendiri`,
        amountIb: numAmount,
        direction: 'INCOME',
        balanceAfter: updatedUser.company_balance_ib,
        notes: `Injeksi modal kerja tambahan masuk ke Kas PT Utama`
      });

      let rescued = false;
      if (updatedComp && (updatedComp.is_seized === 1 || updatedComp.status === 'BANKRUPT') && (updatedComp.seize_reason || '').toUpperCase().includes('PAILIT') && updatedUser.company_balance_ib > -50000000) {
        await query.run(`
          UPDATE companies 
          SET is_seized = 0, 
              status = 'HEALTHY', 
              seized_by = NULL, 
              seize_reason = NULL, 
              seized_at = NULL 
          WHERE id = ?
        `, [primaryComp.id]);
        rescued = true;

        await query.run(`
          INSERT INTO news (id, title, content, affected_sector, sentiment, impact_multiplier, published_at)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          uuidv4(),
          `🚑 RESTRUKTURISASI SUKSES: PT ${user.pt_name} Bangkit dari Kepailitan!`,
          `Setelah menerima suntikan modal talangan dari pendiri perseroan, Kepaniteraan Niaga resmi mencabut status pailit PT ${user.pt_name}. Operasional perseroan dibuka kembali secara normal.`,
          user.sector || 'GENERAL',
          'POSITIVE',
          1.2
        ]);
      }

      io.emit('user:balance_updated', { userId, newBalance: updatedUser.balance_ib, companyBalance: updatedUser.company_balance_ib });

      return res.json({
        success: true,
        message: rescued
          ? `Selamat! Suntikan modal IB ${numAmount.toLocaleString('id-ID')} berhasil menyelamatkan PT ${user.pt_name} dari kepailitan! Operasional perseroan kembali normal.`
          : `Berhasil menyuntikkan modal IB ${numAmount.toLocaleString('id-ID')} ke Kas PT ${user.pt_name}!`,
        newPersonalBalance: updatedUser.balance_ib,
        newCompanyBalance: updatedUser.company_balance_ib,
        rescued,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tarik Dividen / Prive (Kas Perusahaan -> Kas Pribadi)
app.post('/api/company/withdraw', async (req, res) => {
  try {
    const { userId, amount, companyId } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'Jumlah penarikan tidak valid' });

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (companyId && companyId !== 'primary') {
      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      if (comp.is_seized === 1) {
        return res.status(403).json({ error: `Perusahaan ${comp.name} sedang DISITA oleh Negara/PNAF! Seluruh penarikan kas dibekukan.` });
      }

      const currentBalance = comp.company_balance_ib || 0;
      if (currentBalance < numAmount) {
        return res.status(400).json({ error: 'Saldo kas perusahaan tidak mencukupi untuk penarikan dividen' });
      }

      await query.run('UPDATE companies SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [numAmount, companyId]);
      await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [numAmount, userId]);

      const updatedComp = await query.get('SELECT company_balance_ib FROM companies WHERE id = ?', [companyId]);
      const updatedUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [userId]);

      await recordCashFlow({
        userId,
        companyId,
        accountType: 'COMPANY',
        category: 'DIVIDEND_WITHDRAW',
        title: `Penarikan Dividen / Prive dari ${comp.name}`,
        amountIb: numAmount,
        direction: 'EXPENSE',
        balanceAfter: updatedComp.company_balance_ib,
        notes: `Dividen ditarik oleh pemilik ke rekening pribadi`
      });
      await recordCashFlow({
        userId,
        companyId,
        accountType: 'PERSONAL',
        category: 'DIVIDEND_INCOME',
        title: `Penerimaan Dividen dari ${comp.name}`,
        amountIb: numAmount,
        direction: 'INCOME',
        balanceAfter: updatedUser.balance_ib,
        notes: `Hasil penarikan keuntungan anak perusahaan ${comp.name}`
      });

      io.emit('user:balance_updated', { userId, newBalance: updatedUser.balance_ib, companyBalance: updatedComp.company_balance_ib });

      return res.json({
        success: true,
        message: `Berhasil menarik dividen IB ${numAmount.toLocaleString('id-ID')} dari ${comp.name} ke kas pribadi!`,
        newPersonalBalance: updatedUser.balance_ib,
        newCompanyBalance: updatedComp.company_balance_ib,
      });
    } else {
      if (!user.has_pt) return res.status(400).json({ error: 'Anda belum mendirikan PT' });
      const primaryComp = await query.get('SELECT is_seized, name FROM companies WHERE owner_id = ? AND is_bot = 0', [userId]);
      if (primaryComp && primaryComp.is_seized === 1) {
        return res.status(403).json({ error: `PT Utama ${primaryComp.name} sedang DISITA oleh Negara/PNAF! Seluruh penarikan kas dibekukan.` });
      }
      if (user.company_balance_ib < numAmount) {
        return res.status(400).json({ error: 'Saldo kas perusahaan tidak mencukupi untuk penarikan' });
      }

      await query.run(
        'UPDATE users SET company_balance_ib = company_balance_ib - ?, balance_ib = balance_ib + ? WHERE id = ?',
        [numAmount, numAmount, userId]
      );
      if (user.is_ipo === 1) {
        await query.run('UPDATE companies SET company_balance_ib = MAX(0, COALESCE(company_balance_ib, 0) - ?) WHERE owner_id = ? AND is_bot = 0', [numAmount, userId]);
      }

      const updatedUser = await query.get('SELECT balance_ib, company_balance_ib FROM users WHERE id = ?', [userId]);

      await recordCashFlow({
        userId,
        companyId: primaryComp?.id || null,
        accountType: 'COMPANY',
        category: 'DIVIDEND_WITHDRAW',
        title: `Penarikan Dividen / Prive PT ${user.pt_name}`,
        amountIb: numAmount,
        direction: 'EXPENSE',
        balanceAfter: updatedUser.company_balance_ib,
        notes: `Dividen ditarik oleh pendiri ke rekening pribadi`
      });
      await recordCashFlow({
        userId,
        companyId: primaryComp?.id || null,
        accountType: 'PERSONAL',
        category: 'DIVIDEND_INCOME',
        title: `Penerimaan Dividen PT ${user.pt_name}`,
        amountIb: numAmount,
        direction: 'INCOME',
        balanceAfter: updatedUser.balance_ib,
        notes: `Hasil penarikan keuntungan kas PT Utama`
      });

      io.emit('user:balance_updated', { userId, newBalance: updatedUser.balance_ib, companyBalance: updatedUser.company_balance_ib });

      return res.json({
        success: true,
        message: `Berhasil menarik dividen IB ${numAmount.toLocaleString('id-ID')} ke rekening pribadi!`,
        newPersonalBalance: updatedUser.balance_ib,
        newCompanyBalance: updatedUser.company_balance_ib,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upgrade Bisnis & R&D (Biaya dipotong dari Kas Perusahaan)
app.post('/api/company/upgrade', async (req, res) => {
  try {
    const { userId, type, companyId } = req.body;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let col = '';
    if (type === 'rd') col = 'rd_level';
    else if (type === 'marketing') col = 'marketing_level';
    else if (type === 'hr') col = 'hr_level';
    else if (type === 'capacity') col = 'capacity_level';
    else return res.status(400).json({ error: 'Tipe upgrade tidak valid' });

    const isPrimary = !companyId || companyId === 'primary';

    if (isPrimary) {
      if (!user.has_pt) return res.status(400).json({ error: 'Harap dirikan PT terlebih dahulu' });
      const currentLvl = user[col] || 1;
      const cost = 5000000 * currentLvl;
      if (user.company_balance_ib < cost) {
        return res.status(400).json({
          error: `Saldo Kas Perusahaan tidak cukup. Butuh IB ${cost.toLocaleString('id-ID')}. Anda bisa suntik modal dari tabungan pribadi.`
        });
      }

      const nextLvl = currentLvl + 1;
      const currentRd = col === 'rd_level' ? nextLvl : (user.rd_level || 1);
      const currentMkt = col === 'marketing_level' ? nextLvl : (user.marketing_level || 1);
      const currentHr = col === 'hr_level' ? nextLvl : (user.hr_level || 1);
      const currentCap = col === 'capacity_level' ? nextLvl : (user.capacity_level || 1);
      const nextPtLvl = Math.floor((currentRd + currentMkt + currentHr + currentCap + 1) / 4) + 1;
      const boostFundamental = Math.min(100.0, user.fundamental_score + 6.0);

      await query.run(
        `UPDATE users
         SET company_balance_ib = company_balance_ib - ?, ${col} = ?, pt_level = ?, fundamental_score = ?
         WHERE id = ?`,
        [cost, nextLvl, nextPtLvl, boostFundamental, userId]
      );

      await recordCashFlow({
        userId,
        accountType: 'COMPANY',
        category: 'CAPEX_UPGRADE',
        title: `Belanja Modal Upgrade ${type.toUpperCase()} Lvl ${nextLvl}`,
        amountIb: cost,
        direction: 'EXPENSE',
        balanceAfter: user.company_balance_ib - cost,
        notes: `Investasi pengembangan divisi ${type.toUpperCase()} PT Utama ke level ${nextLvl}`
      });

      io.emit('user:balance_updated', { userId, newBalance: user.balance_ib, companyBalance: user.company_balance_ib - cost });

      return res.json({
        success: true,
        message: `Upgrade ${type.toUpperCase()} ke level ${nextLvl} berhasil! Pendapatan pasif PT meningkat.`,
        newPtLevel: nextPtLvl,
        newCompanyBalance: user.company_balance_ib - cost,
      });
    } else {
      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      // Verifikasi kepemilikan (owner_id atau portofolio >= 50%)
      const port = await query.get('SELECT lots_owned FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, companyId]);
      const ownsMajority = comp.owner_id === userId || (port && (port.lots_owned * 100.0 / comp.total_shares) >= 50.0);
      if (!ownsMajority) {
        return res.status(403).json({ error: 'Anda bukan pemilik mayoritas perusahaan ini' });
      }

      const currentLvl = comp[col] || 1;
      const cost = 5000000 * currentLvl;
      const currentBalance = comp.company_balance_ib || 0;
      if (currentBalance < cost) {
        return res.status(400).json({
          error: `Saldo Kas ${comp.name} tidak cukup. Butuh IB ${cost.toLocaleString('id-ID')}. Kas saat ini: IB ${currentBalance.toLocaleString('id-ID')}. Silakan suntik modal terlebih dahulu.`
        });
      }

      const nextLvl = currentLvl + 1;
      const currentRd = col === 'rd_level' ? nextLvl : (comp.rd_level || 1);
      const currentMkt = col === 'marketing_level' ? nextLvl : (comp.marketing_level || 1);
      const currentHr = col === 'hr_level' ? nextLvl : (comp.hr_level || 1);
      const currentCap = col === 'capacity_level' ? nextLvl : (comp.capacity_level || 1);
      const nextPtLvl = Math.floor((currentRd + currentMkt + currentHr + currentCap + 1) / 4) + 1;
      const boostFundamental = Math.min(100.0, (comp.fundamental_score || 70.0) + 4.0);
      const newBalance = currentBalance - cost;

      await query.run(
        `UPDATE companies
         SET company_balance_ib = ?, ${col} = ?, pt_level = ?, operational_level = ?, fundamental_score = ?
         WHERE id = ?`,
        [newBalance, nextLvl, nextPtLvl, nextPtLvl, boostFundamental, companyId]
      );

      await recordCashFlow({
        userId,
        companyId,
        accountType: 'COMPANY',
        category: 'CAPEX_UPGRADE',
        title: `Belanja Modal ${comp.symbol} Upgrade ${type.toUpperCase()} Lvl ${nextLvl}`,
        amountIb: cost,
        direction: 'EXPENSE',
        balanceAfter: newBalance,
        notes: `Investasi pengembangan divisi ${type.toUpperCase()} ${comp.name} ke level ${nextLvl}`
      });

      io.emit('user:balance_updated', { userId, newBalance: user.balance_ib, companyBalance: newBalance });

      return res.json({
        success: true,
        message: `Upgrade ${type.toUpperCase()} pada ${comp.name} ke level ${nextLvl} berhasil!`,
        newPtLevel: nextPtLvl,
        newCompanyBalance: newBalance,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rekrut Karyawan & Angkat Direksi (CEO, CFO, CMO)
app.post('/api/company/staff/hire', async (req, res) => {
  try {
    const { userId, type, companyId } = req.body;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // If hiring for an acquired company in conglomerate
    if (companyId && companyId !== 'primary') {
      const comp = await query.get('SELECT * FROM companies WHERE id = ? AND owner_id = ?', [companyId, userId]);
      if (!comp) return res.status(403).json({ error: 'Anda bukan pemegang kendali emiten ini' });

      let cost = 0;
      let updateSql = '';
      let successMsg = '';

      if (type === 'staff') {
        cost = 5000000;
        if ((comp.company_balance_ib || 0) < cost) {
          return res.status(400).json({ error: `Kas emiten tidak cukup. Butuh IB ${cost.toLocaleString('id-ID')}.` });
        }
        updateSql = 'UPDATE companies SET company_balance_ib = company_balance_ib - ?, employees_count = COALESCE(employees_count, 10) + 5 WHERE id = ?';
        successMsg = `🎉 Berhasil merekrut 5 Staf Operasional untuk ${comp.name}!`;
      } else if (type === 'ceo') {
        cost = 25000000;
        if (comp.ceo_level > 0) return res.status(400).json({ error: 'Emiten ini sudah memiliki CEO' });
        if ((comp.company_balance_ib || 0) < cost) {
          return res.status(400).json({ error: `Kas emiten tidak cukup. Butuh IB ${cost.toLocaleString('id-ID')}.` });
        }
        updateSql = 'UPDATE companies SET company_balance_ib = company_balance_ib - ?, ceo_level = 1, fundamental_score = MIN(100, fundamental_score + 15) WHERE id = ?';
        successMsg = `👔 Berhasil mengangkat CEO untuk ${comp.name}!`;
      } else if (type === 'cfo') {
        cost = 15000000;
        if (comp.cfo_level > 0) return res.status(400).json({ error: 'Emiten ini sudah memiliki CFO' });
        if ((comp.company_balance_ib || 0) < cost) {
          return res.status(400).json({ error: `Kas emiten tidak cukup. Butuh IB ${cost.toLocaleString('id-ID')}.` });
        }
        updateSql = 'UPDATE companies SET company_balance_ib = company_balance_ib - ?, cfo_level = 1 WHERE id = ?';
        successMsg = `📊 Berhasil mengangkat CFO untuk ${comp.name}!`;
      } else if (type === 'cmo') {
        cost = 15000000;
        if (comp.cmo_level > 0) return res.status(400).json({ error: 'Emiten ini sudah memiliki CMO' });
        if ((comp.company_balance_ib || 0) < cost) {
          return res.status(400).json({ error: `Kas emiten tidak cukup. Butuh IB ${cost.toLocaleString('id-ID')}.` });
        }
        updateSql = 'UPDATE companies SET company_balance_ib = company_balance_ib - ?, cmo_level = 1 WHERE id = ?';
        successMsg = `📢 Berhasil mengangkat CMO untuk ${comp.name}!`;
      } else {
        return res.status(400).json({ error: 'Tipe rekrutmen tidak valid' });
      }

      await query.run(updateSql, [cost, companyId]);
      const updated = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      return res.json({
        success: true,
        message: successMsg,
        employeesCount: updated.employees_count,
        ceoLevel: updated.ceo_level,
        cfoLevel: updated.cfo_level,
        cmoLevel: updated.cmo_level,
        newCompanyBalance: updated.company_balance_ib
      });
    }

    if (!user.has_pt) return res.status(400).json({ error: 'Harap dirikan PT terlebih dahulu' });

    let cost = 0;
    let updateSql = '';
    let updateParams = [];
    let successMsg = '';

    if (type === 'staff') {
      cost = 5000000; // IB 5 Juta untuk 5 Staf Operasional
      if (user.company_balance_ib < cost) {
        return res.status(400).json({ error: `Saldo Kas PT tidak mencukupi. Butuh IB ${cost.toLocaleString('id-ID')} untuk merekrut 5 Staf Operasional.` });
      }
      updateSql = 'UPDATE users SET company_balance_ib = company_balance_ib - ?, employees_count = COALESCE(employees_count, 0) + 5 WHERE id = ?';
      updateParams = [cost, userId];
      successMsg = '🎉 Berhasil merekrut 5 Staf Operasional baru! Kapasitas produksi dan penjualan bertambah.';
    } else if (type === 'ceo') {
      cost = 25000000; // IB 25 Juta
      if (user.ceo_level > 0) return res.status(400).json({ error: 'Perusahaan Anda sudah memiliki Direktur Utama (CEO)' });
      if (user.company_balance_ib < cost) {
        return res.status(400).json({ error: `Saldo Kas PT tidak mencukupi. Butuh IB ${cost.toLocaleString('id-ID')} untuk mengangkat CEO.` });
      }
      updateSql = 'UPDATE users SET company_balance_ib = company_balance_ib - ?, ceo_level = 1, fundamental_score = MIN(100, fundamental_score + 15) WHERE id = ?';
      updateParams = [cost, userId];
      successMsg = '👔 Berhasil mengangkat CEO Profesional! Omzet meningkat 30% dan skor fundamental naik +15 poin.';
    } else if (type === 'cfo') {
      cost = 15000000; // IB 15 Juta
      if (user.cfo_level > 0) return res.status(400).json({ error: 'Perusahaan Anda sudah memiliki Direktur Keuangan (CFO)' });
      if (user.company_balance_ib < cost) {
        return res.status(400).json({ error: `Saldo Kas PT tidak mencukupi. Butuh IB ${cost.toLocaleString('id-ID')} untuk mengangkat CFO.` });
      }
      updateSql = 'UPDATE users SET company_balance_ib = company_balance_ib - ?, cfo_level = 1 WHERE id = ?';
      updateParams = [cost, userId];
      successMsg = '📊 Berhasil mengangkat CFO Profesional! Pengelolaan keuangan lebih efisien dan beban operasional hemat 25%.';
    } else if (type === 'cmo') {
      cost = 15000000; // IB 15 Juta
      if (user.cmo_level > 0) return res.status(400).json({ error: 'Perusahaan Anda sudah memiliki Direktur Pemasaran (CMO)' });
      if (user.company_balance_ib < cost) {
        return res.status(400).json({ error: `Saldo Kas PT tidak mencukupi. Butuh IB ${cost.toLocaleString('id-ID')} untuk mengangkat CMO.` });
      }
      updateSql = 'UPDATE users SET company_balance_ib = company_balance_ib - ?, cmo_level = 1 WHERE id = ?';
      updateParams = [cost, userId];
      successMsg = '📢 Berhasil mengangkat CMO Profesional! Kampanye pemasaran masif mendongkrak omzet penjualan 35%.';
    } else {
      return res.status(400).json({ error: 'Tipe rekrutmen tidak valid' });
    }

    await query.run(updateSql, updateParams);
    const updated = await query.get('SELECT * FROM users WHERE id = ?', [userId]);

    io.emit('user:balance_updated', { userId, newBalance: updated.balance_ib, companyBalance: updated.company_balance_ib });

    res.json({
      success: true,
      message: successMsg,
      employeesCount: updated.employees_count,
      ceoLevel: updated.ceo_level,
      cfoLevel: updated.cfo_level,
      cmoLevel: updated.cmo_level,
      newCompanyBalance: updated.company_balance_ib
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to ensure official Indonesian corporate naming with PT. (with dot) and Tbk. for public companies
function formatCorporateName(rawName, isIpo = false) {
  let clean = (rawName || '').trim();
  // Strip any existing PT, PT., PT . with or without dot
  clean = clean.replace(/^PT\.?\s*/i, '').trim();
  // Strip existing Tbk or Tbk.
  clean = clean.replace(/\s+Tbk\.?$/i, '').trim();
  // Always prepend PT. with dot
  clean = `PT. ${clean}`;
  return isIpo ? `${clean} Tbk.` : clean;
}

// Helper to get or generate shareholder registry (Cap Table)
async function getCompanyShareholders(companyId, ownerUser, compData) {
  let rows = await query.all(
    'SELECT * FROM company_shareholders WHERE company_id = ? ORDER BY percentage DESC',
    [companyId]
  );
  if (rows && rows.length > 0) {
    const isPrimary = (companyId === 'primary' || compData?.owner_id === ownerUser?.id);
    const founderSold = compData?.founder_shares_sold || ownerUser?.founder_shares_sold || 0;
    const expectedFounderPct = isPrimary
      ? Math.max(0, 100.0 - ((compData?.is_ipo || ownerUser?.is_ipo) ? (30.0 + founderSold) : founderSold))
      : (compData?.ownership_pct || 100.0);

    const founderRow = rows.find(r => r.holder_type === 'FOUNDER' || (ownerUser && r.user_id === ownerUser.id));
    if (founderRow && Math.abs(founderRow.percentage - expectedFounderPct) > 0.05) {
      const diff = parseFloat((founderRow.percentage - expectedFounderPct).toFixed(1));
      founderRow.percentage = parseFloat(expectedFounderPct.toFixed(1));
      founderRow.shares_count = Math.round((compData?.total_shares || 10000000) * (expectedFounderPct / 100.0));
      await query.run('UPDATE company_shareholders SET percentage = ?, shares_count = ? WHERE id = ?', [founderRow.percentage, founderRow.shares_count, founderRow.id]);

      const pubRow = rows.find(r => r.holder_type === 'PUBLIC');
      if (pubRow) {
        pubRow.percentage = parseFloat((pubRow.percentage + diff).toFixed(1));
        pubRow.shares_count = Math.round((compData?.total_shares || 10000000) * (pubRow.percentage / 100.0));
        await query.run('UPDATE company_shareholders SET percentage = ?, shares_count = ? WHERE id = ?', [pubRow.percentage, pubRow.shares_count, pubRow.id]);
      }
    }
    return rows;
  }

  const totalShares = compData.total_shares || 10000000;
  const isPrimary = (companyId === 'primary' || compData.owner_id === ownerUser?.id);
  const founderSold = compData.founder_shares_sold || 0;
  const founderPct = isPrimary
    ? Math.max(0, 100.0 - (compData.is_ipo ? (30.0 + founderSold) : founderSold))
    : (compData.ownership_pct || 51.0);
  const remainingPct = Math.max(0, 100.0 - founderPct);

  const list = [];
  if (founderPct > 0) {
    list.push({
      id: uuidv4(),
      company_id: companyId,
      holder_name: `${ownerUser ? ownerUser.username : 'Pendiri Utama'} (Pendiri & Pengendali)`,
      holder_type: 'FOUNDER',
      shares_count: Math.round(totalShares * (founderPct / 100.0)),
      percentage: parseFloat(founderPct.toFixed(1)),
      user_id: ownerUser?.id
    });
  }

  if (remainingPct > 0) {
    const inst1 = parseFloat((remainingPct * 0.50).toFixed(1));
    const inst2 = parseFloat((remainingPct * 0.30).toFixed(1));
    const pub = parseFloat((remainingPct - inst1 - inst2).toFixed(1));

    list.push({
      id: uuidv4(),
      company_id: companyId,
      holder_name: 'Konsorsium Astra Investama',
      holder_type: 'INSTITUTION',
      shares_count: Math.round(totalShares * (inst1 / 100.0)),
      percentage: inst1
    });
    list.push({
      id: uuidv4(),
      company_id: companyId,
      holder_name: 'Dana Pensiun Mandiri Investama',
      holder_type: 'INSTITUTION',
      shares_count: Math.round(totalShares * (inst2 / 100.0)),
      percentage: inst2
    });
    list.push({
      id: uuidv4(),
      company_id: companyId,
      holder_name: 'Publik Ritel (Bursa Efek)',
      holder_type: 'PUBLIC',
      shares_count: Math.round(totalShares * (pub / 100.0)),
      percentage: pub
    });
  }

  for (const s of list) {
    await query.run(
      'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [s.id, s.company_id, s.holder_name, s.holder_type, s.shares_count, s.percentage, s.user_id || null]
    );
  }

  return list;
}

// ----------------------------------------------------
// FORMULIR PENDAFTARAN IPO RESMI (GO PUBLIC BURSA SAHAM)
// ----------------------------------------------------
app.post('/api/company/ipo', async (req, res) => {
  try {
    const { userId, companyId, symbol, description, sector, ipoPrice, floatingPct } = req.body;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const isPrimary = !companyId || companyId === 'primary';
    const minIpoAsset = 250000000.0; // IB 250 Juta minimal Kas PT
    const ipoFee = 100000000.0; // Biaya Pendaftaran IPO IB 100 Juta

    if (isPrimary) {
      if (!user.has_pt) return res.status(400).json({ error: 'Anda belum memiliki PT' });
      if (user.is_ipo === 1) return res.status(400).json({ error: 'Perusahaan Anda sudah berstatus IPO di bursa' });

      if (user.company_balance_ib < (minIpoAsset + ipoFee) || user.pt_level < 4) {
        return res.status(400).json({
          error: `Syarat Pendaftaran IPO Bursa Efek Capital Federation: Kas PT minimal IB ${minIpoAsset.toLocaleString('id-ID')} dan Biaya Registrasi Bursa IB ${ipoFee.toLocaleString('id-ID')} (Level PT minimal 4). Saldo Kas PT saat ini: IB ${(user.company_balance_ib || 0).toLocaleString('id-ID')}`
        });
      }

      // Validasi Kode Ticker Saham (Harus 4 Huruf Kapital A-Z) - Sinkron otomatis dengan data pendirian PT
      const cleanSymbol = (symbol || user.pt_symbol || '').trim().toUpperCase();
      if (!cleanSymbol || cleanSymbol.length !== 4 || !/^[A-Z]{4}$/.test(cleanSymbol)) {
        return res.status(400).json({
          error: 'Kode saham (Ticker) wajib terdiri dari tepat 4 huruf kapital (contoh: SYFQ, BBCA, ASII)'
        });
      }

      // Cek keunikan kode ticker di bursa (kecuali entitas yang sudah didaftarkan user ini sebelumnya)
      const existingComp = await query.get(
        'SELECT id, name FROM companies WHERE symbol = ? AND (owner_id IS NULL OR owner_id != ?)',
        [cleanSymbol, userId]
      );
      if (existingComp) {
        return res.status(400).json({
          error: `Kode saham ${cleanSymbol} sudah digunakan oleh ${existingComp.name}. Silakan pilih kode 4 huruf unik lainnya!`
        });
      }

      // Potong Biaya Registrasi IPO IB 100 Juta dari Kas PT & Setor ke Kas Negara
      await query.run('UPDATE users SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [ipoFee, userId]);
      const ledgerIpoFeeId = uuidv4();
      await query.run(
        `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
         VALUES (?, 'IPO_REGISTRATION_FEE', ?, ?, 'INCOME', ?, ?)`,
        [ledgerIpoFeeId, `Biaya Registrasi Prospektus & Listing IPO (${cleanSymbol})`, ipoFee, cleanSymbol, `Penerimaan PNBP Pendaftaran IPO PT ${user.pt_name} Tbk. di Bursa Efek Capital Federation`]
      );

      const cleanDesc = (description || user.pt_description || '').trim() || `Emiten sektor ${user.sector} dengan tata kelola profesional di bursa.`;
      const cleanSector = sector || user.sector || 'Teknologi';
      const numIpoPrice = parseFloat(ipoPrice) || 2500.0;
      const numFloatingPct = Math.min(49.0, Math.max(10.0, parseFloat(floatingPct) || 10.0));
      const totalShares = parseInt(req.body.totalShares) || 10000000; // 100% total saham (default 10 Juta lembar = 100 Ribu lot)
      const publicShares = Math.round(totalShares * (numFloatingPct / 100.0));
      const strategicPct = Math.min(40.0, parseFloat((100.0 - numFloatingPct - 50.0).toFixed(1)));
      const founderPct = parseFloat((100.0 - numFloatingPct - strategicPct).toFixed(1));

      // Nama PT otomatis diberi akhiran "Tbk." dengan format PT. [Nama] Tbk.
      const officialName = formatCorporateName(user.pt_name, true);

      // Hitung perolehan dana IPO
      const totalGrossIpo = publicShares * numIpoPrice;
      const ipoInjectionCompany = Math.round(totalGrossIpo * 0.75); // 75% masuk ke Kas PT untuk ekspansi usaha
      const ipoInjectionPersonal = Math.round(totalGrossIpo * 0.25); // 25% dividen pendiri masuk ke Kas Pribadi

      // Jadwal Tahapan E-IPO
      const now = new Date();
      const formatIdDate = (d) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      };
      const bookbuildingDate = req.body.bookbuildingDate || `${formatIdDate(now)} - ${formatIdDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000))}`;
      const offeringDate = req.body.offeringDate || `${formatIdDate(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000))} - ${formatIdDate(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000))}`;
      const allotmentDate = req.body.allotmentDate || formatIdDate(new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000));
      const listingDate = req.body.listingDate || formatIdDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      const initialStatus = req.body.initialStatus || 'BOOKBUILDING';

      let compId = uuidv4();
      const existingOwnComp = await query.get('SELECT id FROM companies WHERE owner_id = ? AND is_ipo = 0', [userId]);
      if (existingOwnComp) {
        compId = existingOwnComp.id;
        await query.run(
          `UPDATE companies
           SET symbol = ?, name = ?, sector = ?, current_price = ?, base_price = ?, total_shares = ?, circulating_shares = ?,
               dividend_rate = 0.04, fundamental_score = ?, is_ipo = 1, listing_status = 'PRE_IPO', description = ?, prev_close = ?, daily_high = ?, daily_low = ?
           WHERE id = ?`,
          [
            cleanSymbol,
            officialName,
            cleanSector,
            numIpoPrice,
            numIpoPrice,
            totalShares,
            publicShares,
            Math.min(100.0, (user.fundamental_score || 75.0) + 12.0),
            cleanDesc,
            numIpoPrice,
            numIpoPrice * 1.05,
            numIpoPrice * 0.95,
            compId
          ]
        );
      } else {
        await query.run(
          `INSERT INTO companies (id, symbol, name, sector, is_bot, status, current_price, base_price, total_shares, circulating_shares, dividend_rate, fundamental_score, owner_id, is_ipo, listing_status, description, prev_close, daily_high, daily_low)
           VALUES (?, ?, ?, ?, 0, 'HEALTHY', ?, ?, ?, ?, 0.04, ?, ?, 1, 'PRE_IPO', ?, ?, ?, ?)`,
          [
            compId,
            cleanSymbol,
            officialName,
            cleanSector,
            numIpoPrice,
            numIpoPrice,
            totalShares,
            publicShares,
            Math.min(100.0, (user.fundamental_score || 75.0) + 12.0),
            userId,
            cleanDesc,
            numIpoPrice,
            numIpoPrice * 1.05,
            numIpoPrice * 0.95
          ]
        );
      }

      // Update status user & nama PT menjadi Tbk.
      await query.run(
        `UPDATE users
         SET is_ipo = 1,
             pt_name = ?,
             sector = ?,
             company_balance_ib = company_balance_ib + ?,
             balance_ib = balance_ib + ?
         WHERE id = ?`,
        [officialName.replace(/^PT\s+/i, '').trim(), cleanSector, ipoInjectionCompany, ipoInjectionPersonal, userId]
      );

      // Registrasi Struktur Pemegang Saham (Cap Table)
      await query.run('DELETE FROM company_shareholders WHERE company_id = ?', [compId]);
      await query.run(
        'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), compId, `${user.username} (Pendiri & Pengendali)`, 'FOUNDER', Math.round(totalShares * (founderPct / 100.0)), founderPct, userId]
      );
      if (strategicPct > 0) {
        await query.run(
          'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), compId, 'Konsorsium Mitra Korporasi (Bookbuilding)', 'INSTITUTION', Math.round(totalShares * (strategicPct / 100.0)), strategicPct]
        );
      }
      await query.run(
        'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), compId, 'Publik Ritel (Bursa Efek Capital Federation)', 'PUBLIC', publicShares, numFloatingPct]
      );

      // Siarkan Berita Registrasi Prospektus IPO ke News Ticker Bursa
      const newsItem = {
        id: uuidv4(),
        title: `🎉 REGISTRASI IPO: ${officialName} (${cleanSymbol}) Terdaftar di Bursa Efek Capital Federation!`,
        content: `Emiten ${cleanSector} resmi membuka penawaran IPO dengan total modal ${totalShares.toLocaleString('id-ID')} lembar. Alokasi publik: ${numFloatingPct}% (${publicShares.toLocaleString('id-ID')} lembar). Tahap Bookbuilding kemitraan dibuka!`,
        affected_sector: cleanSector,
        sentiment: 'BULLISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );

      // Register in E-IPO offerings record with full 4-stage lifecycle dates
      const firstDayAraPct = numIpoPrice <= 200 ? 70.0 : (numIpoPrice <= 5000 ? 50.0 : 40.0);
      const ipoOfferingId = uuidv4();
      await query.run(
        `INSERT INTO ipo_offerings (id, company_id, user_id, company_name, symbol, sector, description, offering_price, total_offering_shares, total_offering_lots, ordered_lots, status, listing_date, listing_time, is_oversubscribed, oversubscribed_ratio, first_day_ara_pct, start_date, bookbuilding_date, offering_date, allotment_date, public_pct, strategic_pct, founder_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '07:00 WIB', 1, 1.85, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ipoOfferingId, compId, userId, officialName, cleanSymbol, cleanSector, cleanDesc,
          numIpoPrice, totalShares, Math.round(totalShares / 100), Math.round(publicShares / 100),
          initialStatus, listingDate, firstDayAraPct, formatIdDate(now),
          bookbuildingDate, offeringDate, allotmentDate,
          numFloatingPct, strategicPct, founderPct
        ]
      );

      // Record initial trade tape entry
      const nowD = new Date();
      const hh = String(nowD.getHours()).padStart(2, '0');
      const mm = String(nowD.getMinutes()).padStart(2, '0');
      const ss = String(nowD.getSeconds()).padStart(2, '0');
      simulationEngine.recordTrade({
        id: uuidv4(),
        time: `${hh}:${mm}:${ss}`,
        symbol: cleanSymbol,
        price: numIpoPrice,
        lots: Math.round(publicShares / 100),
        type: 'BUY',
        username: 'Publik Ritel & Institusi',
        isUser: false,
        timestamp: nowD.toISOString()
      });

      io.emit('market:news_broadcast', newsItem);
      io.emit('user:balance_updated', {
        userId,
        newBalance: user.balance_ib + ipoInjectionPersonal,
        companyBalance: user.company_balance_ib + ipoInjectionCompany
      });

      res.json({
        success: true,
        message: `🎉 SELAMAT! ${officialName} (${cleanSymbol}) resmi melantai di Bursa Saham! Dana ekspansi IB ${ipoInjectionCompany.toLocaleString('id-ID')} masuk ke Kas PT dan dividen perdana IB ${ipoInjectionPersonal.toLocaleString('id-ID')} masuk ke Kas Pribadi!`,
        symbol: cleanSymbol,
        companyName: officialName,
        companyId: compId
      });
    } else {
      // IPO ANAK PERUSAHAAN (Subsidiary)
      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });
      if (comp.owner_id !== userId) return res.status(403).json({ error: 'Anda bukan pemilik anak perusahaan ini' });
      if (comp.is_ipo === 1) return res.status(400).json({ error: 'Perusahaan ini sudah berstatus IPO (Tbk.) di bursa efek' });

      const compBalance = comp.company_balance_ib || 0;
      const compLevel = comp.pt_level || comp.operational_level || 1;
      if (compBalance < (minIpoAsset + ipoFee) || compLevel < 4) {
        return res.status(400).json({
          error: `Syarat Pendaftaran IPO Bursa Efek Capital Federation: Kas Perusahaan minimal IB ${minIpoAsset.toLocaleString('id-ID')} dan Biaya Registrasi Bursa IB ${ipoFee.toLocaleString('id-ID')} (Level PT minimal 4). (Kas saat ini: IB ${compBalance.toLocaleString('id-ID')}, Level: ${compLevel})`
        });
      }

      const cleanSymbol = (symbol || comp.symbol || '').trim().toUpperCase();
      if (!cleanSymbol || cleanSymbol.length !== 4 || !/^[A-Z]{4}$/.test(cleanSymbol)) {
        return res.status(400).json({
          error: 'Kode saham (Ticker) wajib terdiri dari tepat 4 huruf kapital (contoh: SYFQ, BBCA, ASII)'
        });
      }

      const existingComp = await query.get(
        'SELECT id, name FROM companies WHERE symbol = ? AND id != ?',
        [cleanSymbol, comp.id]
      );
      if (existingComp) {
        return res.status(400).json({
          error: `Kode saham ${cleanSymbol} sudah digunakan oleh ${existingComp.name}. Silakan pilih kode 4 huruf unik lainnya!`
        });
      }

      // Potong Biaya Registrasi IPO IB 100 Juta dari Kas Anak Perusahaan & Setor ke Kas Negara
      await query.run('UPDATE companies SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [ipoFee, comp.id]);
      const ledgerSubIpoFeeId = uuidv4();
      await query.run(
        `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
         VALUES (?, 'IPO_REGISTRATION_FEE', ?, ?, 'INCOME', ?, ?)`,
        [ledgerSubIpoFeeId, `Biaya Registrasi Prospektus & Listing IPO Anak Perusahaan (${cleanSymbol})`, ipoFee, cleanSymbol, `Penerimaan PNBP Pendaftaran IPO PT ${comp.name} Tbk. di Bursa Efek Capital Federation`]
      );

      const cleanDesc = (description || comp.description || '').trim() || `Emiten sektor ${comp.sector} dengan tata kelola profesional di bursa.`;
      const cleanSector = sector || comp.sector || 'Teknologi';
      const numIpoPrice = parseFloat(ipoPrice) || 2500.0;
      const numFloatingPct = Math.min(49.0, Math.max(10.0, parseFloat(floatingPct) || 10.0));
      const totalShares = parseInt(req.body.totalShares) || comp.total_shares || 10000000;
      const publicShares = Math.round(totalShares * (numFloatingPct / 100.0));
      const strategicPct = Math.min(40.0, parseFloat((100.0 - numFloatingPct - 50.0).toFixed(1)));
      const founderPct = parseFloat((100.0 - numFloatingPct - strategicPct).toFixed(1));

      const officialName = formatCorporateName(comp.name, true);
      const totalGrossIpo = publicShares * numIpoPrice;
      const ipoInjectionCompany = Math.round(totalGrossIpo * 0.75); // 75% masuk ke Kas PT Anak Perusahaan
      const ipoInjectionPersonal = Math.round(totalGrossIpo * 0.25); // 25% dividen pendiri masuk ke Kas Pribadi

      // Jadwal Tahapan E-IPO
      const now = new Date();
      const formatIdDate = (d) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
      };
      const bookbuildingDate = req.body.bookbuildingDate || `${formatIdDate(now)} - ${formatIdDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000))}`;
      const offeringDate = req.body.offeringDate || `${formatIdDate(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000))} - ${formatIdDate(new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000))}`;
      const allotmentDate = req.body.allotmentDate || formatIdDate(new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000));
      const listingDate = req.body.listingDate || formatIdDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      const initialStatus = req.body.initialStatus || 'BOOKBUILDING';

      await query.run(
        `UPDATE companies
         SET symbol = ?, name = ?, sector = ?, current_price = ?, base_price = ?, total_shares = ?, circulating_shares = ?,
             dividend_rate = 0.04, fundamental_score = ?, is_ipo = 1, description = ?, prev_close = ?, daily_high = ?, daily_low = ?,
             company_balance_ib = company_balance_ib + ?
         WHERE id = ?`,
        [
          cleanSymbol,
          officialName,
          cleanSector,
          numIpoPrice,
          numIpoPrice,
          totalShares,
          publicShares,
          Math.min(100.0, (comp.fundamental_score || 75.0) + 12.0),
          cleanDesc,
          numIpoPrice,
          numIpoPrice * 1.05,
          numIpoPrice * 0.95,
          ipoInjectionCompany,
          comp.id
        ]
      );

      // Tambahkan dividen perdana ke kas pribadi pemilik
      await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [ipoInjectionPersonal, userId]);

      // Registrasi Pemegang Saham Anak Perusahaan
      await query.run('DELETE FROM company_shareholders WHERE company_id = ?', [comp.id]);
      await query.run(
        'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), comp.id, `${user.username} (Pendiri & Pengendali)`, 'FOUNDER', Math.round(totalShares * (founderPct / 100.0)), founderPct, userId]
      );
      if (strategicPct > 0) {
        await query.run(
          'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), comp.id, 'Konsorsium Mitra Korporasi (Bookbuilding)', 'INSTITUTION', Math.round(totalShares * (strategicPct / 100.0)), strategicPct]
        );
      }
      await query.run(
        'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), comp.id, 'Publik Ritel (Bursa Efek Capital Federation)', 'PUBLIC', publicShares, numFloatingPct]
      );

      // Siarkan Berita IPO
      const newsItem = {
        id: uuidv4(),
        title: `🎉 REGISTRASI IPO: ${officialName} (${cleanSymbol}) Terdaftar di Bursa Efek Capital Federation!`,
        content: `Emiten ${cleanSector} milik konglomerasi ${user.username} membuka penawaran umum perdana dengan total modal ${totalShares.toLocaleString('id-ID')} lembar. Alokasi publik: ${numFloatingPct}%. Tahap Bookbuilding kemitraan dibuka!`,
        affected_sector: cleanSector,
        sentiment: 'BULLISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );

      const firstDayAraPct = numIpoPrice <= 200 ? 70.0 : (numIpoPrice <= 5000 ? 50.0 : 40.0);
      const ipoOfferingId = uuidv4();
      await query.run(
        `INSERT INTO ipo_offerings (id, company_id, user_id, company_name, symbol, sector, description, offering_price, total_offering_shares, total_offering_lots, ordered_lots, status, listing_date, listing_time, is_oversubscribed, oversubscribed_ratio, first_day_ara_pct, start_date, bookbuilding_date, offering_date, allotment_date, public_pct, strategic_pct, founder_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '07:00 WIB', 1, 1.85, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ipoOfferingId, comp.id, userId, officialName, cleanSymbol, cleanSector, cleanDesc,
          numIpoPrice, totalShares, Math.round(totalShares / 100), Math.round(publicShares / 100),
          initialStatus, listingDate, firstDayAraPct, formatIdDate(now),
          bookbuildingDate, offeringDate, allotmentDate,
          numFloatingPct, strategicPct, founderPct
        ]
      );

      const nowD = new Date();
      const hh = String(nowD.getHours()).padStart(2, '0');
      const mm = String(nowD.getMinutes()).padStart(2, '0');
      const ss = String(nowD.getSeconds()).padStart(2, '0');
      simulationEngine.recordTrade({
        id: uuidv4(),
        time: `${hh}:${mm}:${ss}`,
        symbol: cleanSymbol,
        price: numIpoPrice,
        lots: Math.round(publicShares / 100),
        type: 'BUY',
        username: 'Publik Ritel & Institusi',
        isUser: false,
        timestamp: nowD.toISOString()
      });

      const updatedUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [userId]);
      const updatedComp = await query.get('SELECT company_balance_ib FROM companies WHERE id = ?', [comp.id]);

      io.emit('market:news_broadcast', newsItem);
      io.emit('user:balance_updated', {
        userId,
        newBalance: updatedUser.balance_ib,
        companyBalance: updatedComp.company_balance_ib
      });

      return res.json({
        success: true,
        message: `🎉 SELAMAT! Anak Perusahaan ${officialName} (${cleanSymbol}) resmi melantai di Bursa Saham! Dana segar IB ${ipoInjectionCompany.toLocaleString('id-ID')} masuk ke Kas PT dan dividen pendiri IB ${ipoInjectionPersonal.toLocaleString('id-ID')} masuk ke Kas Pribadi!`,
        symbol: cleanSymbol,
        companyName: officialName,
        companyId: comp.id
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daftar Kandidat Pemain untuk Transaksi Jual Beli Saham P2P & Korporasi
app.get('/api/users/list-candidates', async (req, res) => {
  try {
    const users = await query.all(
      `SELECT id, username, pt_name, balance_ib, company_balance_ib, has_pt, is_blue_chip 
       FROM users 
       WHERE is_banned = 0 AND role != 'ADMIN' AND id != 'admin-001'
       ORDER BY balance_ib DESC`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eksekusi Akta Perjanjian Jual Beli Saham (Pasar Negosiasi & Divestasi)
app.post('/api/company/negotiation/deal', async (req, res) => {
  try {
    const { sellerUserId, companyId, buyerUserId, percentage, pricePerShare, notes } = req.body;
    const seller = await query.get('SELECT * FROM users WHERE id = ?', [sellerUserId]);
    if (!seller) return res.status(404).json({ error: 'Data Penjual tidak ditemukan' });

    let comp = null;
    if (companyId === 'primary') {
      comp = await query.get('SELECT * FROM companies WHERE owner_id = ? AND is_bot = 0', [sellerUserId]);
    } else {
      comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
    }
    if (!comp) return res.status(404).json({ error: 'Perusahaan emiten tidak ditemukan' });

    const targetCompId = comp.id;

    // Temukan pemegang saham penjual
    const sellerSh = await query.get(
      'SELECT * FROM company_shareholders WHERE company_id = ? AND user_id = ?',
      [targetCompId, sellerUserId]
    );

    const currentOwnerPct = sellerSh ? sellerSh.percentage : (comp.owner_id === sellerUserId ? 70.0 : 0);
    const numPct = parseFloat(percentage);
    if (!numPct || numPct <= 0 || numPct > currentOwnerPct) {
      return res.status(400).json({
        error: `Persentase tidak valid. Maksimal saham yang dapat Anda jual adalah ${currentOwnerPct.toFixed(1)}%.`
      });
    }

    const numPrice = parseFloat(pricePerShare) || comp.current_price;
    const totalSharesSold = Math.round(comp.total_shares * (numPct / 100.0));
    const lotsSold = Math.round(totalSharesSold / 100);
    const grossAmount = Math.round(totalSharesSold * numPrice);
    const fee = Math.round(grossAmount * 0.001); // 0.1% bea materai & bursa
    const netSellerProceeds = grossAmount - fee;

    let buyerName = 'Konsorsium Investor Publik Global';
    let buyer = null;
    const isGlobal = !buyerUserId || buyerUserId === 'GLOBAL_INVESTORS';

    if (!isGlobal) {
      buyer = await query.get('SELECT * FROM users WHERE id = ? OR username = ?', [buyerUserId, buyerUserId]);
      if (!buyer) return res.status(404).json({ error: 'Investor pembeli tidak ditemukan' });
      if (buyer.id === sellerUserId) return res.status(400).json({ error: 'Tidak dapat menjual saham ke diri sendiri' });
      if (buyer.balance_ib < (grossAmount + fee)) {
        return res.status(400).json({
          error: `Saldo Kas Pembeli (${buyer.username}) tidak mencukupi untuk transaksi ini. Butuh IB ${(grossAmount + fee).toLocaleString('id-ID')}.`
        });
      }
      buyerName = `${buyer.username} (${buyer.pt_name || 'Konglomerat'})`;
    }

    // Eksekusi Finansial
    if (!isGlobal && buyer) {
      await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [grossAmount + fee, buyer.id]);
    }
    await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [netSellerProceeds, sellerUserId]);

    // Update / Kurangi kepemilikan Penjual di company_shareholders
    const newSellerPct = currentOwnerPct - numPct;
    if (sellerSh) {
      if (newSellerPct <= 0.1) {
        await query.run('DELETE FROM company_shareholders WHERE id = ?', [sellerSh.id]);
      } else {
        await query.run(
          'UPDATE company_shareholders SET percentage = ?, shares_count = shares_count - ? WHERE id = ?',
          [parseFloat(newSellerPct.toFixed(1)), totalSharesSold, sellerSh.id]
        );
      }
    }

    // Tambah kepemilikan Pembeli
    let isTakeover = false;
    if (!isGlobal && buyer) {
      const existingBuyerSh = await query.get(
        'SELECT * FROM company_shareholders WHERE company_id = ? AND user_id = ?',
        [targetCompId, buyer.id]
      );
      let newBuyerPct = numPct;
      if (existingBuyerSh) {
        newBuyerPct = parseFloat((existingBuyerSh.percentage + numPct).toFixed(1));
        await query.run(
          'UPDATE company_shareholders SET percentage = ?, shares_count = shares_count + ? WHERE id = ?',
          [newBuyerPct, totalSharesSold, existingBuyerSh.id]
        );
      } else {
        await query.run(
          'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), targetCompId, `${buyer.username} (Investor Strategis)`, 'STRATEGIC', totalSharesSold, parseFloat(numPct.toFixed(1)), buyer.id]
        );
      }

      // Tambahkan ke portofolio pembeli
      const buyerPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [buyer.id, targetCompId]);
      if (buyerPort) {
        await query.run('UPDATE portfolios SET lots_owned = lots_owned + ? WHERE id = ?', [lotsSold, buyerPort.id]);
      } else {
        await query.run('INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)', [uuidv4(), buyer.id, targetCompId, lotsSold, numPrice]);
      }

      // Jika pembeli memiliki > 50%, ini adalah AKUISISI SAH YANG DISEPAKATI!
      if (newBuyerPct > 50.0 && comp.owner_id !== buyer.id) {
        isTakeover = true;
        await query.run('UPDATE companies SET owner_id = ?, is_acquired = 1 WHERE id = ?', [buyer.id, targetCompId]);
      }
    } else {
      // Global Investors / Secondary Offering: Tambahkan ke circulating shares
      await query.run('UPDATE companies SET circulating_shares = circulating_shares + ? WHERE id = ?', [totalSharesSold, targetCompId]);
      const publicSh = await query.get("SELECT * FROM company_shareholders WHERE company_id = ? AND holder_type = 'PUBLIC'", [targetCompId]);
      if (publicSh) {
        await query.run('UPDATE company_shareholders SET percentage = percentage + ?, shares_count = shares_count + ? WHERE id = ?', [parseFloat(numPct.toFixed(1)), totalSharesSold, publicSh.id]);
      }
    }

    // Nomor Akta Resmi
    const aktaDate = new Date();
    const aktaNo = `AKTA/IPMC/${aktaDate.getFullYear()}${String(aktaDate.getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;

    // Catat Berita Bursa & Broadcast Breaking News
    const formattedGross = `IB ${grossAmount.toLocaleString('id-ID')}`;
    const newsTitle = isTakeover
      ? `🏛️ AKTA AKUISISI MASIF: ${buyerName} Mengambil Alih Kendali ${comp.name}!`
      : `📢 TRANSAKSI BLOK RESMI: ${seller.username} Mengalihkan ${numPct}% Saham ${comp.symbol} Senilai ${formattedGross}`;
    const newsContent = `Telah disahkan Akta Perjanjian Notaris No. ${aktaNo}. Pengalihan ${numPct}% saham (${lotsSold.toLocaleString('id-ID')} Lot / ${totalSharesSold.toLocaleString('id-ID')} lembar) dari ${seller.username} kepada ${buyerName} dengan total nilai transaksi ${formattedGross}.`;

    const newsId = uuidv4();
    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newsId, newsTitle, newsContent, comp.sector, 'BULLISH', aktaDate.toISOString()]
    );
    io.emit('market:news_broadcast', {
      id: newsId,
      title: newsTitle,
      content: newsContent,
      affectedSector: comp.sector,
      sentiment: 'BULLISH',
      published_at: aktaDate.toISOString()
    });
    io.emit('market:breaking_news', {
      id: newsId,
      title: newsTitle,
      content: newsContent,
      sentiment: 'BULLISH'
    });

    res.json({
      success: true,
      message: `Akta Perjanjian berhasil dieksekusi! Kas Pribadi bertambah IB ${netSellerProceeds.toLocaleString('id-ID')}`,
      deed: {
        deedNumber: aktaNo,
        companyName: comp.name,
        symbol: comp.symbol,
        sellerName: seller.username,
        buyerName: buyerName,
        percentage: numPct,
        sharesCount: totalSharesSold,
        lotsCount: lotsSold,
        pricePerShare: numPrice,
        grossAmount,
        fee,
        netProceeds: netSellerProceeds,
        isTakeover,
        signedAt: aktaDate.toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



// ====================================================
// MODUL PENGADILAN NIAGA & ARBITRASE FEDERASI (PNAF)
// ====================================================

// Daftar Seluruh Perkara Sidang Niaga
app.get('/api/court/cases', async (req, res) => {
  try {
    const cases = await query.all('SELECT * FROM court_cases ORDER BY created_at DESC');
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pendaftaran Gugatan Sidang Baru ke Pengadilan Niaga
app.post('/api/court/file-case', async (req, res) => {
  try {
    const { plaintiffName, plaintiffUserId, defendantName, defendantUserId, defendantCompanyId, caseType, title, claimAmountIb, courtHearingDate, hearingDate, hearingTime, courtRoomName, targetAssetDescription, notes } = req.body;
    if (!plaintiffName || !defendantName || !title) {
      return res.status(400).json({ error: 'Data penggugat, tergugat, dan pokok perkara wajib diisi' });
    }

    // Biaya pendaftaran perkara IB 250.000 jika diajukan oleh user pemain
    if (plaintiffUserId) {
      const plUser = await query.get('SELECT * FROM users WHERE id = ?', [plaintiffUserId]);
      if (plUser) {
        const courtFee = 250000;
        if (plUser.balance_ib < courtFee) {
          return res.status(400).json({ error: 'Saldo Kas Pribadi tidak mencukupi untuk biaya panitera PNAF (IB 250.000)' });
        }
        await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [courtFee, plUser.id]);
        io.emit('user:balance_updated', { userId: plUser.id, newBalance: plUser.balance_ib - courtFee });
      }
    }

    const typeCode = caseType === 'BANKRUPTCY' ? 'Pailit' : (caseType === 'DISPUTE' ? 'Sengketa' : 'Bursa');
    const caseNumber = `${String(Math.floor(10 + Math.random() * 90)).padStart(3, '0')}/Pdt.Sus-${typeCode}/${new Date().getFullYear()}/PNAF`;
    const caseId = uuidv4();
    const hearingSchedule = courtHearingDate || hearingDate || `${new Date(Date.now() + 2 * 86400000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const timeVal = hearingTime || '10:00 WIB';
    const roomName = courtRoomName || 'Ruang Sidang Utama Kartika PNAF';
    const targetAsset = targetAssetDescription || 'Saham Portofolio, Dividen, dan Rekening Konglomerat';

    await query.run(
      `INSERT INTO court_cases (id, case_number, case_type, title, plaintiff_name, defendant_name, defendant_user_id, defendant_company_id, claim_amount_ib, court_hearing_date, hearing_time, court_room_name, target_asset_description, status, verdict_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_TRIAL', ?)`,
      [caseId, caseNumber, caseType || 'DISPUTE', title, plaintiffName, defendantName, defendantUserId || null, defendantCompanyId || null, claimAmountIb || 0.0, hearingSchedule, timeVal, roomName, targetAsset, notes || 'Berkas perkara telah diterima Panitera PNAF. Menunggu persidangan.']
    );

    const newCase = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
    io.emit('court:new_case', newCase);

    // Otomatis Siarkan Berita Breaking News ke Seluruh Klien Bursa & Ticker
    const formattedClaim = `IB ${Number(claimAmountIb || 0).toLocaleString('id-ID')}`;
    const newsTitle = `🚨 GUGATAN PNAF: ${plaintiffName} Menggugat ${defendantName}!`;
    const newsContent = `Kepaniteraan Pengadilan Niaga Federasi meregister gugatan perkara No. ${caseNumber} (${title}) dengan total tuntutan ganti rugi ${formattedClaim}. Sidang perdana dijadwalkan pada: ${hearingSchedule}.`;
    const newsId = uuidv4();
    const nowIso = new Date().toISOString();

    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newsId, newsTitle, newsContent, 'Semua Sektor', 'BEARISH', nowIso]
    );
    io.emit('market:news_broadcast', {
      id: newsId,
      title: newsTitle,
      content: newsContent,
      affectedSector: 'Semua Sektor',
      sentiment: 'BEARISH',
      published_at: nowIso,
    });
    io.emit('market:breaking_news', {
      id: newsId,
      title: newsTitle,
      content: newsContent,
      sentiment: 'BEARISH',
    });

    res.json({ success: true, case: newCase, message: `Gugatan berhasil diregister di PNAF dengan Nomor Perkara: ${caseNumber}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vonis Ketukan Palu Hakim Niaga Federasi
app.post('/api/court/verdict', async (req, res) => {
  try {
    const { caseId, verdictStatus, verdictNotes } = req.body;
    const existing = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
    if (!existing) return res.status(404).json({ error: 'Perkara tidak ditemukan' });

    await query.run(
      'UPDATE court_cases SET status = ?, verdict_notes = ? WHERE id = ?',
      [verdictStatus, verdictNotes || 'Vonis telah dijatuhkan secara sah oleh Majelis Hakim Niaga Federasi.', caseId]
    );

    const updated = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
    io.emit('court:verdict', updated);

    // Siarkan Berita Pengadilan ke Bursa
    const newsId = uuidv4();
    const nowIso = new Date().toISOString();
    const newsTitle = `⚖️ VONIS HAKIM PNAF: Perkara No. ${updated.case_number}`;
    const newsContent = `Majelis Hakim Pengadilan Niaga Federasi resmi menjatuhkan amar putusan "${verdictStatus}" terhadap Tergugat ${updated.defendant_name}. Diktum Majelis: ${verdictNotes || 'Putusan berkekuatan hukum tetap.'}`;

    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newsId, newsTitle, newsContent, 'Semua Sektor', verdictStatus === 'VERDICT_PAILIT' ? 'BEARISH' : 'NEUTRAL', nowIso]
    );
    io.emit('market:news_broadcast', {
      id: newsId,
      title: newsTitle,
      content: newsContent,
      affectedSector: 'Semua Sektor',
      sentiment: verdictStatus === 'VERDICT_PAILIT' ? 'BEARISH' : 'NEUTRAL',
      published_at: nowIso,
    });
    io.emit('market:breaking_news', {
      id: newsId,
      title: newsTitle,
      content: newsContent,
      sentiment: verdictStatus === 'VERDICT_PAILIT' ? 'BEARISH' : 'NEUTRAL',
    });

    res.json({ success: true, case: updated, message: `Vonis perkara ${updated.case_number} berhasil dijatuhkan dan disiarkan ke bursa.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// MODUL E-IPO STRATEGIC BOOKBUILDING & ALLOTMENT
// ====================================================

// Daftar Proposal Bidding Masuk untuk IPO Tertentu
app.get('/api/ipo/bids/:ipoId', async (req, res) => {
  try {
    const bids = await query.all(
      `SELECT b.*, u.username as bidder_username, u.pt_name as bidder_pt_name, u.company_balance_ib, u.fundamental_score
       FROM ipo_bids b
       JOIN users u ON b.bidder_user_id = u.id
       WHERE b.ipo_id = ?
       ORDER BY b.created_at ASC`,
      [req.params.ipoId]
    );
    res.json(bids);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Perusahaan Lain atau Investor Mitra Mengajukan Tawaran Saham Pre-IPO (Bidding)
app.post('/api/ipo/bid', async (req, res) => {
  try {
    const { ipoId, bidderUserId, requestedPercentage, strategicPitch } = req.body;
    const ipo = await query.get('SELECT * FROM ipo_offerings WHERE id = ?', [ipoId]);
    if (!ipo) return res.status(404).json({ error: 'Data penawaran IPO tidak ditemukan' });

    const bidder = await query.get('SELECT * FROM users WHERE id = ?', [bidderUserId]);
    if (!bidder) {
      return res.status(404).json({ error: 'Akun investor/mitra tidak ditemukan' });
    }
    if (ipo.user_id && ipo.user_id === bidderUserId) {
      return res.status(400).json({ error: 'Tidak dapat menawar saham IPO perusahaan sendiri' });
    }

    const pct = parseFloat(requestedPercentage);
    if (!pct || pct <= 0 || pct > (ipo.strategic_pct || 40.0)) {
      return res.status(400).json({ error: `Porsi penawaran maksimal adalah ${(ipo.strategic_pct || 40.0)}%` });
    }

    const pricePerShare = ipo.offering_price;
    // Porsi % dari total 100% saham perusahaan yang ditawarkan
    const sharesCount = Math.round(ipo.total_offering_shares * (pct / 100.0));
    const totalCost = sharesCount * pricePerShare;

    const totalAvailableFunds = (bidder.company_balance_ib || 0) + (bidder.balance_ib || 0);
    const bidderEntityName = bidder.has_pt && bidder.pt_name
      ? formatCleanPtName(bidder.pt_name, true)
      : `Investor Mitra ${bidder.username}`;

    if (totalAvailableFunds < totalCost) {
      return res.status(400).json({
        error: `Saldo Kas (${bidderEntityName}) tidak cukup. Butuh IB ${totalCost.toLocaleString('id-ID')} untuk komitmen ${pct}% saham.`
      });
    }

    // Cek apakah bidder sudah memiliki proposal PENDING untuk IPO ini -> update jika ada agar tidak duplikat
    const existingBid = await query.get(
      "SELECT id FROM ipo_bids WHERE ipo_id = ? AND bidder_user_id = ? AND status = 'PENDING'",
      [ipoId, bidderUserId]
    );

    let bidId;
    if (existingBid) {
      bidId = existingBid.id;
      await query.run(
        `UPDATE ipo_bids 
         SET bidder_company_name = ?, requested_percentage = ?, offered_price_per_share = ?, total_investment_ib = ?, strategic_pitch = ?, created_at = datetime('now')
         WHERE id = ?`,
        [bidderEntityName, pct, pricePerShare, totalCost, strategicPitch || 'Kemitraan strategis ekspansi rantai pasok.', bidId]
      );
    } else {
      bidId = uuidv4();
      await query.run(
        `INSERT INTO ipo_bids (id, ipo_id, bidder_user_id, bidder_company_name, requested_percentage, offered_price_per_share, total_investment_ib, strategic_pitch, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [bidId, ipoId, bidderUserId, bidderEntityName, pct, pricePerShare, totalCost, strategicPitch || 'Kemitraan strategis ekspansi rantai pasok.']
      );
    }

    const savedBid = await query.get('SELECT * FROM ipo_bids WHERE id = ?', [bidId]);
    io.emit('ipo:new_bid', { ipoId, bid: savedBid });

    res.json({
      success: true,
      message: `Proposal kemitraan ${pct}% saham (${(sharesCount / 100).toLocaleString('id-ID')} Lot) ${ipo.company_name} senilai IB ${totalCost.toLocaleString('id-ID')} berhasil diajukan ke Direksi Pendiri.`,
      bid: savedBid
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Penjatahan & Keputusan Pendiri Emiten atas Proposal Masuk (Allotment)
app.post('/api/ipo/allotment', async (req, res) => {
  try {
    const { ipoId, issuerUserId, acceptedBidIds, rejectedBidIds } = req.body;
    const ipo = await query.get('SELECT * FROM ipo_offerings WHERE id = ?', [ipoId]);
    if (!ipo) return res.status(404).json({ error: 'Data IPO tidak ditemukan' });

    if (ipo.user_id && ipo.user_id !== issuerUserId) {
      return res.status(403).json({ error: 'Hanya Pendiri / Pemilik Emiten yang berhak melakukan penjatahan pemegang saham' });
    }

    let totalFundInjected = 0;

    // Proses Proposal yang Diterima
    if (Array.isArray(acceptedBidIds)) {
      for (const bidId of acceptedBidIds) {
        const bid = await query.get('SELECT * FROM ipo_bids WHERE id = ? AND ipo_id = ?', [bidId, ipoId]);
        if (bid && bid.status === 'PENDING') {
          const bidder = await query.get('SELECT * FROM users WHERE id = ?', [bid.bidder_user_id]);
          const bidderAvailable = bidder ? ((bidder.company_balance_ib || 0) + (bidder.balance_ib || 0)) : 0;
          if (bidder && bidderAvailable >= bid.total_investment_ib) {
            // Debet Kas PT Pembeli terlebih dahulu, sisanya dari Kas Pribadi Pembeli
            const deductCompany = Math.min(bidder.company_balance_ib || 0, bid.total_investment_ib);
            const deductPersonal = bid.total_investment_ib - deductCompany;
            await query.run(
              'UPDATE users SET company_balance_ib = company_balance_ib - ?, balance_ib = balance_ib - ? WHERE id = ?',
              [deductCompany, deductPersonal, bidder.id]
            );
            // Kredit Kas PT Emiten
            await query.run('UPDATE users SET company_balance_ib = company_balance_ib + ? WHERE id = ?', [bid.total_investment_ib, issuerUserId]);
            if (ipo.company_id) {
              await query.run('UPDATE companies SET company_balance_ib = company_balance_ib + ? WHERE id = ?', [bid.total_investment_ib, ipo.company_id]);
            }
            // Tandai Bid Diterima
            await query.run("UPDATE ipo_bids SET status = 'ACCEPTED' WHERE id = ?", [bidId]);

            const sharesCount = Math.round(ipo.total_offering_shares * (bid.requested_percentage / 100.0));
            const lotsCount = Math.round(sharesCount / 100);
            await query.run('UPDATE ipo_offerings SET ordered_lots = COALESCE(ordered_lots, 0) + ? WHERE id = ?', [lotsCount, ipoId]);

            // Tambahkan / Update Saham ke Portofolio Mitra Pembeli
            const targetComp = ipo.company_id
              ? await query.get('SELECT id FROM companies WHERE id = ? OR symbol = ?', [ipo.company_id, ipo.symbol])
              : await query.get('SELECT id FROM companies WHERE symbol = ?', [ipo.symbol]);
            const targetCompId = targetComp ? targetComp.id : ipo.company_id;

            if (targetCompId) {
              const existingPortfolio = await query.get(
                'SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?',
                [bidder.id, targetCompId]
              );
              if (existingPortfolio) {
                const totalLots = existingPortfolio.lots_owned + lotsCount;
                const totalCostOld = existingPortfolio.lots_owned * 100 * existingPortfolio.avg_buy_price;
                const totalCostNew = totalCostOld + bid.total_investment_ib;
                const newAvg = Math.round(totalCostNew / (totalLots * 100));
                await query.run(
                  'UPDATE portfolios SET lots_owned = ?, avg_buy_price = ? WHERE id = ?',
                  [totalLots, newAvg, existingPortfolio.id]
                );
              } else {
                await query.run(
                  'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
                  [uuidv4(), bidder.id, targetCompId, lotsCount, bid.offered_price_per_share]
                );
              }

              const holderLabel = bid.bidder_company_name || formatCleanPtName(bidder.pt_name, bidder.has_pt);
              // Update Struktur Pemegang Saham (Cap Table)
              await query.run(
                `INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id)
                 VALUES (?, ?, ?, 'STRATEGIC', ?, ?, ?)`,
                [uuidv4(), targetCompId, `${holderLabel} (Mitra Strategis Pre-IPO)`, sharesCount, bid.requested_percentage, bidder.id]
              );
            }

            // Catat Arus Kas Transparan untuk kedua pihak
            const bidderUserAfter = await query.get('SELECT company_balance_ib, balance_ib FROM users WHERE id = ?', [bidder.id]);
            const issuerUserAfter = await query.get('SELECT company_balance_ib FROM users WHERE id = ?', [issuerUserId]);
            const holderLabel = bid.bidder_company_name || formatCleanPtName(bidder.pt_name, bidder.has_pt);

            await recordCashFlow({
              userId: bidder.id,
              companyId: null,
              accountType: deductCompany > 0 ? 'COMPANY' : 'PERSONAL',
              category: 'STRATEGIC_INVESTMENT',
              title: `Penyertaan Modal Pre-IPO ${ipo.symbol}`,
              amountIb: bid.total_investment_ib,
              direction: 'EXPENSE',
              balanceAfter: bidderUserAfter ? (deductCompany > 0 ? bidderUserAfter.company_balance_ib : bidderUserAfter.balance_ib) : 0,
              notes: `Pembelian kemitraan strategis ${bid.requested_percentage}% saham (${lotsCount.toLocaleString('id-ID')} Lot) ${ipo.company_name}`
            });

            await recordCashFlow({
              userId: issuerUserId,
              companyId: ipo.company_id,
              accountType: 'COMPANY',
              category: 'CAPITAL_INJECTION',
              title: `Injeksi Modal Mitra Pre-IPO (${holderLabel})`,
              amountIb: bid.total_investment_ib,
              direction: 'INCOME',
              balanceAfter: issuerUserAfter ? issuerUserAfter.company_balance_ib : 0,
              notes: `Penerimaan dana segar kemitraan strategis ${bid.requested_percentage}% saham dari ${holderLabel}`
            });

            totalFundInjected += bid.total_investment_ib;
          }
        }
      }
    }

    // Proses Proposal yang Ditolak
    if (Array.isArray(rejectedBidIds)) {
      for (const bidId of rejectedBidIds) {
        await query.run("UPDATE ipo_bids SET status = 'REJECTED' WHERE id = ? AND ipo_id = ?", [bidId, ipoId]);
      }
    }

    io.emit('ipo:allotment_completed', { ipoId, totalFundInjected });

    res.json({
      success: true,
      message: `Penjatahan selesai! Total suntikan modal segar IB ${totalFundInjected.toLocaleString('id-ID')} berhasil masuk ke Kas PT Emiten.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================================================
// MODUL MAKROEKONOMI REPUBLIK FEDERASI INDIGO
// ====================================================

// Indikator Makroekonomi Federasi
app.get('/api/federation/macro', async (req, res) => {
  try {
    const settings = await query.all('SELECT * FROM central_bank_settings');
    const mapped = Object.fromEntries(settings.map(s => [s.key, s.value]));
    res.json({
      countryName: mapped.country_name || 'Republik Federasi Indigo',
      marketIndexName: mapped.market_index_name || 'IPMC (Indigo Prime Monetary & Capital Exchange)',
      economicState: mapped.economic_state || 'NORMAL',
      interestRate: parseFloat(mapped.interest_rate || '6.5'),
      inflationRate: mapped.economic_state === 'CRISIS' ? 14.2 : (mapped.economic_state === 'RECESSION' ? 7.8 : 3.1),
      currencyName: 'IB (Indigo Billion)',
      courtAuthority: 'PNAF (Pengadilan Niaga Arbitrase Federasi)'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ubah Status Siklus Ekonomi Federasi (Admin Authority)
app.post('/api/federation/macro/state', async (req, res) => {
  try {
    const economicState = (req.body.economicState || req.body.state || '').toUpperCase();
    const validStates = ['BOOM', 'NORMAL', 'RECESSION', 'CRISIS'];
    if (!validStates.includes(economicState)) {
      return res.status(400).json({ error: 'Status ekonomi tidak valid. Pilihan: BOOM, NORMAL, RECESSION, CRISIS' });
    }

    await query.run(
      "INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES ('economic_state', ?)",
      [economicState]
    );

    // Sesuaikan suku bunga BCF otomatis sesuai iklim makro
    let newRate = 6.5;
    if (economicState === 'BOOM') newRate = 4.5;
    if (economicState === 'RECESSION') newRate = 9.5;
    if (economicState === 'CRISIS') newRate = 18.0;

    await query.run(
      "INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES ('interest_rate', ?)",
      [String(newRate)]
    );

    // Terapkan efek langsung ke engine pasar jika ada
    if (simulationEngine && typeof simulationEngine.applyMacroShock === 'function') {
      if (economicState === 'CRISIS') {
        await simulationEngine.applyMacroShock('ALL', -15.0);
      } else if (economicState === 'BOOM') {
        await simulationEngine.applyMacroShock('ALL', 12.0);
      } else if (economicState === 'RECESSION') {
        await simulationEngine.applyMacroShock('ALL', -6.0);
      }
    }

    io.emit('federation:macro_changed', { economicState, interestRate: newRate });
    io.emit('central_bank:rate', { interestRate: newRate });

    // Siarkan berita krisis / boom ke bursa
    const headline = economicState === 'CRISIS'
      ? '🚨 KRISIS MONETER FEDERASI: Bank Sentral Naikkan Bunga Darurat ke 18%!'
      : (economicState === 'BOOM'
        ? '🌟 ZAMAN KEMAKMURAN FEDERASI: Perekonomian Tumbuh Pesat, Suku Bunga Turun!'
        : (economicState === 'RECESSION'
          ? '⚠️ PERLAMBATAN EKONOMI: Inflasi Naik, Bank Sentral Ketatkan Likuiditas'
          : `📢 STABILITAS EKONOMI FEDERASI: Siklus Perekonomian Memasuki Fase Normal`));

    const macroNews = {
      id: uuidv4(),
      title: headline,
      content: `Pemerintah Republik Federasi Indigo dan Otoritas Pasar Modal IPMC mengumumkan status perekonomian kini berada di fase ${economicState}. Pelaku pasar diimbau menyesuaikan alokasi portofolio.`,
      affected_sector: 'Semua Sektor',
      sentiment: (economicState === 'BOOM' || economicState === 'NORMAL') ? 'BULLISH' : 'BEARISH',
      published_at: new Date().toISOString()
    };
    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [macroNews.id, macroNews.title, macroNews.content, macroNews.affected_sector, macroNews.sentiment, macroNews.published_at]
    );
    io.emit('market:news_broadcast', macroNews);
    io.emit('market:breaking_news', macroNews);

    res.json({ success: true, economicState, interestRate: newRate, message: `Status iklim ekonomi berhasil diubah ke ${economicState}!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.get('/api/user/conglomerate/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const list = [];
    let primaryComp = null;
    if (user.has_pt) {
      // 1. Cari PT Utama: Utamakan perusahaan yang owner_id-nya adalah user dan simbol/namanya cocok
      primaryComp = await query.get(
        'SELECT * FROM companies WHERE owner_id = ? AND (symbol = ? OR name = ?)',
        [userId, user.pt_symbol, user.pt_name]
      ) || await query.get(
        'SELECT * FROM companies WHERE owner_id = ? ORDER BY founded_at ASC, id ASC LIMIT 1',
        [userId]
      );

      // Jika user.has_pt == 1 tapi di database perusahaan tidak ditemukan sama sekali di tangan user:
      if (!primaryComp) {
        // Cek apakah user punya anak perusahaan lain
        const anyOwnedComp = await query.get('SELECT * FROM companies WHERE owner_id = ? LIMIT 1', [userId]);
        if (anyOwnedComp) {
          primaryComp = anyOwnedComp;
          await query.run(
            'UPDATE users SET pt_name = ?, pt_symbol = ?, sector = ?, is_ipo = ?, company_balance_ib = ?, founder_shares_sold = ? WHERE id = ?',
            [primaryComp.name, primaryComp.symbol, primaryComp.sector, primaryComp.is_ipo || 0, primaryComp.company_balance_ib || 0, primaryComp.founder_shares_sold || 0, userId]
          );
        } else {
          // User tidak memiliki PT apapun lagi (semua sudah dijual/diakuisisi)
          await query.run("UPDATE users SET has_pt = 0, pt_name = '', pt_symbol = '', is_ipo = 0, company_balance_ib = 0 WHERE id = ?", [userId]);
          user.has_pt = 0;
        }
      }

      if (user.has_pt && primaryComp) {
        const isIpo = primaryComp.is_ipo === 1;
        const officialPtName = formatCorporateName(primaryComp.name, isIpo);
        const founderSold = primaryComp.founder_shares_sold || user.founder_shares_sold || 0;
        let founderPct = Math.max(0, 100.0 - (isIpo ? (30.0 + founderSold) : founderSold));

        // Jika founder melakukan buyback saham sendiri di pasar sekunder, tambahkan ke kepemilikan PT Utama
        const ownPort = await query.get('SELECT lots_owned FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, primaryComp.id]);
        if (ownPort && ownPort.lots_owned > 0) {
          const buybackPct = ((ownPort.lots_owned * 100.0) / (primaryComp.total_shares || 10000000)) * 100.0;
          founderPct = Math.min(100.0, founderPct + buybackPct);
        }

        list.push({
          id: 'primary',
          companyDbId: primaryComp.id,
          name: officialPtName,
          symbol: primaryComp.symbol,
          sector: primaryComp.sector || user.sector,
          isPrimary: true,
          isAcquired: false,
          isSubsidiary: false,
          companyBalance: primaryComp.company_balance_ib || user.company_balance_ib || 0.0,
          employeesCount: primaryComp.employees_count || user.employees_count || 0,
          ceoLevel: primaryComp.ceo_level || user.ceo_level || 0,
          cfoLevel: primaryComp.cfo_level || user.cfo_level || 0,
          cmoLevel: primaryComp.cmo_level || user.cmo_level || 0,
          rdLevel: primaryComp.rd_level || user.rd_level || 1,
          marketingLevel: primaryComp.marketing_level || user.marketing_level || 1,
          hrLevel: primaryComp.hr_level || user.hr_level || 1,
          capacityLevel: primaryComp.capacity_level || user.capacity_level || 1,
          ptLevel: primaryComp.pt_level || user.pt_level || 1,
          fundamentalScore: primaryComp.fundamental_score || user.fundamental_score || 70,
          isIpo,
          currentPrice: primaryComp.current_price || 2500.0,
          description: primaryComp.description || `PT ${primaryComp.name} beroperasi di sektor ${primaryComp.sector}.`,
          ownershipPct: parseFloat(founderPct.toFixed(1)),
          founderSharesSold: founderSold,
          isSeized: primaryComp.is_seized === 1,
          status: primaryComp.status || 'HEALTHY',
          seizeReason: primaryComp.seize_reason || null,
          seizedBy: primaryComp.seized_by || null,
          isUma: primaryComp.uma_flag === 1,
          umaReason: primaryComp.uma_reason || null
        });
      }
    }

    // Perusahaan anak (Subsidiary) & hasil akuisisi selain PT Utama sendiri
    // HANYA yang benar-benar DIMILIKI oleh user (owner_id = userId) ATAU porsi saham mayoritas (>= 50%)!
    const primaryCompId = primaryComp ? primaryComp.id : '---none---';
    const acquired = await query.all(`
      SELECT c.*, COALESCE(p.lots_owned, 0) as lots_owned,
             CASE WHEN c.owner_id = ? AND (p.lots_owned IS NULL OR p.lots_owned = 0) THEN 100.0
                  ELSE ((COALESCE(p.lots_owned, 0) * 100.0) / c.total_shares * 100.0)
             END as calculated_ownership_pct
      FROM companies c
      LEFT JOIN portfolios p ON c.id = p.company_id AND p.user_id = ?
      WHERE c.id != ? 
        AND (c.owner_id = ? OR ((COALESCE(p.lots_owned, 0) * 100.0) / c.total_shares) >= 50.0)
    `, [userId, userId, primaryCompId, userId]);

    for (const a of acquired) {
      const isAcquired = a.is_acquired === 1 || a.is_bot === 1;
      const isSubsidiary = !isAcquired && a.owner_id === userId;
      list.push({
        id: a.id,
        companyDbId: a.id,
        name: formatCorporateName(a.name, a.is_ipo === 1),
        symbol: a.symbol,
        sector: a.sector,
        isPrimary: false,
        isAcquired,
        isSubsidiary,
        companyBalance: a.company_balance_ib || 0.0,
        employeesCount: a.employees_count || 10,
        ceoLevel: a.ceo_level || 0,
        cfoLevel: a.cfo_level || 0,
        cmoLevel: a.cmo_level || 0,
        rdLevel: a.rd_level || a.operational_level || 1,
        marketingLevel: a.marketing_level || 1,
        hrLevel: a.hr_level || 1,
        capacityLevel: a.capacity_level || 1,
        ptLevel: a.pt_level || a.operational_level || 1,
        fundamentalScore: a.fundamental_score || 80,
        isIpo: a.is_ipo === 1,
        currentPrice: a.current_price,
        description: a.description || (isSubsidiary ? `Anak Perusahaan resmi sektor ${a.sector}.` : `Emiten hasil akuisisi konglomerasi di sektor ${a.sector}.`),
        lotsOwned: a.lots_owned,
        ownershipPct: Math.min(100.0, Math.max(0.0, parseFloat((a.calculated_ownership_pct || 100.0).toFixed(1)))),
        founderSharesSold: a.founder_shares_sold || 0,
        isSeized: a.is_seized === 1,
        status: a.status || 'HEALTHY',
        seizeReason: a.seize_reason,
        seizedBy: a.seized_by,
        isUma: a.uma_flag === 1,
        umaReason: a.uma_reason
      });
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit / Rebranding Emiten & Perusahaan Hasil Akuisisi (Biaya Verifikasi & Notaris IB 25 Juta)
app.post('/api/company/rename', async (req, res) => {
  try {
    const { userId, companyId, newName, newSymbol, description, sector } = req.body;
    if (!newName || newName.trim().length < 3) {
      return res.status(400).json({ error: 'Nama perusahaan minimal 3 karakter' });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const renameFee = 25000000.0; // Biaya audit, tim penyidikan legalitas & verifikasi notaris IB 25 Juta

    if (companyId === 'primary') {
      if (!user.has_pt) return res.status(400).json({ error: 'Anda belum mendirikan PT' });
      const payFromCompany = user.company_balance_ib >= renameFee;
      if (!payFromCompany && user.balance_ib < renameFee) {
        return res.status(400).json({
          error: `Saldo tidak mencukupi untuk biaya verifikasi & audit tim legalitas IB ${renameFee.toLocaleString('id-ID')}`
        });
      }

      if (payFromCompany) {
        await query.run('UPDATE users SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [renameFee, userId]);
      } else {
        await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [renameFee, userId]);
      }

      const isIpo = user.is_ipo === 1;
      const officialName = formatCorporateName(newName, isIpo);
      let cleanSymbol = null;

      if (isIpo) {
        if (newSymbol) {
          cleanSymbol = newSymbol.trim().toUpperCase();
          if (cleanSymbol.length !== 4 || !/^[A-Z]{4}$/.test(cleanSymbol)) {
            return res.status(400).json({ error: 'Kode saham harus 4 huruf kapital' });
          }
          const checkSym = await query.get('SELECT id FROM companies WHERE symbol = ? AND owner_id != ?', [cleanSymbol, userId]);
          if (checkSym) return res.status(400).json({ error: `Kode saham ${cleanSymbol} sudah terpakai` });
        }
        await query.run(
          `UPDATE companies
           SET name = ?,
               symbol = COALESCE(?, symbol),
               description = COALESCE(?, description),
               sector = COALESCE(?, sector)
           WHERE owner_id = ? AND is_bot = 0`,
          [officialName, cleanSymbol, description, sector, userId]
        );
      }

      await query.run(
        'UPDATE users SET pt_name = ?, sector = COALESCE(?, sector) WHERE id = ?',
        [officialName.replace(/^PT\s+/i, '').replace(/\s+Tbk\.?$/i, '').trim(), sector, userId]
      );

      const newsItem = {
        id: uuidv4(),
        title: `🏢 AKSI KORPORASI: Perusahaan Resmi Rebranding Menjadi ${officialName}!`,
        content: `Pendiri ${user.username} meresmikan restrukturisasi identitas dan lulus verifikasi audit legalitas menjadi ${officialName}.`,
        affected_sector: sector || user.sector,
        sentiment: 'BULLISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );
      io.emit('market:news_broadcast', newsItem);

      return res.json({
        success: true,
        message: `🎉 Berhasil merevisi data perusahaan menjadi ${officialName}! Biaya verifikasi & tim audit legalitas IB ${renameFee.toLocaleString('id-ID')} telah diselesaikan.`,
        newName: officialName,
        newSymbol: cleanSymbol
      });
    } else {
      // Perusahaan hasil akuisisi
      const comp = await query.get('SELECT * FROM companies WHERE id = ? AND owner_id = ?', [companyId, userId]);
      if (!comp) return res.status(403).json({ error: 'Anda bukan pemegang saham pengendali dari emiten ini' });

      const payFromCompany = (comp.company_balance_ib || 0) >= renameFee;
      if (!payFromCompany && user.balance_ib < renameFee) {
        return res.status(400).json({
          error: `Saldo tidak mencukupi untuk biaya verifikasi notaris & audit tim penyidikan IB ${renameFee.toLocaleString('id-ID')}`
        });
      }

      if (payFromCompany) {
        await query.run('UPDATE companies SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [renameFee, companyId]);
      } else {
        await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [renameFee, userId]);
      }

      let cleanSymbol = comp.symbol;
      if (newSymbol) {
        const testSym = newSymbol.trim().toUpperCase();
        if (testSym.length !== 4 || !/^[A-Z]{4}$/.test(testSym)) {
          return res.status(400).json({ error: 'Kode saham harus 4 huruf kapital' });
        }
        const checkSym = await query.get('SELECT id FROM companies WHERE symbol = ? AND id != ?', [testSym, companyId]);
        if (checkSym) return res.status(400).json({ error: `Kode saham ${testSym} sudah digunakan emiten lain` });
        cleanSymbol = testSym;
      }

      const officialName = formatCorporateName(newName, comp.is_ipo === 1);

      await query.run(
        `UPDATE companies
         SET name = ?,
             symbol = ?,
             description = COALESCE(?, description),
             sector = COALESCE(?, sector)
         WHERE id = ?`,
        [officialName, cleanSymbol, description, sector, companyId]
      );

      const newsItem = {
        id: uuidv4(),
        title: `🏛️ REBRANDING EMITEN AKUISISI: Resmi Berganti Menjadi ${officialName} (${cleanSymbol})!`,
        content: `Setelah melalui audit verifikasi tim legalitas, konglomerasi ${user.username} meresmikan restrukturisasi emiten menjadi ${officialName} (${cleanSymbol}).`,
        affected_sector: sector || comp.sector,
        sentiment: 'BULLISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );
      io.emit('market:news_broadcast', newsItem);

      return res.json({
        success: true,
        message: `🎉 Emiten hasil akuisisi berhasil di-rebrand menjadi ${officialName} (${cleanSymbol})! Biaya verifikasi & tim audit IB ${renameFee.toLocaleString('id-ID')} telah dipotong.`,
        newName: officialName,
        newSymbol: cleanSymbol
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// FITUR DIVESTASI / PENJUALAN SAHAM KEPEMILIKAN FOUNDER
// ----------------------------------------------------
app.post('/api/company/divest', async (req, res) => {
  try {
    const { userId, companyId, pctToSell } = req.body;
    const sellPct = parseFloat(pctToSell);
    if (!sellPct || sellPct <= 0 || sellPct > 90) {
      return res.status(400).json({ error: 'Persentase saham yang dijual harus antara 1% - 90%' });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    let comp = null;
    let isPrimary = false;
    let currentFounderPct = 100.0;
    let totalShares = 10000000;
    let currentPrice = 2500.0;
    let compDbId = companyId;

    if (companyId === 'primary') {
      if (!user.has_pt) return res.status(400).json({ error: 'Anda belum mendirikan PT' });
      isPrimary = true;
      comp = await query.get('SELECT * FROM companies WHERE owner_id = ? AND is_bot = 0', [userId]);
      if (comp) {
        compDbId = comp.id;
        currentPrice = comp.current_price;
        totalShares = comp.total_shares;
      }
      currentFounderPct = Math.max(0, 100.0 - (user.founder_shares_sold || 0) - (user.is_ipo ? 30.0 : 0.0));
    } else {
      comp = await query.get('SELECT * FROM companies WHERE id = ? AND owner_id = ?', [companyId, userId]);
      if (!comp) return res.status(403).json({ error: 'Anda bukan pemegang kendali emiten ini' });
      compDbId = comp.id;
      currentPrice = comp.current_price;
      totalShares = comp.total_shares;
      const port = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, comp.id]);
      currentFounderPct = port ? ((port.lots_owned * 100.0) / totalShares) * 100.0 : 51.0;
    }

    if (sellPct > currentFounderPct) {
      return res.status(400).json({
        error: `Persentase penjualan (${sellPct}%) melebihi kepemilikan Anda saat ini (${currentFounderPct.toFixed(1)}%).`
      });
    }

    // Hitung perolehan dana tunai penjualan saham
    const sharesSold = Math.round(totalShares * (sellPct / 100.0));
    const grossProceeds = sharesSold * currentPrice;
    const taxFee = grossProceeds * 0.001; // Pajak transaksi penjualan saham founder 0.1%
    const netProceeds = Math.round(grossProceeds - taxFee);

    // Dana tunai langsung masuk ke Kas Pribadi Founder
    await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [netProceeds, userId]);

    const newFounderPct = currentFounderPct - sellPct;
    if (isPrimary) {
      await query.run('UPDATE users SET founder_shares_sold = COALESCE(founder_shares_sold, 0) + ? WHERE id = ?', [sellPct, userId]);
      if (comp) {
        await query.run('UPDATE companies SET founder_shares_sold = COALESCE(founder_shares_sold, 0) + ? WHERE id = ?', [sellPct, comp.id]);
      }
    } else {
      const remainingLots = Math.max(0, Math.round((totalShares * (newFounderPct / 100.0)) / 100));
      await query.run('UPDATE portfolios SET lots_owned = ? WHERE user_id = ? AND company_id = ?', [remainingLots, userId, comp.id]);
      if (newFounderPct < 51.0) {
        await query.run('UPDATE companies SET is_acquired = 0 WHERE id = ?', [comp.id]);
      }
    }

    // Update Struktur Cap Table / Pemegang Saham di DB
    await query.run('DELETE FROM company_shareholders WHERE company_id = ?', [compDbId]);

    const compName = comp ? comp.name : formatCorporateName(user.pt_name, user.is_ipo === 1);
    const buyers = [
      { name: 'Konsorsium Astra Investama', pct: parseFloat((sellPct * 0.50).toFixed(1)) },
      { name: 'Dana Pensiun Mandiri Investama', pct: parseFloat((sellPct * 0.30).toFixed(1)) },
      { name: 'Investor Publik Ritel Bursa', pct: parseFloat((sellPct - (sellPct * 0.50) - (sellPct * 0.30)).toFixed(1)) }
    ];

    const otherExistingPct = 100.0 - currentFounderPct;
    const totalInst1 = parseFloat((buyers[0].pct + (otherExistingPct * 0.50)).toFixed(1));
    const totalInst2 = parseFloat((buyers[1].pct + (otherExistingPct * 0.30)).toFixed(1));
    const totalPublic = parseFloat((100.0 - newFounderPct - totalInst1 - totalInst2).toFixed(1));

    const updatedList = [
      {
        id: uuidv4(),
        company_id: compDbId,
        holder_name: `${user.username} (Pendiri${newFounderPct >= 51.0 ? ' & Pengendali' : ''})`,
        holder_type: 'FOUNDER',
        shares_count: Math.round(totalShares * (newFounderPct / 100.0)),
        percentage: parseFloat(newFounderPct.toFixed(1)),
        user_id: userId
      },
      {
        id: uuidv4(),
        company_id: compDbId,
        holder_name: 'Konsorsium Astra Investama',
        holder_type: 'INSTITUTION',
        shares_count: Math.round(totalShares * (totalInst1 / 100.0)),
        percentage: totalInst1
      },
      {
        id: uuidv4(),
        company_id: compDbId,
        holder_name: 'Dana Pensiun Mandiri Investama',
        holder_type: 'INSTITUTION',
        shares_count: Math.round(totalShares * (totalInst2 / 100.0)),
        percentage: totalInst2
      },
      {
        id: uuidv4(),
        company_id: compDbId,
        holder_name: 'Publik Ritel (Bursa Efek)',
        holder_type: 'PUBLIC',
        shares_count: Math.round(totalShares * (totalPublic / 100.0)),
        percentage: totalPublic
      }
    ];

    for (const sh of updatedList) {
      await query.run(
        'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [sh.id, sh.company_id, sh.holder_name, sh.holder_type, sh.shares_count, sh.percentage, sh.user_id || null]
      );
    }

    // Siarkan Berita Pelepasan Saham ke Bursa
    const newsItem = {
      id: uuidv4(),
      title: `💰 DIVESTASI SAHAM: Pendiri ${user.username} Menjual ${sellPct}% Saham ${compName}!`,
      content: `Pelepasan ${sellPct}% saham ke Konsorsium Astra Investama dan Dana Pensiun mencatatkan perolehan dana tunai IB ${netProceeds.toLocaleString('id-ID')} ke kas pribadi pendiri. Sisa kepemilikan pendiri: ${newFounderPct.toFixed(1)}%.`,
      affected_sector: comp ? comp.sector : user.sector,
      sentiment: 'BULLISH',
      published_at: new Date().toISOString()
    };
    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
    );
    io.emit('market:news_broadcast', newsItem);
    io.emit('user:balance_updated', { userId, newBalance: user.balance_ib + netProceeds });

    return res.json({
      success: true,
      message: `🎉 Berhasil menjual ${sellPct}% saham ${compName}! Uang tunai IB ${netProceeds.toLocaleString('id-ID')} masuk ke Kas Pribadi. Sisa kepemilikan Anda: ${newFounderPct.toFixed(1)}%.`,
      netProceeds,
      newPersonalBalance: user.balance_ib + netProceeds,
      newFounderPct: parseFloat(newFounderPct.toFixed(1)),
      buyers,
      shareholders: updatedList
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daftar Transparan Pemegang Saham Perusahaan (Cap Table)
app.get('/api/company/:id/shareholders', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;

    let comp = null;
    let user = null;
    if (userId) {
      user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    }

    if (id === 'primary') {
      if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
      comp = await query.get('SELECT * FROM companies WHERE owner_id = ? AND is_bot = 0', [user.id]);
    } else {
      comp = await query.get('SELECT * FROM companies WHERE id = ?', [id]);
    }

    const companyId = comp ? comp.id : id;
    const list = await getCompanyShareholders(companyId, user, comp || { total_shares: 10000000, is_ipo: user?.is_ipo });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. STOCK MARKET & COMPANIES (BURSA SAHAM REALISTIS)
// ----------------------------------------------------

app.get('/api/market/overview', async (req, res) => {
  try {
    const overview = simulationEngine.getMarketOverview();
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/market/running-trade', async (req, res) => {
  try {
    const liveTrades = [...simulationEngine.getRunningTrades()];
    
    // Always include the user's latest 30 trades from transactions and ipo_orders so they never vanish
    const dbUserTrades = await query.all(`
      SELECT t.id, t.type, t.lots, t.price_per_share as price, t.created_at,
             c.symbol, u.username
      FROM transactions t
      JOIN companies c ON t.company_id = c.id
      JOIN users u ON t.user_id = u.id
      WHERE t.type IN ('BUY', 'SELL')
      ORDER BY t.created_at DESC LIMIT 30
    `);

    const mappedDb = (dbUserTrades || []).map(t => {
      const d = new Date(t.created_at);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return {
        id: t.id,
        time: `${hh}:${mm}:${ss}`,
        symbol: t.symbol,
        price: t.price,
        lots: t.lots,
        type: t.type,
        username: t.username,
        isUser: true,
        timestamp: t.created_at,
      };
    });

    // Merge by id (live trades take precedence)
    const tradeMap = new Map();
    for (const t of liveTrades) {
      tradeMap.set(t.id, t);
    }
    for (const t of mappedDb) {
      if (!tradeMap.has(t.id)) {
        tradeMap.set(t.id, t);
      }
    }

    // Sort descending by timestamp/time
    const merged = Array.from(tradeMap.values()).sort((a, b) => {
      const ta = new Date(a.timestamp || a.time || 0).getTime();
      const tb = new Date(b.timestamp || b.time || 0).getTime();
      return tb - ta;
    });

    res.json(merged.slice(0, 120));
  } catch (err) {
    res.json(simulationEngine.getRunningTrades());
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const list = await query.all('SELECT * FROM news ORDER BY published_at DESC LIMIT 25');
    res.json(list || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ipo/offerings', async (req, res) => {
  try {
    const { userId } = req.query;
    const ipos = await query.all('SELECT * FROM ipo_offerings ORDER BY created_at DESC');
    let userOrders = [];
    let userBids = [];
    if (userId) {
      userOrders = await query.all('SELECT * FROM ipo_orders WHERE user_id = ?', [userId]);
      userBids = await query.all('SELECT * FROM ipo_bids WHERE bidder_user_id = ?', [userId]);
    }
    const allPendingBids = await query.all("SELECT ipo_id, count(*) as count FROM ipo_bids WHERE status = 'PENDING' GROUP BY ipo_id");
    const pendingBidsMap = Object.fromEntries(allPendingBids.map(b => [b.ipo_id, b.count]));

    const mapped = ipos.map(ipo => {
      const myOrder = userOrders.filter(o => o.ipo_id === ipo.id);
      const totalMyLots = myOrder.reduce((sum, o) => sum + o.lots, 0);
      const myBid = userBids.find(b => b.ipo_id === ipo.id);
      return {
        ...ipo,
        user_ordered_lots: totalMyLots,
        my_bid: myBid || null,
        pending_bids_count: pendingBidsMap[ipo.id] || 0,
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ipo/order', async (req, res) => {
  try {
    const { userId, ipoId, lots, paymentSource } = req.body;
    const numLots = parseInt(lots);
    if (!numLots || numLots <= 0) return res.status(400).json({ error: 'Jumlah lot pemesanan tidak valid' });

    const ipo = await query.get('SELECT * FROM ipo_offerings WHERE id = ?', [ipoId]);
    if (!ipo) return res.status(404).json({ error: 'Pilihan E-IPO tidak ditemukan' });
    if (ipo.status === 'LISTED_ARA') return res.status(400).json({ error: 'Saham ini sudah listing di bursa' });

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const totalCost = numLots * 100 * ipo.offering_price;
    const totalAvailable = (user.balance_ib || 0) + (user.company_balance_ib || 0);
    if (totalAvailable < totalCost) {
      return res.status(400).json({
        error: `Saldo Kas tidak cukup. Butuh IB ${totalCost.toLocaleString('id-ID')} (Kas Pribadi + Kas PT Anda: IB ${totalAvailable.toLocaleString('id-ID')})`
      });
    }

    // Deduct user balance (prioritize chosen paymentSource, fallback to combined balance)
    let deductPersonal = 0;
    let deductCompany = 0;
    if (paymentSource === 'COMPANY') {
      deductCompany = Math.min(user.company_balance_ib || 0, totalCost);
      deductPersonal = totalCost - deductCompany;
    } else {
      deductPersonal = Math.min(user.balance_ib || 0, totalCost);
      deductCompany = totalCost - deductPersonal;
    }
    await query.run(
      'UPDATE users SET balance_ib = balance_ib - ?, company_balance_ib = company_balance_ib - ? WHERE id = ?',
      [deductPersonal, deductCompany, userId]
    );

    const compRecord = await query.get('SELECT id, owner_id FROM companies WHERE symbol = ? OR id = ?', [ipo.symbol, ipo.company_id]);
    const orderStatus = compRecord ? 'CREDITED' : 'ALLOTED';

    // Record IPO order
    const orderId = uuidv4();
    await query.run(
      `INSERT INTO ipo_orders (id, ipo_id, user_id, lots, price_per_share, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, ipoId, userId, numLots, ipo.offering_price, totalCost, orderStatus]
    );

    // Increment ordered lots in ipo_offerings
    await query.run(
      'UPDATE ipo_offerings SET ordered_lots = COALESCE(ordered_lots, 0) + ? WHERE id = ?',
      [numLots, ipoId]
    );

    // Record in transactions & credit portfolio immediately if company exists
    const transId = uuidv4();
    if (compRecord) {
      await query.run(
        `INSERT INTO transactions (id, user_id, company_id, type, lots, price_per_share, total_amount, fee, status)
         VALUES (?, ?, ?, 'IPO', ?, ?, ?, 0, 'COMPLETED')`,
        [transId, userId, compRecord.id, numLots, ipo.offering_price, totalCost]
      );

      // Langsung tambahkan lot ke portofolio pembeli (Bookbuilding / Offering)
      const existingPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, compRecord.id]);
      if (existingPort) {
        const totalOldShares = existingPort.lots_owned * 100;
        const totalNewShares = totalOldShares + (numLots * 100);
        const newAvg = Math.round(((totalOldShares * existingPort.avg_buy_price) + totalCost) / totalNewShares);
        await query.run('UPDATE portfolios SET lots_owned = lots_owned + ?, avg_buy_price = ? WHERE id = ?', [numLots, newAvg, existingPort.id]);
      } else {
        await query.run(
          'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), userId, compRecord.id, numLots, ipo.offering_price]
        );
      }

      // Kreditkan dana segar penyerapan Bookbuilding/IPO ke Kas PT Emiten
      await query.run('UPDATE companies SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?', [totalCost, compRecord.id]);
      const ownerId = ipo.user_id || compRecord.owner_id;
      if (ownerId) {
        await query.run('UPDATE users SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?', [totalCost, ownerId]);
      }
    }

    // Add to running trades
    const nowD = new Date();
    const hh = String(nowD.getHours()).padStart(2, '0');
    const mm = String(nowD.getMinutes()).padStart(2, '0');
    const ss = String(nowD.getSeconds()).padStart(2, '0');
    simulationEngine.recordTrade({
      id: transId,
      time: `${hh}:${mm}:${ss}`,
      symbol: ipo.symbol,
      price: ipo.offering_price,
      lots: numLots,
      type: 'BUY',
      username: user.username,
      isUser: true,
      timestamp: nowD.toISOString()
    });

    const updatedUser = await query.get('SELECT balance_ib, company_balance_ib FROM users WHERE id = ?', [userId]);
    const updatedIpo = await query.get('SELECT * FROM ipo_offerings WHERE id = ?', [ipoId]);

    await recordCashFlow({
      userId,
      companyId: compRecord ? compRecord.id : (ipo.company_id || null),
      accountType: deductCompany > 0 && deductPersonal === 0 ? 'COMPANY' : 'PERSONAL',
      category: 'IPO_SUBSCRIBE',
      title: `Pembelian Saham E-IPO ${ipo.symbol} (${numLots} Lot)`,
      amountIb: totalCost,
      direction: 'EXPENSE',
      balanceAfter: deductCompany > 0 && deductPersonal === 0 ? updatedUser.company_balance_ib : updatedUser.balance_ib,
      notes: `Pembelian ${ipo.status === 'BOOKBUILDING' ? 'Bookbuilding' : 'Penawaran Umum'} E-IPO ${ipo.company_name} @ IB ${ipo.offering_price.toLocaleString('id-ID')}`
    });

    io.emit('ipo:ordered', { ipoId, symbol: ipo.symbol, orderedLots: updatedIpo.ordered_lots });

    res.json({
      success: true,
      message: `🎉 Berhasil membeli ${numLots.toLocaleString('id-ID')} Lot saham E-IPO ${ipo.company_name} (${ipo.symbol}) pada tahap ${ipo.status === 'BOOKBUILDING' ? 'Bookbuilding' : 'Penawaran Umum'}! Saham telah tercatat di portofolio Anda.`,
      newBalance: updatedUser.balance_ib,
      newCompanyBalance: updatedUser.company_balance_ib,
      orderedLots: updatedIpo.ordered_lots
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ipo/list-now', async (req, res) => {
  try {
    const { ipoId } = req.body;
    const ipo = await query.get('SELECT * FROM ipo_offerings WHERE id = ?', [ipoId]);
    if (!ipo) return res.status(404).json({ error: 'Data IPO tidak ditemukan' });
    if (ipo.status === 'LISTED_ARA') return res.status(400).json({ error: 'Saham sudah listing sebelumnya' });

    // Ketentuan ARA Hari Pertama Listing: 2x batas ARA normal!
    const araPct = ipo.first_day_ara_pct || (ipo.offering_price <= 200 ? 70.0 : (ipo.offering_price <= 5000 ? 50.0 : 40.0));
    const araPrice = Math.round(ipo.offering_price * (1 + (araPct / 100.0)));

    // Update status IPO
    await query.run('UPDATE ipo_offerings SET status = ? WHERE id = ?', ['LISTED_ARA', ipoId]);

    // Create company in companies table if not exists or update
    let comp = await query.get('SELECT * FROM companies WHERE symbol = ?', [ipo.symbol]);
    const compId = comp ? comp.id : (ipo.company_id || uuidv4());

    if (!comp) {
      await query.run(
        `INSERT INTO companies (id, symbol, name, sector, is_bot, status, current_price, base_price, total_shares, circulating_shares, dividend_rate, fundamental_score, owner_id, is_ipo, description, prev_close, daily_high, daily_low)
         VALUES (?, ?, ?, ?, ?, 'HEALTHY', ?, ?, ?, ?, 0.04, 88.0, ?, 1, ?, ?, ?, ?)`,
        [
          compId,
          ipo.symbol,
          ipo.company_name,
          ipo.sector,
          ipo.user_id ? 0 : 1,
          araPrice, // Langsung melonjak ke harga ARA!
          ipo.offering_price,
          ipo.total_offering_shares * 3,
          ipo.total_offering_shares,
          ipo.user_id || null,
          ipo.description,
          ipo.offering_price,
          araPrice,
          ipo.offering_price
        ]
      );
    } else {
      await query.run(
        'UPDATE companies SET current_price = ?, prev_close = ?, daily_high = ?, base_price = ? WHERE id = ?',
        [araPrice, ipo.offering_price, araPrice, ipo.offering_price, compId]
      );
    }

    // Distribute alloted IPO shares to users' portfolios!
    const orders = await query.all("SELECT * FROM ipo_orders WHERE ipo_id = ? AND status = 'ALLOTED'", [ipoId]);
    for (const ord of orders) {
      const existingPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [ord.user_id, compId]);
      if (existingPort) {
        const totalOldShares = existingPort.lots_owned * 100;
        const totalNewShares = totalOldShares + (ord.lots * 100);
        const newAvg = ((totalOldShares * existingPort.avg_buy_price) + (ord.lots * 100 * ipo.offering_price)) / totalNewShares;
        await query.run('UPDATE portfolios SET lots_owned = lots_owned + ?, avg_buy_price = ? WHERE id = ?', [ord.lots, newAvg, existingPort.id]);
      } else {
        await query.run(
          'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), ord.user_id, compId, ord.lots, ipo.offering_price]
        );
      }
      await query.run("UPDATE ipo_orders SET status = 'CREDITED' WHERE id = ?", [ord.id]);
    }

    // Dana segar hasil penyerapan IPO publik masuk ke Kas Brankas Perusahaan (Emiten)
    const totalAllotedLots = orders.reduce((sum, ord) => sum + (ord.lots || 0), 0);
    const ipoProceeds = totalAllotedLots * 100 * ipo.offering_price;
    if (ipoProceeds > 0) {
      await query.run('UPDATE companies SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?', [ipoProceeds, compId]);
      const currentCompData = await query.get('SELECT * FROM companies WHERE id = ?', [compId]);
      if (currentCompData && currentCompData.owner_id) {
        await recordCashFlow({
          userId: currentCompData.owner_id,
          companyId: compId,
          accountType: 'COMPANY',
          category: 'IPO_PROCEEDS',
          title: `Pencairan Dana Segar IPO ${ipo.symbol} (${totalAllotedLots.toLocaleString('id-ID')} Lot)`,
          amountIb: ipoProceeds,
          direction: 'INCOME',
          balanceAfter: currentCompData.company_balance_ib,
          notes: `Hasil penyerapan publik atas ${totalAllotedLots.toLocaleString('id-ID')} Lot IPO resmi dicairkan ke Kas Brankas Perusahaan untuk ekspansi usaha.`
        });
      }
    }

    // Siarkan Berita ARA Listing Perdana ke Bursa
    const newsItem = {
      id: uuidv4(),
      title: `🚀 LISTING PERDANA IPO: ${ipo.company_name} (${ipo.symbol}) Terbang ARA +${araPct}%!`,
      content: `Pencatatan perdana saham ${ipo.symbol} di Bursa Efek Capital Federation (CFX) langsung menyentuh batas AUTO REJECTION ATAS (ARA +${araPct}%) di harga IB ${araPrice.toLocaleString('id-ID')}. Antrean beli menggunung dan antrean jual (offer) kosong total! Seluruh investor ritel pemegang IPO panen cuan maksimal!`,
      affected_sector: ipo.sector,
      sentiment: 'BULLISH',
      published_at: new Date().toISOString()
    };
    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
    );
    io.emit('market:news_broadcast', newsItem);
    io.emit('ipo:listed', { ipoId, symbol: ipo.symbol, araPrice, araPct });

    res.json({
      success: true,
      message: `🎉 Listing perdana ${ipo.symbol} sukses! Saham langsung terbang ARA +${araPct}% di harga IB ${araPrice.toLocaleString('id-ID')}. Seluruh pesanan IPO telah masuk ke portofolio investor.`,
      araPrice,
      araPct
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Transisi Tahapan Siklus E-IPO (Bookbuilding -> Offering -> Allotment -> Listed ARA)
app.post('/api/ipo/advance-status', async (req, res) => {
  try {
    const { ipoId, status } = req.body;
    const ipo = await query.get('SELECT * FROM ipo_offerings WHERE id = ?', [ipoId]);
    if (!ipo) return res.status(404).json({ error: 'Data IPO tidak ditemukan' });

    const validStatuses = ['BOOKBUILDING', 'OFFERING', 'ALLOTMENT', 'LISTED', 'LISTED_ARA'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status tahapan E-IPO tidak valid' });
    }

    if (status === 'LISTED' || status === 'LISTED_ARA') {
      const araPct = ipo.first_day_ara_pct || (ipo.offering_price <= 200 ? 70.0 : (ipo.offering_price <= 5000 ? 50.0 : 40.0));
      const araPrice = Math.round(ipo.offering_price * (1 + (araPct / 100.0)));
      await query.run('UPDATE ipo_offerings SET status = ? WHERE id = ?', ['LISTED_ARA', ipoId]);
      
      let comp = await query.get('SELECT * FROM companies WHERE symbol = ?', [ipo.symbol]);
      const compId = comp ? comp.id : (ipo.company_id || uuidv4());

      if (!comp) {
        await query.run(
          `INSERT INTO companies (id, symbol, name, sector, is_bot, status, current_price, base_price, total_shares, circulating_shares, dividend_rate, fundamental_score, owner_id, is_ipo, description, prev_close, daily_high, daily_low)
           VALUES (?, ?, ?, ?, ?, 'HEALTHY', ?, ?, ?, ?, 0.04, 88.0, ?, 1, ?, ?, ?, ?)`,
          [
            compId, ipo.symbol, ipo.company_name, ipo.sector, ipo.user_id ? 0 : 1,
            araPrice, ipo.offering_price, ipo.total_offering_shares, ipo.total_offering_shares,
            ipo.user_id || null, ipo.description, ipo.offering_price, araPrice, ipo.offering_price
          ]
        );
      } else {
        await query.run(
          "UPDATE companies SET is_ipo = 1, listing_status = 'LISTED', current_price = ?, prev_close = ?, daily_high = ?, base_price = ? WHERE id = ?",
          [araPrice, ipo.offering_price, araPrice, ipo.offering_price, compId]
        );
      }

      // Distribusikan saham pesanan IPO yang belum dikreditkan ke portofolio
      const orders = await query.all("SELECT * FROM ipo_orders WHERE ipo_id = ? AND status = 'ALLOTED'", [ipoId]);
      for (const ord of orders) {
        const existingPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [ord.user_id, compId]);
        if (existingPort) {
          const totalOldShares = existingPort.lots_owned * 100;
          const totalNewShares = totalOldShares + (ord.lots * 100);
          const newAvg = ((totalOldShares * existingPort.avg_buy_price) + (ord.lots * 100 * ipo.offering_price)) / totalNewShares;
          await query.run('UPDATE portfolios SET lots_owned = lots_owned + ?, avg_buy_price = ? WHERE id = ?', [ord.lots, newAvg, existingPort.id]);
        } else {
          await query.run(
            'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), ord.user_id, compId, ord.lots, ipo.offering_price]
          );
        }
        await query.run("UPDATE ipo_orders SET status = 'CREDITED' WHERE id = ?", [ord.id]);
      }

      io.emit('ipo:listed', { ipoId, symbol: ipo.symbol, araPrice, araPct });
      return res.json({
        success: true,
        message: `🎉 Saham ${ipo.company_name} (${ipo.symbol}) resmi melantai perdana ARA di Bursa Efek Capital Federation!`,
        status: 'LISTED_ARA',
        araPrice
      });
    }

    await query.run('UPDATE ipo_offerings SET status = ? WHERE id = ?', [status, ipoId]);
    io.emit('ipo:status_updated', { ipoId, symbol: ipo.symbol, status });
    res.json({ success: true, message: `Status tahapan E-IPO ${ipo.symbol} berhasil dialihkan ke ${status}`, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atur / Edit Tanggal Jadwal Pelaksanaan 4 Tahap E-IPO
app.post('/api/ipo/update-schedule', async (req, res) => {
  try {
    const { ipoId, userId, bookbuildingDate, offeringDate, allotmentDate, listingDate, status } = req.body;
    const ipo = await query.get('SELECT * FROM ipo_offerings WHERE id = ?', [ipoId]);
    if (!ipo) return res.status(404).json({ error: 'Data IPO tidak ditemukan' });

    if (userId && ipo.user_id && ipo.user_id !== userId) {
      return res.status(403).json({ error: 'Hanya pendiri / emiten yang berhak mengubah jadwal IPO' });
    }

    await query.run(
      `UPDATE ipo_offerings
       SET bookbuilding_date = COALESCE(?, bookbuilding_date),
           offering_date = COALESCE(?, offering_date),
           allotment_date = COALESCE(?, allotment_date),
           listing_date = COALESCE(?, listing_date),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [bookbuildingDate || null, offeringDate || null, allotmentDate || null, listingDate || null, status || null, ipoId]
    );

    const updated = await query.get('SELECT * FROM ipo_offerings WHERE id = ?', [ipoId]);
    io.emit('ipo:schedule_updated', updated);

    res.json({
      success: true,
      message: `Jadwal 4 Tahap E-IPO ${ipo.symbol} berhasil diperbarui!`,
      ipo: updated
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/companies', async (req, res) => {
  try {
    const { sector, status, search } = req.query;
    let sql = `
      SELECT *,
        ROUND(((current_price - CASE WHEN prev_close > 0 THEN prev_close ELSE base_price END) / 
               CASE WHEN prev_close > 0 THEN prev_close ELSE base_price END) * 100, 2) AS price_change_pct
      FROM companies WHERE (listing_status = 'LISTED' OR listing_status IS NULL)
    `;
    const params = [];

    if (sector && sector !== 'ALL') {
      sql += ' AND sector = ?';
      params.push(sector);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (symbol LIKE ? OR name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY current_price DESC';
    const companies = await query.all(sql, params);
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/companies/:id', async (req, res) => {
  try {
    const company = await query.get('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    // Check if company is in Pre-IPO / Unlisted stage
    const ipo = await query.get(
      "SELECT * FROM ipo_offerings WHERE (company_id = ? OR symbol = ?) AND status NOT IN ('LISTED', 'LISTED_ARA')",
      [company.id, company.symbol]
    );
    const isPreIpo = company.listing_status === 'PRE_IPO' || !!ipo;
    const baseVal = ipo ? ipo.offering_price : (company.base_price > 0 ? company.base_price : 2500);

    if (isPreIpo) {
      company.current_price = baseVal;
      company.prev_close = baseVal;
      company.daily_high = baseVal;
      company.daily_low = baseVal;
      company.listing_status = 'PRE_IPO';
      if (ipo) {
        company.listing_date = ipo.listing_date;
        company.ipo_status = ipo.status;
      }

      const generatedHistory = [];
      const now = Date.now();
      const intervalMs = 60000;
      for (let i = 0; i < 24; i++) {
        generatedHistory.push({
          id: `preipo-candle-${i}`,
          company_id: company.id,
          open: baseVal,
          high: baseVal,
          low: baseVal,
          close: baseVal,
          price: baseVal,
          volume: 0,
          timestamp: new Date(now - ((24 - i) * intervalMs)).toISOString()
        });
      }

      return res.json({
        ...company,
        is_pre_ipo: true,
        listing_status: 'PRE_IPO',
        listing_date: ipo ? ipo.listing_date : '1 Nov 2026',
        ipo_status: ipo ? ipo.status : 'BOOKBUILDING',
        timeframe: (req.query.range || '1D').toUpperCase(),
        history: generatedHistory,
        orderbook: {
          bids: [
            { price: baseVal, lots: ipo ? (ipo.ordered_lots || 1000) : 1000, freq: 1 }
          ],
          offers: [],
          totalBidLots: ipo ? (ipo.ordered_lots || 1000) : 1000,
          totalOfferLots: 0,
          buyPressurePct: 100,
          sellPressurePct: 0
        }
      });
    }

    const range = (req.query.range || '1D').toUpperCase();
    const isCritical = company.status === 'CRITICAL';
    const refPrice = company.prev_close > 0 ? company.prev_close : company.base_price;

    // Generate realistic multi-wave candles according to selected timeframe (1D, 1W, 1M, ALL)
    let pointCount = 24;
    let startPrice = refPrice;

    if (range === '1D') {
      pointCount = 24;
      startPrice = refPrice;
    } else if (range === '1W') {
      pointCount = 18;
      startPrice = isCritical ? Math.round(refPrice * 1.25) : Math.round(refPrice * 0.88);
    } else if (range === '1M') {
      pointCount = 30;
      startPrice = isCritical ? Math.round(refPrice * 1.45) : Math.round(refPrice * 0.78);
    } else { // ALL
      pointCount = 36;
      startPrice = company.base_price;
    }

    const netChange = company.current_price - startPrice;
    const swingFactor = Math.max(refPrice * 0.05, Math.abs(netChange) * 0.25);

    // Seeded pseudo-random so same timeframe & company gives consistent realistic chart
    const seed = (company.symbol || 'IDX').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + (range.charCodeAt(0) * 19);
    const pseudoRand = (idx) => {
      const x = Math.sin(seed + idx * 823.17) * 10000;
      return x - Math.floor(x);
    };

    // Realistic financial market swing anchors (peaks, valleys, pullbacks, breakouts)
    const anchors = isCritical
      ? [
          { t: 0.0, price: startPrice },
          { t: 0.18, price: startPrice + (netChange * 0.25) - (swingFactor * 0.6) },
          { t: 0.38, price: startPrice + (netChange * 0.15) + (swingFactor * 0.4) }, // dead cat bounce
          { t: 0.58, price: startPrice + (netChange * 0.60) - (swingFactor * 0.8) }, // breakdown
          { t: 0.78, price: startPrice + (netChange * 0.50) + (swingFactor * 0.3) }, // weak consolidation
          { t: 0.90, price: startPrice + (netChange * 0.95) - (swingFactor * 0.4) }, // panic sell
          { t: 1.0, price: company.current_price }
        ]
      : [
          { t: 0.0, price: startPrice },
          { t: 0.18, price: startPrice + (netChange * 0.20) + (swingFactor * 0.5) }, // morning leg
          { t: 0.36, price: startPrice + (netChange * 0.10) - (swingFactor * 0.35) }, // pullback
          { t: 0.55, price: startPrice + (netChange * 0.60) + (swingFactor * 0.7) }, // breakout
          { t: 0.75, price: startPrice + (netChange * 0.45) - (swingFactor * 0.3) }, // consolidation
          { t: 0.88, price: startPrice + (netChange * 0.90) + (swingFactor * 0.4) }, // afternoon push
          { t: 1.0, price: company.current_price }
        ];

    const interpolateAnchors = (t) => {
      if (t <= 0) return anchors[0].price;
      if (t >= 1) return anchors[anchors.length - 1].price;
      for (let j = 0; j < anchors.length - 1; j++) {
        if (t >= anchors[j].t && t <= anchors[j + 1].t) {
          const segT = (t - anchors[j].t) / (anchors[j + 1].t - anchors[j].t);
          // Smooth Hermite cubic interpolation
          const smooth = segT * segT * (3 - 2 * segT);
          return anchors[j].price + (anchors[j + 1].price - anchors[j].price) * smooth;
        }
      }
      return company.current_price;
    };

    const generatedHistory = [];
    let prevClose = startPrice;
    const now = Date.now();
    const intervalMs = range === '1D' ? 60000 : (range === '1W' ? 43200000 : 86400000);

    for (let i = 0; i < pointCount; i++) {
      const isLast = (i === pointCount - 1);
      const isFirst = (i === 0);
      const t = i / (pointCount - 1);

      let candleClose;
      if (isLast) {
        candleClose = company.current_price;
      } else if (isFirst) {
        candleClose = startPrice;
      } else {
        const basePriceAtT = interpolateAnchors(t);
        const microWave = Math.sin(t * Math.PI * 6.5 + seed) * (refPrice * 0.012);
        const jitter = (pseudoRand(i) - 0.5) * (refPrice * 0.016);
        candleClose = Math.max(50, Math.round(basePriceAtT + microWave + jitter));
      }

      const candleOpen = isFirst ? startPrice : prevClose;
      const spread = Math.abs(candleClose - candleOpen);
      const wickHigh = Math.round((pseudoRand(i * 3 + 1) * 0.45 + 0.15) * (spread + refPrice * 0.008));
      const wickLow = Math.round((pseudoRand(i * 3 + 2) * 0.45 + 0.15) * (spread + refPrice * 0.008));

      const candleHigh = Math.max(candleOpen, candleClose) + wickHigh;
      const candleLow = Math.max(50, Math.min(candleOpen, candleClose) - wickLow);

      generatedHistory.push({
        id: `candle-${i}`,
        company_id: company.id,
        open: candleOpen,
        high: candleHigh,
        low: candleLow,
        close: candleClose,
        price: candleClose, // for line chart compatibility
        volume: Math.floor(250 + pseudoRand(i * 5) * 800),
        timestamp: new Date(now - ((pointCount - i) * intervalMs)).toISOString()
      });

      prevClose = candleClose;
    }

    // 5-Level Dynamic Orderbook with authentic Bids & Asks
    const tickSize = company.current_price >= 5000 ? 25 : (company.current_price >= 2000 ? 10 : 5);
    const bids = [];
    const offers = [];
    let totalBidLots = 0;
    let totalOfferLots = 0;

    const isSuspended = company.status === 'SUSPENDED';

    if (isSuspended) {
      // Status SUSPENSI: Perdagangan dibekukan oleh IPMC
      totalBidLots = 0;
      totalOfferLots = 0;
    } else {
      for (let i = 1; i <= 5; i++) {
        const bidPrice = Math.max(50, Math.round(company.current_price - (i - 1) * tickSize));
        const offerPrice = Math.round(company.current_price + i * tickSize);

        const baseLot = 350 + (i * 180) + Math.floor(Math.random() * 200);
        const bidLots = isCritical ? Math.round(baseLot * 0.55) : Math.round(baseLot * 1.15);
        const offerLots = isCritical ? Math.round(baseLot * 1.45) : Math.round(baseLot * 0.95);

        totalBidLots += bidLots;
        totalOfferLots += offerLots;

        bids.push({ price: bidPrice, lots: bidLots, freq: Math.floor(bidLots / 120) + 3 });
        offers.push({ price: offerPrice, lots: offerLots, freq: Math.floor(offerLots / 120) + 3 });
      }
    }

    const totalDepth = totalBidLots + totalOfferLots;
    const buyPressurePct = totalDepth > 0 ? Math.round((totalBidLots / totalDepth) * 100) : 100;
    const sellPressurePct = 100 - buyPressurePct;

    res.json({
      ...company,
      timeframe: range,
      history: generatedHistory,
      orderbook: {
        bids,
        offers,
        totalBidLots,
        totalOfferLots,
        buyPressurePct,
        sellPressurePct,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buy / Sell Orders (1 Lot = 100 Lembar, Menggunakan Kas Pribadi)
app.post('/api/trade/order', async (req, res) => {
  try {
    const { userId, companyId, type, lots } = req.body;
    if (!userId || !companyId || !type || !lots || lots <= 0) {
      return res.status(400).json({ error: 'Parameter trading tidak valid' });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
    if (user.is_banned) return res.status(403).json({ error: 'Akun dibekukan' });

    const company = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!company) return res.status(404).json({ error: 'Emiten tidak ditemukan' });

    if (company.is_seized === 1) {
      return res.status(400).json({
        error: `⛔ Perdagangan saham ${company.symbol} DIBEKUKAN oleh Pengadilan Niaga PNAF & BCF karena perseroan dalam status sitaan negara.`
      });
    }

    if (company.listing_status === 'PRE_IPO' || company.status === 'PRE_IPO') {
      return res.status(400).json({
        error: `⛔ Saham ${company.symbol} masih dalam tahap penawaran perdana (Pre-IPO) dan belum resmi melantai di bursa sekunder! Silakan pesan penjatahan melalui menu E-IPO.`
      });
    }

    if (company.status === 'SUSPENDED') {
      return res.status(400).json({
        error: `⛔ Perdagangan saham ${company.symbol} sedang di-SUSPENSI oleh bursa IPMC demi perlindungan investor. Silakan selesaikan denda administrasi pemulihan suspensi terlebih dahulu.`
      });
    }

    const shares = lots * 100; // 1 Lot = 100 Lembar
    const pricePerShare = company.current_price;
    const grossAmount = shares * pricePerShare;

    // Fee (0.15% normal, 0.05% for Blue Chip)
    const feePct = user.is_blue_chip ? 0.0005 : 0.0015;
    const fee = Math.round(grossAmount * feePct);

    if (type === 'BUY') {
      // Guard: Cek batas maksimum saham yang beredar di bursa reguler (Floating Shares)
      const maxPublicLots = Math.max(1, Math.floor((company.circulating_shares || (company.total_shares * 0.3)) / 100));
      const existingPortfolio = await query.get(
        'SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?',
        [userId, companyId]
      );
      const currentLots = existingPortfolio?.lots_owned || 0;
      if (currentLots + lots > maxPublicLots) {
        const founderHoldLots = Math.floor((company.total_shares - (company.circulating_shares || (company.total_shares * 0.3))) / 100);
        return res.status(400).json({
          error: `Batas Maksimum Saham Publik! Saham ${company.symbol} yang beredar di bursa reguler hanya ${maxPublicLots.toLocaleString('id-ID')} lot (${(((company.circulating_shares || (company.total_shares * 0.3)) / company.total_shares) * 100).toFixed(0)}%). Sisa ${founderHoldLots.toLocaleString('id-ID')} lot dipegang oleh Pendiri & Pengendali (Non-Floating).`
        });
      }

      const totalCost = grossAmount + fee;
      if (user.balance_ib < totalCost) {
        return res.status(400).json({ error: `Saldo Kas Pribadi tidak cukup. Butuh IB ${totalCost.toLocaleString('id-ID')}` });
      }

      await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [totalCost, userId]);

      if (existingPortfolio) {
        const totalOldShares = existingPortfolio.lots_owned * 100;
        const totalNewShares = totalOldShares + shares;
        const newAvgPrice = ((totalOldShares * existingPortfolio.avg_buy_price) + grossAmount) / totalNewShares;

        await query.run(
          'UPDATE portfolios SET lots_owned = lots_owned + ?, avg_buy_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [lots, newAvgPrice, existingPortfolio.id]
        );
      } else {
        await query.run(
          `INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price)
           VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), userId, companyId, lots, pricePerShare]
        );
      }

      // Record transaction
      const transId = uuidv4();
      await query.run(
        `INSERT INTO transactions (id, user_id, company_id, type, lots, price_per_share, total_amount, fee, status)
         VALUES (?, ?, ?, 'BUY', ?, ?, ?, ?, 'COMPLETED')`,
        [transId, userId, companyId, lots, pricePerShare, totalCost, fee]
      );

      const postBuyUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [userId]);
      await recordCashFlow({
        userId,
        companyId,
        accountType: 'PERSONAL',
        category: 'STOCK_BUY',
        title: `Beli Saham ${company.symbol} (${lots} Lot)`,
        amountIb: totalCost,
        direction: 'EXPENSE',
        balanceAfter: postBuyUser ? postBuyUser.balance_ib : (user.balance_ib - totalCost),
        notes: `Beli ${lots} Lot (${shares.toLocaleString('id-ID')} lembar) @ IB ${pricePerShare.toLocaleString('id-ID')} (Fee: IB ${fee.toLocaleString('id-ID')})`
      });

      // Market Impact: Buying lots pushes price up and injects fundamental score!
      const priceBoostPct = Math.min(0.08, (lots / 1000) * 0.05); // 100 lots = +0.5%, 1000 lots = +5%
      const newPrice = Math.round(company.current_price * (1 + priceBoostPct));
      const scoreBoost = Math.min(25, (lots / 50) * 1.5);
      const newScore = Math.min(100, (company.fundamental_score || 70) + scoreBoost);
      let newStatus = company.status;

      // Auto-recovery from CRITICAL when market accumulation drives fundamental score >= 50!
      if (company.status === 'CRITICAL' && newScore >= 50) {
        newStatus = 'HEALTHY';
        const recoveryNews = {
          id: uuidv4(),
          title: `🎉 AKSI KORPORASI: Saham ${company.symbol} Berhasil Pulih dari Krisis!`,
          content: `Injeksi modal masif dari akumulasi beli ${lots} Lot berhasil memulihkan kinerja ${company.name} kembali ke status SEHAT.`,
          affected_sector: company.sector,
          sentiment: 'BULLISH',
          published_at: new Date().toISOString()
        };
        await query.run(
          'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
          [recoveryNews.id, recoveryNews.title, recoveryNews.content, recoveryNews.affected_sector, recoveryNews.sentiment, recoveryNews.published_at]
        );
        io.emit('market:news_broadcast', recoveryNews);
      }

      // Rebound Trend ke Bullish Rally (+10% s/d +35% ARA) saat investor beli lot
      if (simulationEngine && simulationEngine.stockTrends) {
        const curTrend = simulationEngine.stockTrends.get(companyId) || 0.0;
        const trendGain = Math.min(18.0, (lots / 100) * 1.5);
        const nextTrend = Math.min(35.0, Math.max(curTrend + trendGain, 5.0));
        simulationEngine.stockTrends.set(companyId, nextTrend);
      }

      await query.run(
        'UPDATE companies SET current_price = ?, fundamental_score = ?, status = ? WHERE id = ?',
        [newPrice, newScore, newStatus, companyId]
      );

      // Cek rasio kepemilikan saham di portofolio
      const currentPort = await query.get(
        'SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?',
        [userId, companyId]
      );
      const totalOwnedShares = (currentPort?.lots_owned || 0) * 100;
      const ownershipRatio = totalOwnedShares / company.total_shares;

      let acquiredNotice = '';
      if (ownershipRatio >= 0.05) {
        acquiredNotice = ` 📊 Anda kini menguasai ${(ownershipRatio * 100).toFixed(1)}% saham ${company.symbol} di portofolio Anda.`;
      }

      // Broadcast and record trade in Running Trade stream
      const nowBuy = new Date();
      const hhB = String(nowBuy.getHours()).padStart(2, '0');
      const mmB = String(nowBuy.getMinutes()).padStart(2, '0');
      const ssB = String(nowBuy.getSeconds()).padStart(2, '0');
      simulationEngine.recordTrade({
        id: transId,
        time: `${hhB}:${mmB}:${ssB}`,
        symbol: company.symbol,
        price: pricePerShare,
        lots: lots,
        type: 'BUY',
        username: user.username,
        isUser: true,
        timestamp: nowBuy.toISOString()
      });

      io.emit('trade:executed', {
        type: 'BUY',
        symbol: company.symbol,
        lots,
        pricePerShare,
        totalAmount: totalCost,
        userName: user.username,
        newStatus
      });

      return res.json({
        success: true,
        message: `Berhasil membeli ${lots} Lot (${shares} lembar) ${company.symbol} seharga IB ${totalCost.toLocaleString('id-ID')}.${acquiredNotice}`,
        newBalance: user.balance_ib - totalCost,
        status: newStatus
      });
    } else if (type === 'SELL') {
      const portfolio = await query.get(
        'SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?',
        [userId, companyId]
      );

      if (!portfolio || portfolio.lots_owned < lots) {
        return res.status(400).json({ error: 'Jumlah Lot saham yang dimiliki tidak mencukupi untuk dijual' });
      }

      const netProceeds = grossAmount - fee;
      await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [netProceeds, userId]);

      const remainingLots = portfolio.lots_owned - lots;
      if (remainingLots === 0) {
        await query.run('DELETE FROM portfolios WHERE id = ?', [portfolio.id]);
      } else {
        await query.run('UPDATE portfolios SET lots_owned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [remainingLots, portfolio.id]);
      }

      // If user sells below 51%, release majority ownership
      if (remainingLots === 0 || ((remainingLots * 100) / company.total_shares < 0.51)) {
        if (company.owner_id === userId) {
          await query.run('UPDATE companies SET owner_id = NULL, is_acquired = 0 WHERE id = ?', [companyId]);
        }
      }

      // Market Impact: Selling lots creates dump pressure and drops price
      const priceDropPct = Math.min(0.08, (lots / 1000) * 0.05);
      const newPrice = Math.max(50, Math.round(company.current_price * (1 - priceDropPct)));
      const scoreDrop = Math.min(15, (lots / 100) * 1.0);
      const newScore = Math.max(15, (company.fundamental_score || 70) - scoreDrop);
      let newStatus = company.status;

      // Fall into CRITICAL if massive dump drives fundamental score < 40
      if (company.status === 'HEALTHY' && newScore < 40) {
        newStatus = 'CRITICAL';
        const panicNews = {
          id: uuidv4(),
          title: `⚠️ BURSA PANIK: Saham ${company.symbol} Jatuh ke Status Krisis!`,
          content: `Gelombang aksi jual ${lots} Lot menekan kinerja fundamental ${company.name} ke level kritis.`,
          affected_sector: company.sector,
          sentiment: 'BEARISH',
          published_at: new Date().toISOString()
        };
        await query.run(
          'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
          [panicNews.id, panicNews.title, panicNews.content, panicNews.affected_sector, panicNews.sentiment, panicNews.published_at]
        );
        io.emit('market:news_broadcast', panicNews);
      }

      await query.run(
        'UPDATE companies SET current_price = ?, fundamental_score = ?, status = ? WHERE id = ?',
        [newPrice, newScore, newStatus, companyId]
      );

      // Record transaction
      const transId = uuidv4();
      await query.run(
        `INSERT INTO transactions (id, user_id, company_id, type, lots, price_per_share, total_amount, fee, status)
         VALUES (?, ?, ?, 'SELL', ?, ?, ?, ?, 'COMPLETED')`,
        [transId, userId, companyId, lots, pricePerShare, netProceeds, fee]
      );

      const postSellUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [userId]);
      await recordCashFlow({
        userId,
        companyId,
        accountType: 'PERSONAL',
        category: 'STOCK_SELL',
        title: `Jual Saham ${company.symbol} (${lots} Lot)`,
        amountIb: netProceeds,
        direction: 'INCOME',
        balanceAfter: postSellUser ? postSellUser.balance_ib : (user.balance_ib + netProceeds),
        notes: `Jual ${lots} Lot (${shares.toLocaleString('id-ID')} lembar) @ IB ${pricePerShare.toLocaleString('id-ID')} (Net setelah fee: IB ${netProceeds.toLocaleString('id-ID')})`
      });

      // Broadcast and record trade in Running Trade stream
      const nowSell = new Date();
      const hhS = String(nowSell.getHours()).padStart(2, '0');
      const mmS = String(nowSell.getMinutes()).padStart(2, '0');
      const ssS = String(nowSell.getSeconds()).padStart(2, '0');
      simulationEngine.recordTrade({
        id: transId,
        time: `${hhS}:${mmS}:${ssS}`,
        symbol: company.symbol,
        price: pricePerShare,
        lots: lots,
        type: 'SELL',
        username: user.username,
        isUser: true,
        timestamp: nowSell.toISOString()
      });

      io.emit('trade:executed', {
        type: 'SELL',
        symbol: company.symbol,
        lots,
        pricePerShare,
        totalAmount: netProceeds,
        userName: user.username,
        newStatus
      });

      return res.json({
        success: true,
        message: `Berhasil menjual ${lots} Lot (${shares} lembar) ${company.symbol} seharga IB ${netProceeds.toLocaleString('id-ID')}`,
        newBalance: user.balance_ib + netProceeds,
        status: newStatus
      });
    }

    res.status(400).json({ error: 'Tipe order tidak dikenal' });
  } catch (err) {
    console.error('Trading error:', err);
    res.status(500).json({ error: 'Gagal mengeksekusi order saham' });
  }
});

// Suspend Company Stock (Bursa IPMC Regulatory Action)
app.post('/api/company/suspend', async (req, res) => {
  try {
    const { companyId, reason } = req.body;
    if (!companyId) return res.status(400).json({ error: 'Company ID diperlukan' });

    const company = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!company) return res.status(404).json({ error: 'Emiten tidak ditemukan' });

    const suspendedAt = new Date().toISOString();
    await query.run('UPDATE companies SET status = ?, suspended_at = ?, suspend_until = NULL WHERE id = ?', ['SUSPENDED', suspendedAt, companyId]);

    const newsItem = {
      id: uuidv4(),
      title: `⛔ BURSA IPMC: Perdagangan Saham ${company.symbol} Resmi Disuspensi`,
      content: reason || `Bursa Efek IPMC resmi membekukan (suspensi) sementara perdagangan saham ${company.name} (${company.symbol}) demi melindungi modal investor. Pemilik diberi waktu 3 hari kalender untuk melunasi denda pemulihan atau melakukan penjualan saham darurat sebelum aset perseroan disita dan dikelola oleh IPMC.`,
      affected_sector: company.sector,
      sentiment: 'BEARISH',
      published_at: suspendedAt
    };

    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
    );

    io.emit('market:news_broadcast', newsItem);
    io.emit('company:status_changed', { companyId: company.id, symbol: company.symbol, status: 'SUSPENDED', suspendedAt });

    res.json({
      success: true,
      status: 'SUSPENDED',
      suspendedAt,
      message: `Saham ${company.symbol} berhasil disuspensi oleh bursa IPMC.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lift Suspension (Bayar Denda Pemulihan IPMC IB 50.000.000)
app.post('/api/company/unsuspend', async (req, res) => {
  try {
    const { companyId, userId } = req.body;
    if (!companyId || !userId) return res.status(400).json({ error: 'Company ID dan User ID diperlukan' });

    const company = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!company) return res.status(404).json({ error: 'Emiten tidak ditemukan' });
    if (company.status !== 'SUSPENDED') {
      return res.status(400).json({ error: `Saham ${company.symbol} saat ini tidak berstatus SUSPENSI (status: ${company.status})` });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Validasi Kepemilikan: Hanya pemilik resmi emiten atau Admin yang berhak bayar denda pemulihan
    if (company.owner_id && company.owner_id !== userId && user.role !== 'ADMIN') {
      return res.status(403).json({
        error: `Akses ditolak: Anda bukan pemilik perseroan ${company.symbol}. Hanya pemilik resmi yang berkewajiban melunasi denda pemulihan suspensi.`
      });
    }

    const penaltyCost = 50000000.0; // Denda Pemulihan Suspensi Bursa: IB 50 Juta
    if (user.balance_ib < penaltyCost) {
      return res.status(400).json({
        error: `Saldo Kas Pribadi tidak cukup. Denda pemulihan suspensi bursa IPMC adalah IB ${penaltyCost.toLocaleString('id-ID')}`
      });
    }

    // Potong denda pemulihan dari kas user
    await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [penaltyCost, userId]);

    // Kembalikan status saham menjadi HEALTHY dan hapus suspended_at
    await query.run('UPDATE companies SET status = ?, suspended_at = NULL, suspend_until = NULL, suspend_reason = NULL WHERE id = ?', ['HEALTHY', companyId]);

    const newsItem = {
      id: uuidv4(),
      title: `✅ BURSA IPMC: Suspensi Saham ${company.symbol} Resmi Dicabut`,
      content: `Bursa Efek IPMC resmi mencabut suspensi perdagangan saham ${company.name} (${company.symbol}) setelah pemenuhan denda pemulihan bursa sebesar IB 50.000.000. Perdagangan aktif normal kembali!`,
      affected_sector: company.sector,
      sentiment: 'BULLISH',
      published_at: new Date().toISOString()
    };

    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
    );

    io.emit('market:news_broadcast', newsItem);
    io.emit('company:status_changed', { companyId: company.id, symbol: company.symbol, status: 'HEALTHY' });
    io.emit('user:balance_updated', { userId, balance_ib: user.balance_ib - penaltyCost });

    res.json({
      success: true,
      status: 'HEALTHY',
      message: `Suspensi saham ${company.symbol} berhasil dicabut! Perdagangan kembali aktif normal.`,
      newBalance: user.balance_ib - penaltyCost
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Penjualan Darurat Saham Pendiri (Diskon 50%) untuk Buka Suspensi & Tangkal Penyitaan 3 Hari
app.post('/api/company/emergency-sale', async (req, res) => {
  try {
    const { companyId, userId, pctToSell = 20.0 } = req.body;
    if (!companyId || !userId) return res.status(400).json({ error: 'Company ID dan User ID diperlukan' });

    const company = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
    if (!company) return res.status(404).json({ error: 'Emiten tidak ditemukan' });
    if (company.status !== 'SUSPENDED') {
      return res.status(400).json({ error: 'Penjualan darurat diskon 50% hanya berlaku untuk saham yang terkena SUSPENSI' });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Validasi Kepemilikan: Hanya pemilik resmi emiten atau Admin yang berhak menjual saham darurat pendiri
    if (company.owner_id && company.owner_id !== userId && user.role !== 'ADMIN') {
      return res.status(403).json({
        error: `Akses ditolak: Anda bukan pemilik perseroan ${company.symbol}. Hanya pendiri/pemilik resmi yang berhak melakukan penjualan saham darurat.`
      });
    }

    const numPct = parseFloat(pctToSell) || 20.0;
    const totalShares = company.total_shares || 10000000;
    const sharesSold = Math.round(totalShares * (numPct / 100.0));
    
    // Harga diskon darurat 50% dari harga pasar terakhir
    const normalPrice = company.current_price || 2500.0;
    const emergencyPrice = Math.max(50.0, Math.round(normalPrice * 0.50));
    const grossProceeds = sharesSold * emergencyPrice;

    const penaltyCost = 50000000.0; // Denda Pemulihan IPMC IB 50 Juta
    if (grossProceeds < penaltyCost) {
      return res.status(400).json({
        error: `Hasil penjualan darurat (IB ${grossProceeds.toLocaleString('id-ID')}) belum cukup untuk menutupi denda pemulihan IPMC IB ${penaltyCost.toLocaleString('id-ID')}. Naikkan porsi persentase penjualan darurat.`
      });
    }

    const netCashToOwner = grossProceeds - penaltyCost;

    // Update kas user (kas pribadi bertambah dari sisa dana darurat setelah potong denda bursa)
    await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [netCashToOwner, userId]);

    // Update status saham dipulihkan dari SUSPENDED -> HEALTHY
    await query.run(
      'UPDATE companies SET status = ?, suspended_at = NULL, suspend_until = NULL, suspend_reason = NULL, founder_shares_sold = COALESCE(founder_shares_sold, 0) + ? WHERE id = ?',
      ['HEALTHY', numPct, companyId]
    );

    // Update shareholder cap table: Konsorsium Penyelamat IPMC masuk sebagai pemegang saham baru
    await query.run(
      'INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage) VALUES (?, ?, ?, ?, ?, ?)',
      [uuidv4(), companyId, 'Konsorsium Penyelamat IPMC (Investor Baru)', 'INSTITUTION', sharesSold, numPct]
    );

    const newsItem = {
      id: uuidv4(),
      title: `🚨 RESTORASI RESTRUKTURISASI: Penjualan Saham Darurat ${company.symbol} Berhasil!`,
      content: `Pendiri ${company.name} (${company.symbol}) berhasil menjual ${numPct}% saham dengan diskon darurat 50% kepada Konsorsium Penyelamat IPMC seharga IB ${grossProceeds.toLocaleString('id-ID')}. Denda pemulihan bursa lunas dan suspensi resmi dicabut!`,
      affected_sector: company.sector,
      sentiment: 'BULLISH',
      published_at: new Date().toISOString()
    };

    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
    );

    io.emit('market:news_broadcast', newsItem);
    io.emit('company:status_changed', { companyId: company.id, symbol: company.symbol, status: 'HEALTHY' });
    io.emit('user:balance_updated', { userId, balance_ib: user.balance_ib + netCashToOwner });

    res.json({
      success: true,
      status: 'HEALTHY',
      message: `🎉 Restrukturisasi darurat berhasil! ${numPct}% saham diserap Konsorsium Penyelamat IPMC. Denda bursa IB 50 Juta lunas, dan sisa dana IB ${netCashToOwner.toLocaleString('id-ID')} masuk ke Kas Pribadi Anda!`,
      grossProceeds,
      penaltyPaid: penaltyCost,
      netCashToOwner,
      newPersonalBalance: user.balance_ib + netCashToOwner
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aksi Perang Korporasi Antar Konglomerat (Corporate Warfare)
app.post('/api/corporate/warfare', async (req, res) => {
  try {
    const { userId, targetCompanyId, actionType } = req.body;
    if (!userId || !targetCompanyId || !actionType) {
      return res.status(400).json({ error: 'User ID, Target Company ID, dan Action Type diperlukan' });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const targetComp = await query.get('SELECT * FROM companies WHERE id = ?', [targetCompanyId]);
    if (!targetComp) return res.status(404).json({ error: 'Emiten target tidak ditemukan' });

    let cost = 15000000.0; // Biaya operasi perang intelijen korporasi: IB 15 Juta
    let headline = '';
    let details = '';
    let newScore = targetComp.fundamental_score;
    let newPrice = targetComp.current_price;
    let newStatus = targetComp.status;

    if (actionType === 'SHORT_ATTACK') {
      cost = 20000000.0; // IB 20 Juta
      if (user.balance_ib < cost) return res.status(400).json({ error: `Kas pribadi tidak cukup. Butuh IB ${cost.toLocaleString('id-ID')}` });
      
      newPrice = Math.max(50.0, Math.round(targetComp.current_price * 0.88)); // -12% shock
      newScore = Math.max(20.0, targetComp.fundamental_score - 15.0);
      newStatus = 'CRITICAL'; // Masuk radar UMA / Kritis

      headline = `⚡ SERANGAN KORPORASI: Investigasi Mendadak Terhadap ${targetComp.symbol}!`;
      details = `Konglomerasi ${user.username} menghembuskan laporan audit independen atas ketidakwajaran pembukuan ${targetComp.name}. Harga saham terkoreksi tajam dan masuk status KRITIS (UMA)!`;
    } else if (actionType === 'POACH_TALENT') {
      cost = 15000000.0; // IB 15 Juta
      if (user.balance_ib < cost) return res.status(400).json({ error: `Kas pribadi tidak cukup. Butuh IB ${cost.toLocaleString('id-ID')}` });

      newScore = Math.max(20.0, targetComp.fundamental_score - 10.0);
      headline = `👔 PEMBAJAKAN DIREKSI: Tenaga Ahli ${targetComp.symbol} Dibajak Kompetitor!`;
      details = `Konglomerasi ${user.username} merekrut jajaran pimpinan kunci ${targetComp.name}, menyebabkan disrupsi manajemen dan penurunan skor fundamental.`;
    } else if (actionType === 'PRICE_WAR') {
      cost = 10000000.0; // IB 10 Juta
      if (user.balance_ib < cost) return res.status(400).json({ error: `Kas pribadi tidak cukup. Butuh IB ${cost.toLocaleString('id-ID')}` });

      headline = `💥 PERANG HARGA SEKTOR ${targetComp.sector.toUpperCase()}: Diskon Agresif Menggila!`;
      details = `Konglomerasi ${user.username} meluncurkan perang diskon agresif di sektor ${targetComp.sector}, menggerus margin laba ${targetComp.name}.`;
    } else {
      return res.status(400).json({ error: 'Tipe perang korporasi tidak dikenal' });
    }

    // Potong biaya operasi
    await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [cost, userId]);

    // Update target emiten
    await query.run(
      'UPDATE companies SET current_price = ?, fundamental_score = ?, status = ? WHERE id = ?',
      [newPrice, newScore, newStatus, targetCompanyId]
    );

    const warfareNews = {
      id: uuidv4(),
      title: headline,
      content: details,
      affected_sector: targetComp.sector,
      sentiment: 'BEARISH',
      published_at: new Date().toISOString()
    };

    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [warfareNews.id, warfareNews.title, warfareNews.content, warfareNews.affected_sector, warfareNews.sentiment, warfareNews.published_at]
    );

    io.emit('market:news_broadcast', warfareNews);
    io.emit('company:status_changed', { companyId: targetComp.id, symbol: targetComp.symbol, status: newStatus });
    io.emit('user:balance_updated', { userId, balance_ib: user.balance_ib - cost });

    res.json({
      success: true,
      message: `Operasi Perang Korporasi '${actionType}' terhadap ${targetComp.symbol} sukses dilancarkan!`,
      newPersonalBalance: user.balance_ib - cost,
      targetCompanyStatus: newStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. PORTOFOLIO & KEKAYAAN
// ----------------------------------------------------

app.get('/api/portfolio/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const holdings = await query.all(`
      SELECT p.*, c.symbol, c.name, c.current_price, c.sector, c.status, c.dividend_rate
      FROM portfolios p
      JOIN companies c ON p.company_id = c.id
      WHERE p.user_id = ? AND p.lots_owned > 0
    `, [userId]);

    let totalStockValue = 0;
    let totalInvested = 0;

    const detailedHoldings = holdings.map((h) => {
      const shares = h.lots_owned * 100;
      const currentVal = shares * h.current_price;
      const buyVal = shares * h.avg_buy_price;
      const profitLoss = currentVal - buyVal;
      const profitLossPct = buyVal > 0 ? ((profitLoss / buyVal) * 100) : 0;

      totalStockValue += currentVal;
      totalInvested += buyVal;

      return {
        ...h,
        totalShares: shares,
        currentValue: currentVal,
        investedValue: buyVal,
        profitLoss,
        profitLossPct: parseFloat(profitLossPct.toFixed(2))
      };
    });

    const netWorth = user.balance_ib + user.company_balance_ib + totalStockValue;
    const overallPl = totalStockValue - totalInvested;
    const overallPlPct = totalInvested > 0 ? parseFloat(((overallPl / totalInvested) * 100).toFixed(2)) : 0;

    const rateRow = await query.get("SELECT value FROM central_bank_settings WHERE key = 'interest_rate'");
    const centralBankInterestRate = parseFloat(rateRow ? rateRow.value : 6.5);

    // Hitung Estimasi Arus Kas PT per Siklus (20 Detik)
    let grossRev = (user.pt_level * 150000) + 
                   ((user.rd_level || 1) * 250000) + 
                   ((user.marketing_level || 1) * 180000) + 
                   ((user.capacity_level || 1) * 200000) + 
                   ((user.employees_count || 0) * 350000);
    if (user.ceo_level > 0) grossRev *= 1.30;
    if (user.cmo_level > 0) grossRev *= 1.35;
    const multiplier = (user.fundamental_score / 100);
    const estimatedGrossRevenue = Math.round(grossRev * multiplier);

    const staffSalaries = (user.employees_count || 0) * 100000;
    const ceoSalary = user.ceo_level > 0 ? 1500000 : 0;
    const cfoSalary = user.cfo_level > 0 ? 1000000 : 0;
    const cmoSalary = user.cmo_level > 0 ? 1000000 : 0;
    let estimatedSalaries = staffSalaries + ceoSalary + cfoSalary + cmoSalary;
    if (user.cfo_level > 0) estimatedSalaries = Math.round(estimatedSalaries * 0.75);

    const estimatedNetRevenue = Math.max(0, estimatedGrossRevenue - estimatedSalaries);

    res.json({
      cashBalance: user.balance_ib,                   // Kas Pribadi
      companyBalance: user.company_balance_ib || 0.0, // Kas Perusahaan (PT)
      hasPt: Boolean(user.has_pt),
      ptName: user.pt_name || '',
      sector: user.sector || '',
      isIpo: Boolean(user.is_ipo),
      rdLevel: user.rd_level || 1,
      marketingLevel: user.marketing_level || 1,
      hrLevel: user.hr_level || 1,
      capacityLevel: user.capacity_level || 1,
      employeesCount: user.employees_count || 0,
      ceoLevel: user.ceo_level || 0,
      cfoLevel: user.cfo_level || 0,
      cmoLevel: user.cmo_level || 0,
      estimatedGrossRevenue,
      estimatedSalaries,
      estimatedNetRevenue,
      totalStockValue,
      netWorth,
      overallPl,
      overallPlPct,
      creditScore: user.credit_score,
      ptLevel: user.pt_level,
      fundamentalScore: user.fundamental_score,
      isBlueChip: Boolean(user.is_blue_chip),
      centralBankInterestRate,
      holdings: detailedHoldings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Takeover Targets (Pasar Akuisisi M&A & Restrukturisasi Emiten)
app.get('/api/takeover/targets', async (req, res) => {
  try {
    let targets = await query.all(`
      SELECT c.*, 
             COALESCE(u.username, NULLIF(c.founder_name, ''), 'galih') as owner_username,
             COALESCE(u.pt_name, c.name) as owner_pt_name,
             COALESCE((SELECT sh.percentage FROM company_shareholders sh WHERE sh.company_id = c.id ORDER BY sh.percentage DESC LIMIT 1), 60.0) as founder_share_pct
      FROM companies c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.status = 'CRITICAL' OR (c.uma_flag = 1 AND c.uma_direction = 'DOWN')
      ORDER BY c.current_price ASC
      LIMIT 35
    `);

    if (!targets || targets.length < 8) {
      targets = await query.all(`
        SELECT c.*, 
               COALESCE(u.username, NULLIF(c.founder_name, ''), 'galih') as owner_username,
               COALESCE(u.pt_name, c.name) as owner_pt_name,
               COALESCE((SELECT sh.percentage FROM company_shareholders sh WHERE sh.company_id = c.id ORDER BY sh.percentage DESC LIMIT 1), 60.0) as founder_share_pct
        FROM companies c
        LEFT JOIN users u ON c.owner_id = u.id
        ORDER BY c.fundamental_score ASC, c.current_price ASC
        LIMIT 20
      `);
    }
    res.json(targets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: Eksekusi Final Pengalihan Saham Pengendali & Penerbitan Akta M&A setelah Disetujui Pendiri
async function executeApprovedAcquisition({
  company,
  buyerUser,
  sellerUserId,
  sellerName,
  isHumanSeller,
  pct,
  discountFactor,
  rawAcquisitionPrice,
  meteraiFee,
  notaryAdminFee,
  totalDeduction,
  proposalId = null,
}) {
  const companyId = company.id;
  const userId = buyerUser.id;

  // 1. Jika Penjual adalah Pemain/Bot di DB, Berikan Dana Hasil Akuisisi
  if (sellerUserId && sellerUserId !== 'consortium-trustee') {
    await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [rawAcquisitionPrice, sellerUserId]);
    io.emit('user:balance_updated', { userId: sellerUserId });
  }

  // 2. Setor Bea Meterai & Notariat ke Kas Negara
  await query.run(`
    INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    uuidv4(),
    'METERAI_FEE',
    `Penerimaan Bea Meterai & Notariat Akta M&A ${company.symbol}`,
    meteraiFee + notaryAdminFee,
    'INCOME',
    company.id,
    `Akuisisi ${pct}% saham pengendali ${company.name} oleh ${buyerUser.username} (Disetujui Pendiri: ${sellerName})`
  ]);
  io.emit('treasury:updated');

  // 3. Update Status & Kepemilikan Perusahaan
  await query.run(`
    UPDATE companies 
    SET status = 'HEALTHY', 
        owner_id = ?, 
        founder_name = ?,
        is_acquired = 1, 
        dividend_rate = 0.05,
        fundamental_score = CASE WHEN fundamental_score < 78 THEN 82.0 ELSE fundamental_score END,
        uma_flag = 0,
        is_seized = 0
    WHERE id = ?
  `, [userId, buyerUser.username, companyId]);

  // 4. Update Portofolio Saham Pembeli & Penjual
  const acquiredLots = Math.round(((company.total_shares || 10000000) * (pct / 100.0)) / 100);
  const sharesTransferred = acquiredLots * 100;
  const avgPrice = Math.max(50, Math.round(company.current_price * discountFactor));

  if (sellerUserId && sellerUserId !== 'consortium-trustee') {
    // Kurangi portofolio atau berikan alokasi sisa saham pendiri (misal 19%) ke portofolio penjual
    const remainingFounderLots = Math.round(((company.total_shares || 10000000) * (remainingFounderPct / 100.0)) / 100);
    const existingSellerPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [sellerUserId, companyId]);
    if (existingSellerPort) {
      await query.run('UPDATE portfolios SET lots_owned = ? WHERE id = ?', [remainingFounderLots, existingSellerPort.id]);
    } else if (remainingFounderLots > 0) {
      await query.run(
        'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), sellerUserId, companyId, remainingFounderLots, avgPrice]
      );
    }

    // Catat penjualan saham pendiri ke users & companies
    await query.run('UPDATE users SET founder_shares_sold = COALESCE(founder_shares_sold, 0) + ? WHERE id = ?', [pct, sellerUserId]);
    await query.run('UPDATE companies SET founder_shares_sold = COALESCE(founder_shares_sold, 0) + ? WHERE id = ?', [pct, companyId]);

    // SUKSESI PT UTAMA: Jika pembeli mengakuisisi mayoritas (>= 50%) dan penjual kehilangan kendali:
    if (pct >= 50.0 || remainingFounderPct < 50.0) {
      const sellerUserRow = await query.get('SELECT * FROM users WHERE id = ?', [sellerUserId]);
      const isSellingPrimary = (sellerUserRow && (sellerUserRow.pt_symbol === company.symbol || sellerUserRow.pt_name === company.name));

      if (isSellingPrimary || company.owner_id === sellerUserId) {
        // Cari anak perusahaan lain milik penjual untuk dipromosikan jadi PT Utama baru
        const nextSubsidiary = await query.get(`
          SELECT * FROM companies 
          WHERE owner_id = ? AND id != ?
          ORDER BY (circulating_shares * current_price) DESC, founded_at ASC 
          LIMIT 1
        `, [sellerUserId, companyId]);

        if (nextSubsidiary) {
          console.log(`🏢 [M&A Suksesi] Mempromosikan anak perusahaan ${nextSubsidiary.name} (${nextSubsidiary.symbol}) menjadi PT Utama baru @${sellerName}...`);
          await query.run(`
            UPDATE users 
            SET pt_name = ?,
                pt_symbol = ?,
                sector = ?,
                is_ipo = ?,
                company_balance_ib = ?,
                founder_shares_sold = ?,
                has_pt = 1
            WHERE id = ?
          `, [
            nextSubsidiary.name,
            nextSubsidiary.symbol,
            nextSubsidiary.sector,
            nextSubsidiary.is_ipo || 0,
            nextSubsidiary.company_balance_ib || 0,
            nextSubsidiary.founder_shares_sold || 0,
            sellerUserId
          ]);
        } else {
          console.log(`🏢 [M&A Suksesi] Seluruh kepemilikan perseroan @${sellerName} beralih, status PT Utama direset (bisa bangun PT Baru)...`);
          await query.run(`
            UPDATE users 
            SET has_pt = 0,
                pt_name = '',
                pt_symbol = '',
                is_ipo = 0,
                company_balance_ib = 0
            WHERE id = ?
          `, [sellerUserId]);
        }
      }
    }
    io.emit('user:conglomerate_updated', { userId: sellerUserId });
  }

  const existingBuyerPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, companyId]);
  if (existingBuyerPort) {
    await query.run(`
      UPDATE portfolios 
      SET lots_owned = lots_owned + ?, avg_buy_price = ? 
      WHERE id = ?
    `, [acquiredLots, avgPrice, existingBuyerPort.id]);
  } else {
    await query.run(`
      INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price)
      VALUES (?, ?, ?, ?, ?)
    `, [uuidv4(), userId, companyId, acquiredLots, avgPrice]);
  }

  // 5. Sinkronisasi Struktur Pemegang Saham (Cap Table)
  const prevFounderRow = await query.get(`
    SELECT * FROM company_shareholders 
    WHERE company_id = ? ORDER BY percentage DESC LIMIT 1
  `, [companyId]);
  const prevFounderPct = prevFounderRow ? prevFounderRow.percentage : 60.0;
  const remainingFounderPct = Math.max(0, parseFloat((prevFounderPct - pct).toFixed(1)));
  const remainingPctForOthers = Math.max(0, parseFloat((100.0 - pct - remainingFounderPct).toFixed(1)));

  await query.run('DELETE FROM company_shareholders WHERE company_id = ?', [companyId]);

  const totalShares = company.total_shares || 10000000;
  const newShareholders = [];
  newShareholders.push({
    id: uuidv4(),
    company_id: companyId,
    holder_name: `${buyerUser.username} (Pemegang Saham Pengendali Baru)`,
    holder_type: 'FOUNDER',
    shares_count: sharesTransferred,
    percentage: pct,
    user_id: userId
  });

  if (remainingFounderPct > 0) {
    newShareholders.push({
      id: uuidv4(),
      company_id: companyId,
      holder_name: `${sellerName} (Pendiri Lama)`,
      holder_type: 'CO_FOUNDER',
      shares_count: Math.round(totalShares * (remainingFounderPct / 100.0)),
      percentage: remainingFounderPct,
      user_id: sellerUserId !== 'consortium-trustee' ? sellerUserId : null
    });
  }

  if (remainingPctForOthers > 0) {
    const inst1 = parseFloat((remainingPctForOthers * 0.55).toFixed(1));
    const pub = parseFloat((remainingPctForOthers - inst1).toFixed(1));
    newShareholders.push({
      id: uuidv4(),
      company_id: companyId,
      holder_name: 'Konsorsium Institusi Federasi',
      holder_type: 'INSTITUTION',
      shares_count: Math.round(totalShares * (inst1 / 100.0)),
      percentage: inst1,
      user_id: null
    });
    newShareholders.push({
      id: uuidv4(),
      company_id: companyId,
      holder_name: 'Publik Masyarakat (Bursa Efek)',
      holder_type: 'PUBLIC',
      shares_count: Math.round(totalShares * (pub / 100.0)),
      percentage: pub,
      user_id: null
    });
  }

  for (const sh of newShareholders) {
    await query.run(`
      INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [sh.id, sh.company_id, sh.holder_name, sh.holder_type, sh.shares_count, sh.percentage, sh.user_id]);
  }

  // 6. Penerbitan Akta Notaris Resmi ke deal_deeds
  const deedId = uuidv4();
  const deedNumber = `AKTA-MA/2026/10/${Math.floor(1000 + Math.random() * 9000)}`;
  await query.run(`
    INSERT INTO deal_deeds (
      id, deed_number, deal_id, seller_user_id, seller_name, 
      buyer_user_id, buyer_name, company_id, company_name, company_symbol,
      percentage_transferred, shares_transferred, price_per_share, total_price_ib,
      meterai_status, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    deedId,
    deedNumber,
    `MA-${company.symbol}-${Date.now()}`,
    sellerUserId || 'consortium-trustee',
    sellerName,
    userId,
    buyerUser.username,
    company.id,
    company.name,
    company.symbol,
    pct,
    sharesTransferred,
    avgPrice,
    rawAcquisitionPrice,
    'LUNAS_IB_10000',
    'ACTIVE'
  ]);
  io.emit('deed:created');

  if (proposalId) {
    await query.run(
      `UPDATE acquisition_proposals 
       SET status = 'APPROVED', deed_id = ?, deed_number = ?, responded_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [deedId, deedNumber, proposalId]
    );
  }

  // 7. Rebound Tren Bullish & Breaking News
  if (simulationEngine && typeof simulationEngine.setStockTrend === 'function') {
    simulationEngine.setStockTrend(company.symbol, 12.0);
  }

  const newsItem = {
    id: uuidv4(),
    title: `🏢 AKUISISI DISETUJUI PENDIRI: ${buyerUser.username} Resmi Mengakuisisi ${pct}% Saham ${company.name} (${company.symbol})!`,
    content: `Pendiri & Pemegang Saham Terbesar (${sellerName}) resmi menandatangani persetujuan RUPS Luar Biasa senilai IB ${rawAcquisitionPrice.toLocaleString('id-ID')}. Akta Notaris No. ${deedNumber} telah disahkan!`,
    affected_sector: company.sector,
    sentiment: 'BULLISH',
    published_at: new Date().toISOString()
  };
  await query.run(
    'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
    [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
  );
  io.emit('market:news_broadcast', newsItem);
  io.emit('company:status_changed', { companyId: company.id, status: 'HEALTHY' });
  io.emit('user:balance_updated', { userId });

  return {
    deed: {
      id: deedId,
      deed_number: deedNumber,
      company_name: company.name,
      company_symbol: company.symbol,
      seller_name: sellerName,
      buyer_name: buyerUser.username,
      percentage_transferred: pct,
      shares_transferred: sharesTransferred,
      lots_transferred: acquiredLots,
      price_per_share: avgPrice,
      raw_price_ib: rawAcquisitionPrice,
      meterai_fee: meteraiFee,
      notary_fee: notaryAdminFee,
      total_deduction_ib: totalDeduction,
      founder_approval_note: `Disetujui dalam RUPS Luar Biasa oleh Pendiri & Pemegang Saham Terbesar (${sellerName})`,
      created_at: new Date().toISOString()
    },
    shareholders: newShareholders,
  };
}

// Takeover Negotiation & Proposal Persetujuan Pendiri / Pemegang Saham Terbesar
app.post('/api/takeover/negotiate', async (req, res) => {
  try {
    const { userId, companyId, percentageOffer, offerTier = 'RESCUE_30', paymentSource = 'AUTO', pitchNotes = '' } = req.body;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Cari berdasarkan ID, Symbol, maupun Nama agar tidak pernah gagal "Emiten tidak ditemukan"
    const company = await query.get(`
      SELECT c.*, u.username as owner_username, u.pt_name as owner_pt_name, u.role as owner_role
      FROM companies c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.id = ? OR UPPER(c.symbol) = UPPER(?) OR c.name = ?
    `, [companyId, String(companyId || '').trim(), String(companyId || '').trim()]);

    if (!company) {
      return res.status(404).json({ error: 'Emiten tidak ditemukan di database Bursa Efek.' });
    }
    if (company.owner_id === userId) {
      return res.status(400).json({ error: 'Anda sudah menjadi Pemilik / Pemegang Saham Pengendali emiten ini!' });
    }

    const pct = Math.max(51, Math.min(100, parseInt(percentageOffer, 10) || 51));
    const totalValuation = (company.total_shares || 10000000) * company.current_price;

    let discountFactor = 0.70; // Default RESCUE_30 (-30% Diskon Penyelamatan)
    if (offerTier === 'MARKET_FAIR') discountFactor = 1.00;
    else if (offerTier === 'PREMIUM_15') discountFactor = 1.15;

    const rawAcquisitionPrice = Math.round(totalValuation * (pct / 100.0) * discountFactor);
    const meteraiFee = 10000;
    const notaryAdminFee = 40000;
    const totalDeduction = rawAcquisitionPrice + meteraiFee + notaryAdminFee;

    // Pilih sumber dana (Kas Pribadi atau Kas Perusahaan PT)
    let useCompanyCash = false;
    if (paymentSource === 'COMPANY') {
      if ((user.company_balance_ib || 0) < totalDeduction) {
        return res.status(400).json({
          error: `Saldo Kas Perusahaan (PT) tidak cukup. Butuh IB ${totalDeduction.toLocaleString('id-ID')}.`
        });
      }
      useCompanyCash = true;
    } else if (paymentSource === 'PERSONAL') {
      if ((user.balance_ib || 0) < totalDeduction) {
        return res.status(400).json({
          error: `Saldo Kas Pribadi tidak cukup. Butuh IB ${totalDeduction.toLocaleString('id-ID')}.`
        });
      }
    } else {
      if ((user.balance_ib || 0) >= totalDeduction) {
        useCompanyCash = false;
      } else if ((user.company_balance_ib || 0) >= totalDeduction) {
        useCompanyCash = true;
      } else {
        return res.status(400).json({
          error: `Saldo Kas Pribadi (IB ${(user.balance_ib || 0).toLocaleString('id-ID')}) maupun Kas PT (IB ${(user.company_balance_ib || 0).toLocaleString('id-ID')}) tidak mencukupi. Butuh IB ${totalDeduction.toLocaleString('id-ID')}.`
        });
      }
    }

    // Identifikasi Pendiri / Pemegang Saham Terbesar
    let sellerUserId = company.owner_id;
    let sellerName = company.owner_username || company.founder_name || 'galih';
    let isBotFounder = true;

    if (sellerUserId && sellerUserId !== userId) {
      const sellerUser = await query.get('SELECT * FROM users WHERE id = ?', [sellerUserId]);
      if (sellerUser) {
        sellerName = sellerUser.username;
        isBotFounder = String(sellerUser.id).startsWith('bot-user-');
      }
    } else if (!sellerUserId) {
      sellerUserId = 'bot-user-007';
      sellerName = company.founder_name || 'galih';
      isBotFounder = true;
    }

    const founderSh = await query.get(
      'SELECT percentage FROM company_shareholders WHERE company_id = ? ORDER BY percentage DESC LIMIT 1',
      [company.id]
    );
    const founderSharePct = founderSh?.percentage || 60.0;

    // 1. Potong / Escrow Saldo Pembeli
    if (useCompanyCash) {
      await query.run('UPDATE users SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [totalDeduction, userId]);
    } else {
      await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [totalDeduction, userId]);
    }

    const acquiredLots = Math.round(((company.total_shares || 10000000) * (pct / 100.0)) / 100);
    const avgPrice = Math.max(50, Math.round(company.current_price * discountFactor));
    const proposalId = uuidv4();
    const cleanPitch = (pitchNotes || '').trim() || `Proposal akuisisi ${pct}% saham pengendali & injeksi restrukturisasi perseroan ${company.name}.`;

    // JIKA PENDIRI ADALAH PEMAIN ASLI (BUKAN BOT): Masuk antrean Persetujuan Pendiri (PENDING_FOUNDER)!
    if (!isBotFounder) {
      await query.run(`
        INSERT INTO acquisition_proposals (
          id, company_id, company_symbol, company_name, sector,
          buyer_user_id, buyer_username, founder_user_id, founder_username, founder_share_pct,
          is_bot_founder, percentage_requested, lots_transferred, price_per_share_ib,
          raw_acquisition_ib, total_deduction_ib, offer_tier, payment_source, pitch_notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_FOUNDER')
      `, [
        proposalId, company.id, company.symbol, company.name, company.sector,
        userId, user.username, sellerUserId, sellerName, founderSharePct,
        pct, acquiredLots, avgPrice, rawAcquisitionPrice, totalDeduction,
        offerTier, useCompanyCash ? 'COMPANY' : 'PERSONAL', cleanPitch
      ]);

      io.emit('user:balance_updated', { userId });
      io.to(sellerUserId).emit('takeover:proposal_received', {
        proposalId,
        companySymbol: company.symbol,
        companyName: company.name,
        buyerUsername: user.username,
        percentage: pct,
        offerIb: rawAcquisitionPrice
      });

      return res.json({
        success: true,
        pendingFounderApproval: true,
        message: `Proposal Akuisisi ${pct}% saham ${company.name} telah dikirim kepada Pendiri & Pemegang Saham Terbesar (@${sellerName}) untuk disetujui dalam RUPS!`,
        proposal: {
          id: proposalId,
          company_name: company.name,
          company_symbol: company.symbol,
          founder_username: sellerName,
          founder_share_pct: founderSharePct,
          percentage_requested: pct,
          raw_acquisition_ib: rawAcquisitionPrice,
          status: 'PENDING_FOUNDER'
        }
      });
    }

    // JIKA PENDIRI ADALAH BOT PEMILIK PT: Pendiri mengevaluasi & menandatangani Persetujuan RUPS Luar Biasa!
    const founderApprovalNote = `Selaku Pendiri & Pemegang Saham Terbesar (${founderSharePct}% Hak Suara) ${company.name}, saya (@${sellerName}) menyetujui proposal akuisisi & restrukturisasi dari @${user.username} sebesar ${pct}% saham pengendali.`;

    await query.run(`
      INSERT INTO acquisition_proposals (
        id, company_id, company_symbol, company_name, sector,
        buyer_user_id, buyer_username, founder_user_id, founder_username, founder_share_pct,
        is_bot_founder, percentage_requested, lots_transferred, price_per_share_ib,
        raw_acquisition_ib, total_deduction_ib, offer_tier, payment_source, pitch_notes,
        status, founder_response_note, responded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, CURRENT_TIMESTAMP)
    `, [
      proposalId, company.id, company.symbol, company.name, company.sector,
      userId, user.username, sellerUserId, sellerName, founderSharePct,
      pct, acquiredLots, avgPrice, rawAcquisitionPrice, totalDeduction,
      offerTier, useCompanyCash ? 'COMPANY' : 'PERSONAL', cleanPitch, founderApprovalNote
    ]);

    const execResult = await executeApprovedAcquisition({
      company,
      buyerUser: user,
      sellerUserId,
      sellerName,
      isHumanSeller: false,
      pct,
      discountFactor,
      rawAcquisitionPrice,
      meteraiFee,
      notaryAdminFee,
      totalDeduction,
      proposalId
    });

    const updatedUser = await query.get('SELECT balance_ib, company_balance_ib FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      pendingFounderApproval: false,
      message: `Disetujui Pendiri (@${sellerName})! Sukses mengakuisisi ${pct}% saham pengendali ${company.name}!`,
      founderApproval: {
        founder_username: sellerName,
        founder_share_pct: founderSharePct,
        decision: 'APPROVED',
        statement: founderApprovalNote,
        approved_at: new Date().toISOString()
      },
      deed: execResult.deed,
      shareholders: execResult.shareholders,
      newPersonalBalance: updatedUser.balance_ib,
      newCompanyBalance: updatedUser.company_balance_ib
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Daftar Proposal Akuisisi (Masuk ke Pendiri & Riwayat Pengajuan Pembeli)
app.get('/api/takeover/proposals', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ incoming: [], outgoing: [] });

    // Jika pemain memiliki PT sendiri dan belum pernah menerima tawaran akuisisi dari Konglomerat Bot,
    // buatkan 1 tawaran akuisisi masuk (Incoming Offer) dari Sultan 9 Naga agar pemain bisa merasakan menyetujui/menolak sebagai Pendiri!
    const userOwnedComp = await query.get('SELECT * FROM companies WHERE owner_id = ? LIMIT 1', [userId]);
    if (userOwnedComp) {
      const existingIncoming = await query.get(
        'SELECT COUNT(*) as count FROM acquisition_proposals WHERE company_id = ? AND founder_user_id = ?',
        [userOwnedComp.id, userId]
      );
      if (!existingIncoming || existingIncoming.count === 0) {
        const userRow = await query.get('SELECT username FROM users WHERE id = ?', [userId]);
        const botBidder = await query.get("SELECT id, username FROM users WHERE username = 'haziq' LIMIT 1");
        const pctReq = 51;
        const lotsReq = Math.round(((userOwnedComp.total_shares || 10000000) * 0.51) / 100);
        const premiumPrice = Math.round((userOwnedComp.current_price || 1500) * 1.15);
        const rawOfferIb = lotsReq * 100 * premiumPrice;

        await query.run(`
          INSERT INTO acquisition_proposals (
            id, company_id, company_symbol, company_name, sector,
            buyer_user_id, buyer_username, founder_user_id, founder_username, founder_share_pct,
            is_bot_founder, percentage_requested, lots_transferred, price_per_share_ib,
            raw_acquisition_ib, total_deduction_ib, offer_tier, payment_source, pitch_notes, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 60.0, 0, ?, ?, ?, ?, ?, 'PREMIUM_15', 'PERSONAL', ?, 'PENDING_FOUNDER')
        `, [
          uuidv4(),
          userOwnedComp.id,
          userOwnedComp.symbol,
          userOwnedComp.name,
          userOwnedComp.sector,
          botBidder ? botBidder.id : 'bot-user-001',
          botBidder ? botBidder.username : 'haziq',
          userId,
          userRow ? userRow.username : 'Pendiri Utama',
          pctReq,
          lotsReq,
          premiumPrice,
          rawOfferIb,
          rawOfferIb + 50000,
          `Konsorsium Holding 9 Naga (@haziq) menawarkan Premi +15% di atas harga pasar untuk mengakuisisi 51% saham pengendali ${userOwnedComp.name}. Membutuhkan persetujuan Anda selaku Pendiri & Pemegang Saham Terbesar.`
        ]);
      }
    }

    const incoming = await query.all(`
      SELECT * FROM acquisition_proposals
      WHERE founder_user_id = ?
      ORDER BY CASE WHEN status = 'PENDING_FOUNDER' THEN 0 ELSE 1 END, created_at DESC
      LIMIT 30
    `, [userId]);

    const outgoing = await query.all(`
      SELECT * FROM acquisition_proposals
      WHERE buyer_user_id = ?
      ORDER BY created_at DESC
      LIMIT 30
    `, [userId]);

    res.json({ incoming: incoming || [], outgoing: outgoing || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Keputusan Pendiri / Pemegang Saham Terbesar atas Proposal Akuisisi (APPROVE / REJECT)
app.post('/api/takeover/proposals/:id/respond', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, decision, note = '' } = req.body; // decision: 'APPROVE' | 'REJECT'
    const prop = await query.get('SELECT * FROM acquisition_proposals WHERE id = ?', [id]);
    if (!prop) return res.status(404).json({ error: 'Proposal akuisisi tidak ditemukan' });
    if (prop.status !== 'PENDING_FOUNDER') {
      return res.status(400).json({ error: `Proposal ini sudah diproses (${prop.status})` });
    }
    if (prop.founder_user_id !== userId) {
      return res.status(403).json({ error: 'Hanya Pendiri / Pemegang Saham Terbesar yang berhak memberikan persetujuan RUPS!' });
    }

    const act = String(decision || '').toUpperCase();
    if (act === 'REJECT') {
      // Kembalikan dana escrow kepada calon pembeli (jika bukan bot atau kembalikan ke saldo pembeli)
      if (prop.payment_source === 'COMPANY') {
        await query.run('UPDATE users SET company_balance_ib = company_balance_ib + ? WHERE id = ?', [prop.total_deduction_ib, prop.buyer_user_id]);
      } else {
        await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [prop.total_deduction_ib, prop.buyer_user_id]);
      }
      await query.run(
        `UPDATE acquisition_proposals 
         SET status = 'REJECTED', founder_response_note = ?, responded_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [note || 'Ditolak oleh Pendiri & Pemegang Saham Terbesar dalam RUPS Luar Biasa.', id]
      );
      io.emit('user:balance_updated', { userId: prop.buyer_user_id });

      return res.json({
        success: true,
        status: 'REJECTED',
        message: `Anda selaku Pendiri resmi MENOLAK proposal akuisisi dari @${prop.buyer_username}. Kepemilikan ${prop.company_name} tetap 100% di tangan Anda!`
      });
    }

    // Jika APPROVE (Disetujui oleh Pendiri)
    const company = await query.get('SELECT * FROM companies WHERE id = ?', [prop.company_id]);
    const buyerUser = await query.get('SELECT * FROM users WHERE id = ?', [prop.buyer_user_id]);
    if (!company || !buyerUser) {
      return res.status(404).json({ error: 'Data perusahaan atau pembeli tidak ditemukan' });
    }

    const discountFactor = prop.offer_tier === 'PREMIUM_15' ? 1.15 : (prop.offer_tier === 'MARKET_FAIR' ? 1.0 : 0.70);
    const execResult = await executeApprovedAcquisition({
      company,
      buyerUser,
      sellerUserId: prop.founder_user_id,
      sellerName: prop.founder_username,
      isHumanSeller: true,
      pct: prop.percentage_requested,
      discountFactor,
      rawAcquisitionPrice: prop.raw_acquisition_ib,
      meteraiFee: 10000,
      notaryAdminFee: 40000,
      totalDeduction: prop.total_deduction_ib,
      proposalId: prop.id
    });

    await query.run(
      `UPDATE acquisition_proposals SET founder_response_note = ? WHERE id = ?`,
      [note || `Disetujui secara resmi oleh Pendiri (@${prop.founder_username}).`, prop.id]
    );

    const updatedFounder = await query.get('SELECT balance_ib, company_balance_ib FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      status: 'APPROVED',
      message: `🎉 Anda resmi MENYETUJUI akuisisi ${prop.percentage_requested}% saham ${prop.company_name}! Dana segar IB ${prop.raw_acquisition_ib.toLocaleString('id-ID')} telah masuk ke Kas Pribadi Anda.`,
      deed: execResult.deed,
      newPersonalBalance: updatedFounder?.balance_ib
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lelang Aset Sitaan Bank Sentral Federasi (BCF) & PNAF
app.get('/api/auctions', async (req, res) => {
  try {
    // 1. Pastikan selalu ada minimal 5 paket lelang aset sitaan kredit macet yang aktif di Balai Lelang BCF
    const activeCount = await query.get("SELECT COUNT(*) as count FROM auction_items WHERE status = 'ACTIVE'");
    if (!activeCount || activeCount.count < 5) {
      const candidateComps = await query.all(`
        SELECT * FROM companies 
        WHERE is_seized = 1 OR status = 'CRITICAL' OR current_price BETWEEN 600 AND 4500
        ORDER BY is_seized DESC, fundamental_score ASC
        LIMIT 8
      `);
      const expiresIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const sharePackages = [3500000, 5100000, 2500000, 6000000, 4000000, 5500000];

      for (let i = 0; i < Math.min(6, candidateComps.length); i++) {
        const c = candidateComps[i];
        const exists = await query.get("SELECT id FROM auction_items WHERE company_id = ? AND status = 'ACTIVE'", [c.id]);
        if (!exists) {
          const sharesOffered = sharePackages[i % sharePackages.length];
          const marketVal = sharesOffered * (c.current_price || 1000);
          const startBid = Math.round(marketVal * 0.65); // Diskon Lelang Likuidasi 35%
          const currBid = Math.round(marketVal * 0.68);
          await query.run(`
            INSERT INTO auction_items (id, company_id, shares_offered, starting_bid_ib, current_bid_ib, highest_bidder_id, status, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
          `, [
            `auc-${c.symbol.toLowerCase()}-${Date.now().toString().slice(-4)}`,
            c.id,
            sharesOffered,
            startBid,
            currBid,
            `bot-user-0${11 + i}`,
            expiresIso
          ]);
        }
      }
    }

    const rows = await query.all(`
      SELECT a.*, 
             c.symbol as company_symbol, c.name as company_name, c.sector, 
             c.current_price, c.total_shares, c.fundamental_score, c.is_seized, c.seize_reason,
             COALESCE(u.username, 'Konsorsium Lelang BCF') as highest_bidder_name,
             COALESCE(owner.username, c.founder_name, 'Debitur Wanprestasi') as former_owner_name
      FROM auction_items a
      JOIN companies c ON a.company_id = c.id
      LEFT JOIN users u ON a.highest_bidder_id = u.id
      LEFT JOIN users owner ON c.owner_id = owner.id
      WHERE a.status = 'ACTIVE'
      ORDER BY a.created_at DESC
    `);

    const reasons = [
      'Eksekusi Agunan Kredit Macet (NPL) Bank Sentral Federasi',
      'Penyitaan Jaminan Obligasi Korporasi Gagal Bayar',
      'Putusan Eksekusi Lelang Pengadilan Niaga (PNAF)',
      'Likuidasi Paksa Portofolio Debitur Insolven BCF',
    ];

    const formatted = (rows || []).map((r, idx) => {
      const totalShares = r.total_shares || 10000000;
      const pctStake = Math.round((r.shares_offered / totalShares) * 100);
      const lotsOffered = Math.round(r.shares_offered / 100);
      const marketVal = Math.round(r.shares_offered * (r.current_price || 1000));
      const buyoutPrice = Math.round(marketVal * 0.82); // Tebus Instan Hemat 18% dari harga pasar
      const minNextBid = Math.round(r.current_bid_ib * 1.05);

      return {
        ...r,
        percentage_stake: pctStake,
        lots_offered: lotsOffered,
        market_valuation_ib: marketVal,
        buyout_price_ib: Math.max(minNextBid, buyoutPrice),
        min_next_bid_ib: minNextBid,
        discount_pct: Math.max(15, Math.round((1 - (r.current_bid_ib / Math.max(1, marketVal))) * 100)),
        collateral_reason: r.seize_reason || reasons[idx % reasons.length],
        is_majority_control: pctStake >= 50
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tawar Lelang (BID) atau Tebus Instan (BUYOUT) Aset Sitaan Bank Sentral
app.post('/api/auctions/bid', async (req, res) => {
  try {
    const { userId, auctionId, action = 'BUYOUT', bidAmountIb, paymentSource = 'AUTO' } = req.body;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const auc = await query.get(`
      SELECT a.*, c.symbol as company_symbol, c.name as company_name, c.sector, c.current_price, c.total_shares, c.owner_id
      FROM auction_items a
      JOIN companies c ON a.company_id = c.id
      WHERE a.id = ? AND a.status = 'ACTIVE'
    `, [auctionId]);
    if (!auc) return res.status(404).json({ error: 'Paket lelang sitaan tidak ditemukan atau sudah ditutup' });

    const totalShares = auc.total_shares || 10000000;
    const pctStake = Math.round((auc.shares_offered / totalShares) * 100);
    const lotsOffered = Math.round(auc.shares_offered / 100);
    const marketVal = Math.round(auc.shares_offered * (auc.current_price || 1000));
    const minNextBid = Math.round(auc.current_bid_ib * 1.05);
    const buyoutPrice = Math.max(minNextBid, Math.round(marketVal * 0.82));

    const isBuyout = String(action).toUpperCase() === 'BUYOUT';
    const requiredIb = isBuyout ? buyoutPrice : Math.max(minNextBid, Math.round(Number(bidAmountIb) || minNextBid));

    let useCompanyCash = false;
    if (paymentSource === 'COMPANY') {
      if ((user.company_balance_ib || 0) < requiredIb) {
        return res.status(400).json({ error: `Saldo Kas PT tidak mencukupi. Butuh IB ${requiredIb.toLocaleString('id-ID')}.` });
      }
      useCompanyCash = true;
    } else if ((user.balance_ib || 0) >= requiredIb) {
      useCompanyCash = false;
    } else if ((user.company_balance_ib || 0) >= requiredIb) {
      useCompanyCash = true;
    } else {
      return res.status(400).json({
        error: `Saldo Kas Pribadi maupun Kas PT tidak mencukupi untuk menebus lelang sebesar IB ${requiredIb.toLocaleString('id-ID')}.`
      });
    }

    if (!isBuyout) {
      // Hanya pasang tawaran tertinggi (BID)
      await query.run(
        'UPDATE auction_items SET current_bid_ib = ?, highest_bidder_id = ? WHERE id = ?',
        [requiredIb, userId, auctionId]
      );
      await query.run(
        'INSERT INTO auction_bids (id, auction_item_id, user_id, bid_amount_ib) VALUES (?, ?, ?, ?)',
        [uuidv4(), auctionId, userId, requiredIb]
      );
      return res.json({
        success: true,
        isBuyout: false,
        message: `Penawaran lelang tertinggi IB ${requiredIb.toLocaleString('id-ID')} atas ${auc.company_symbol} berhasil dicatat atas nama @${user.username}!`
      });
    }

    // EKSEKUSI TEBUS INSTAN (BUYOUT) LELANG SITAAN BANK SENTRAL
    if (useCompanyCash) {
      await query.run('UPDATE users SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [requiredIb, userId]);
    } else {
      await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [requiredIb, userId]);
    }

    await query.run(
      "UPDATE auction_items SET current_bid_ib = ?, highest_bidder_id = ?, status = 'COMPLETED' WHERE id = ?",
      [requiredIb, userId, auctionId]
    );

    // Masukkan hasil lelang sitaan ke Brankas Kas Negara (SEIZURE_FINE)
    await query.run(`
      INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
      VALUES (?, 'SEIZURE_FINE', ?, ?, 'INCOME', ?, ?)
    `, [
      uuidv4(),
      `Penerimaan Lelang Aset Sitaan BCF - ${auc.company_symbol} (${pctStake}% Saham)`,
      requiredIb,
      auc.company_id,
      `Ditebus oleh @${user.username} melalui Balai Lelang Sitaan Bank Sentral`
    ]);
    io.emit('treasury:updated');

    // Tambahkan saham lelang ke portofolio pemenang
    const effPrice = Math.max(50, Math.round(requiredIb / auc.shares_offered));
    const existPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, auc.company_id]);
    if (existPort) {
      await query.run('UPDATE portfolios SET lots_owned = lots_owned + ?, avg_buy_price = ? WHERE id = ?', [lotsOffered, effPrice, existPort.id]);
    } else {
      await query.run(
        'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), userId, auc.company_id, lotsOffered, effPrice]
      );
    }

    // Jika paket saham >= 50%, pemenang otomatis menjadi Pemegang Saham Pengendali Baru!
    if (pctStake >= 50) {
      await query.run(
        `UPDATE companies SET owner_id = ?, founder_name = ?, status = 'HEALTHY', is_seized = 0, is_acquired = 1 WHERE id = ?`,
        [userId, user.username, auc.company_id]
      );
    }

    // Terbitkan Risalah Lelang Resmi ke deal_deeds
    const deedId = uuidv4();
    const deedNumber = `RISALAH-BCF/2026/10/${Math.floor(1000 + Math.random() * 9000)}`;
    await query.run(`
      INSERT INTO deal_deeds (
        id, deed_number, deal_id, seller_user_id, seller_name, 
        buyer_user_id, buyer_name, company_id, company_name, company_symbol,
        percentage_transferred, shares_transferred, price_per_share, total_price_ib,
        meterai_status, status, created_at
      ) VALUES (?, ?, ?, 'bank-central-bcf', 'Balai Lelang Sitaan Bank Sentral (BCF)', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'LUNAS_IB_10000', 'ACTIVE', CURRENT_TIMESTAMP)
    `, [
      deedId, deedNumber, `AUC-${auc.company_symbol}-${Date.now()}`,
      userId, user.username, auc.company_id, auc.company_name, auc.company_symbol,
      pctStake, auc.shares_offered, effPrice, requiredIb
    ]);

    const updatedUser = await query.get('SELECT balance_ib, company_balance_ib FROM users WHERE id = ?', [userId]);
    io.emit('user:balance_updated', { userId });

    res.json({
      success: true,
      isBuyout: true,
      message: `🎉 Selamat! Anda berhasil memenangkan & menebus lelang sitaan ${pctStake}% saham ${auc.company_name} (${lotsOffered.toLocaleString('id-ID')} Lot)!`,
      deed: {
        id: deedId,
        deed_number: deedNumber,
        company_name: auc.company_name,
        company_symbol: auc.company_symbol,
        seller_name: 'Balai Lelang Sitaan Bank Sentral (BCF)',
        buyer_name: user.username,
        percentage_transferred: pctStake,
        shares_transferred: auc.shares_offered,
        lots_transferred: lotsOffered,
        price_per_share: effPrice,
        raw_price_ib: requiredIb,
        created_at: new Date().toISOString()
      },
      newPersonalBalance: updatedUser.balance_ib,
      newCompanyBalance: updatedUser.company_balance_ib
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper format nama PT agar tidak pernah menjadi "PT PT."
function formatCleanPtName(rawPtName, hasPt) {
  if (!hasPt || !rawPtName || String(rawPtName).trim() === '' || String(rawPtName).toLowerCase().includes('investor')) {
    return 'Investor Mandiri';
  }
  const stripped = String(rawPtName).replace(/^(PT\.?\s*)+/i, '').trim();
  return stripped ? `PT. ${stripped}` : 'Investor Mandiri';
}

// Helper menghitung Peringkat Konglomerat Live (Top 9 Naga, Taipan, VIP)
async function getUserRankMap() {
  const rows = await query.all(`
    SELECT u.id, u.role, u.is_blue_chip,
           (u.balance_ib + u.company_balance_ib + COALESCE(SUM(p.lots_owned * 100 * c.current_price), 0)) as net_worth
    FROM users u
    LEFT JOIN portfolios p ON u.id = p.user_id
    LEFT JOIN companies c ON p.company_id = c.id
    WHERE u.role != 'ADMIN'
    GROUP BY u.id
    ORDER BY net_worth DESC
    LIMIT 100
  `);
  const map = new Map();
  rows.forEach((r, idx) => {
    map.set(r.id, { rank: idx + 1, role: r.role, isBlueChip: Boolean(r.is_blue_chip), netWorth: r.net_worth });
  });
  return map;
}

// Leaderboard Top 100
app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await query.all(`
      SELECT u.id, u.username, u.pt_name, u.has_pt, u.sector, u.balance_ib, u.company_balance_ib, u.pt_level, u.is_blue_chip, u.role,
             COALESCE(SUM(p.lots_owned * 100 * c.current_price), 0) as stock_valuation
      FROM users u
      LEFT JOIN portfolios p ON u.id = p.user_id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE u.role != 'ADMIN'
      GROUP BY u.id
      ORDER BY (u.balance_ib + u.company_balance_ib + COALESCE(SUM(p.lots_owned * 100 * c.current_price), 0)) DESC
      LIMIT 100
    `);

    const leaderboard = users.map((u, index) => {
      const netWorth = u.balance_ib + u.company_balance_ib + u.stock_valuation;
      const isVipUser = String(u.role || '').toUpperCase() === 'VIP' || Boolean(u.is_blue_chip);
      let badge = 'REGULER';
      if (index < 9) badge = '9 NAGA';
      else if (index < 25) badge = 'TAIPAN';
      else if (isVipUser) badge = 'VIP';

      return {
        rank: index + 1,
        id: u.id,
        username: u.username,
        ptName: formatCleanPtName(u.pt_name, u.has_pt),
        hasPt: Boolean(u.has_pt),
        sector: u.has_pt ? u.sector : 'Ritel Finansial',
        netWorth,
        cash: u.balance_ib,
        companyCash: u.company_balance_ib,
        stockValuation: u.stock_valuation,
        isVip: isVipUser || index < 9,
        badge
      };
    });

    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint Profil Publik Eksekutif Konglomerat (dengan proteksi privasi ketat)
app.get('/api/user/public-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await query.get(`
      SELECT id, username, has_pt, pt_name, pt_symbol, sector, pt_level, rd_level,
             is_ipo, fundamental_score, credit_score, credit_tier, is_blue_chip, role,
             created_at, employees_count, pt_description, pt_founded_at, email,
             balance_ib, company_balance_ib
      FROM users WHERE id = ? OR username = ?
    `, [userId, userId]);

    if (!user) {
      return res.status(404).json({ error: 'Data profil konglomerat tidak ditemukan di arsip IPMC.' });
    }

    // Hitung posisi di Leaderboard
    const rankMap = await getUserRankMap();
    const rankInfo = rankMap.get(user.id) || { rank: 999 };
    const rank = rankInfo.rank;
    const isVipUser = String(user.role || '').toUpperCase() === 'VIP' || Boolean(user.is_blue_chip);
    let badge = 'REGULER';
    if (rank <= 9) badge = '9 NAGA';
    else if (rank <= 25) badge = 'TAIPAN';
    else if (isVipUser) badge = 'VIP';

    // Masked Email untuk perlindungan privasi (e.g. "haz***@domain.com")
    let maskedEmail = 'Disamarkan demi privasi';
    if (user.email && user.email.includes('@')) {
      const parts = user.email.split('@');
      const name = parts[0];
      const domain = parts[1];
      const maskedName = name.length > 2 ? `${name.substring(0, 3)}***` : `${name}***`;
      maskedEmail = `${maskedName}@${domain}`;
    }

    // Masked Rekening Kas Brankas
    const maskedVaultAccount = `CFX-VAULT-${user.id.substring(0, 4).toUpperCase()}-****`;

    // Portofolio Saham Terbuka (Public Share Registry)
    const portfolios = await query.all(`
      SELECT p.lots_owned, p.avg_buy_price,
             c.id as company_id, c.symbol, c.name as company_name, c.current_price,
             c.sector as company_sector, c.total_shares
      FROM portfolios p
      JOIN companies c ON p.company_id = c.id
      WHERE p.user_id = ? AND p.lots_owned > 0
      ORDER BY (p.lots_owned * 100 * c.current_price) DESC
      LIMIT 12
    `, [user.id]);

    let totalStockValuation = 0;
    const publicShares = (portfolios || []).map((p) => {
      const sharesCount = p.lots_owned * 100;
      const valuation = sharesCount * p.current_price;
      totalStockValuation += valuation;
      const ownershipPct = p.total_shares > 0 ? ((sharesCount / p.total_shares) * 100).toFixed(2) : '0.00';
      return {
        companyId: p.company_id,
        symbol: p.symbol,
        companyName: p.company_name,
        sector: p.company_sector,
        lotsOwned: p.lots_owned,
        currentPrice: p.current_price,
        valuation,
        ownershipPct: parseFloat(ownershipPct)
      };
    });

    const netWorth = (user.balance_ib || 0) + (user.company_balance_ib || 0) + totalStockValuation;

    // Anak Perusahaan / Hasil Akuisisi (Subsidiaries)
    const subsidiaries = await query.all(`
      SELECT id, name, symbol, sector, current_price, fundamental_score, total_shares
      FROM companies
      WHERE owner_id = ? AND is_seized = 0
    `, [user.id]);

    res.json({
      id: user.id,
      username: user.username,
      rank,
      badge,
      isVip: isVipUser || rank <= 9,
      is9Naga: rank <= 9,
      isTaipan: rank > 9 && rank <= 25,
      joinedAt: user.created_at || '2026-10-15T00:00:00.000Z',
      creditScore: user.credit_score || 750,
      creditTier: user.credit_tier || 'STANDARD',
      privacy: {
        maskedEmail,
        maskedVaultAccount,
        protectionSeal: 'UU Perlindungan Nasabah & Kustodian Sentral IPMC',
        isAudited: true
      },
      wealth: {
        netWorth,
        personalCash: user.balance_ib,
        companyCash: user.company_balance_ib,
        stockValuation: totalStockValuation
      },
      holding: {
        hasPt: Boolean(user.has_pt),
        ptName: formatCleanPtName(user.pt_name, user.has_pt),
        symbol: user.pt_symbol || (user.is_ipo ? 'TBK' : 'PT'),
        sector: user.has_pt ? user.sector : 'Ritel Finansial',
        fundamentalScore: user.fundamental_score || 75,
        rdLevel: user.rd_level || 1,
        ptLevel: user.pt_level || 1,
        employeesCount: user.employees_count || 0,
        isIpo: Boolean(user.is_ipo),
        description: user.pt_description || `Holding ${user.pt_name} beroperasi di sektor ${user.sector}.`,
        subsidiariesCount: subsidiaries.length,
        subsidiaries: subsidiaries.map((s) => ({
          id: s.id,
          name: s.name,
          symbol: s.symbol,
          sector: s.sector,
          currentPrice: s.current_price,
          fundamentalScore: s.fundamental_score
        }))
      },
      portfolioShares: publicShares
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chat Global Bursa (Menampilkan Status 9 NAGA Sultan, TAIPAN, VIP, & Bank Sentral)
app.get('/api/chat', async (req, res) => {
  try {
    const msgs = await query.all('SELECT * FROM chat_messages ORDER BY created_at DESC LIMIT 60');
    const rankMap = await getUserRankMap();

    const enriched = msgs.reverse().map((m) => {
      const rankInfo = rankMap.get(m.user_id);
      let liveBadge = m.badge || 'REGULER';
      if (liveBadge !== 'BANK SENTRAL' && rankInfo) {
        const isVip = String(rankInfo.role || '').toUpperCase() === 'VIP';
        if (rankInfo.rank <= 9) {
          liveBadge = isVip ? `9 NAGA #${rankInfo.rank} • VIP` : `9 NAGA #${rankInfo.rank}`;
        } else if (rankInfo.rank <= 25) {
          liveBadge = isVip ? 'TAIPAN • VIP' : 'TAIPAN';
        } else if (isVip) {
          liveBadge = 'VIP SULTAN';
        } else if (rankInfo.isBlueChip) {
          liveBadge = 'BLUE CHIP';
        }
      }
      const cleanPt = m.pt_name && !m.pt_name.toLowerCase().includes('investor') && !m.pt_name.toLowerCase().includes('bank sentral') && !m.pt_name.toLowerCase().includes('otoritas')
        ? formatCleanPtName(m.pt_name, true)
        : (m.pt_name || 'Investor Mandiri');

      return {
        ...m,
        pt_name: cleanPt,
        badge: liveBadge,
        rank: rankInfo ? rankInfo.rank : null
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { userId, text } = req.body;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const rankMap = await getUserRankMap();
    const rankInfo = rankMap.get(user.id);
    const isVip = String(user.role || '').toUpperCase() === 'VIP';

    let badge = 'REGULER';
    if (user.role === 'ADMIN') {
      badge = 'BANK SENTRAL';
    } else if (rankInfo && rankInfo.rank <= 9) {
      badge = isVip ? `9 NAGA #${rankInfo.rank} • VIP` : `9 NAGA #${rankInfo.rank}`;
    } else if (rankInfo && rankInfo.rank <= 25) {
      badge = isVip ? 'TAIPAN • VIP' : 'TAIPAN';
    } else if (isVip) {
      badge = 'VIP SULTAN';
    } else if (user.is_blue_chip) {
      badge = 'BLUE CHIP';
    }

    const msgId = uuidv4();
    const ptDisplayName = formatCleanPtName(user.pt_name, user.has_pt);

    await query.run(
      'INSERT INTO chat_messages (id, user_id, username, pt_name, text, badge) VALUES (?, ?, ?, ?, ?, ?)',
      [msgId, user.id, user.username, ptDisplayName, text, badge]
    );

    const obj = {
      id: msgId,
      user_id: user.id,
      username: user.username,
      pt_name: ptDisplayName,
      text,
      badge,
      rank: rankInfo ? rankInfo.rank : null,
      created_at: new Date().toISOString()
    };
    io.emit('chat:message', obj);
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin overview
app.get('/api/admin/overview', async (req, res) => {
  try {
    const totalPlayers = await query.get("SELECT COUNT(*) as count FROM users WHERE role != 'ADMIN'");
    const totalCompanies = await query.get('SELECT COUNT(*) as count FROM companies');
    const healthyBots = await query.get("SELECT COUNT(*) as count FROM companies WHERE status = 'HEALTHY'");
    const criticalBots = await query.get("SELECT COUNT(*) as count FROM companies WHERE status = 'CRITICAL'");
    const totalTrades = await query.get('SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as volume FROM transactions');
    const settings = await query.all('SELECT * FROM central_bank_settings');
    const activeEvents = await query.all('SELECT * FROM macro_events WHERE active = 1 ORDER BY started_at DESC');
    const mktCapRow = await query.get('SELECT COALESCE(SUM(current_price * total_shares), 0) as mcap FROM companies');
    const treasuryRow = await query.get("SELECT COALESCE(SUM(CASE WHEN direction = 'INCOME' THEN amount_ib ELSE -amount_ib END), 0) as balance FROM state_treasury_ledger");
    const mktOverview = simulationEngine ? simulationEngine.getMarketOverview() : null;

    res.json({
      totalPlayers: totalPlayers ? totalPlayers.count : 0,
      totalCompanies: totalCompanies ? totalCompanies.count : 0,
      healthyBots: healthyBots ? healthyBots.count : 0,
      criticalBots: criticalBots ? criticalBots.count : 0,
      totalTrades: totalTrades ? totalTrades.count : 0,
      marketVolumeIb: totalTrades ? totalTrades.volume : 0,
      totalMarketCap: mktCapRow ? mktCapRow.mcap : 0,
      treasuryBalance: (treasuryRow ? treasuryRow.balance : 0) + 50000000000,
      marketIndex: mktOverview,
      settings: Object.fromEntries(settings.map(s => [s.key, s.value])),
      activeEvents,
      activeEvent: activeEvents.length > 0 ? activeEvents[0] : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Users: Data Lengkap Konglomerat & Seluruh Aset (Kas, Portofolio Saham, Anak Perusahaan, Hutang Bank)
app.get('/api/admin/users', async (req, res) => {
  try {
    const rawUsers = await query.all(`
      SELECT u.*, COALESCE(SUM(p.lots_owned * 100 * c.current_price), 0) as stock_valuation
      FROM users u
      LEFT JOIN portfolios p ON u.id = p.user_id
      LEFT JOIN companies c ON p.company_id = c.id
      WHERE u.role != 'ADMIN'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    const users = [];
    for (const u of rawUsers) {
      delete u.password_hash;

      // 1. Perusahaan-perusahaan yang dimiliki (PT Utama & Anak Perusahaan / Hasil Akuisisi)
      const companiesOwned = await query.all(
        `SELECT id, symbol, name, sector, is_ipo, status, current_price, company_balance_ib, total_shares, circulating_shares,
                is_acquired, founder_name, founded_at
         FROM companies 
         WHERE owner_id = ?
         ORDER BY current_price * total_shares DESC`,
        [u.id]
      );

      // 2. Rincian Aset Portofolio Saham yang Dimiliki di Bursa
      const stockPortfolios = await query.all(
        `SELECT p.lots_owned, p.avg_buy_price, c.id as company_id, c.symbol, c.name, c.sector, c.current_price,
                (p.lots_owned * 100 * c.current_price) as market_value,
                ((c.current_price - p.avg_buy_price) * p.lots_owned * 100) as floating_profit,
                CASE WHEN p.avg_buy_price > 0 
                     THEN ((c.current_price - p.avg_buy_price) / p.avg_buy_price * 100.0) 
                     ELSE 0.0 
                END as return_pct
         FROM portfolios p
         JOIN companies c ON p.company_id = c.id
         WHERE p.user_id = ? AND p.lots_owned > 0
         ORDER BY market_value DESC`,
        [u.id]
      );

      // 3. Status Pinjaman Bank Sentral Aktif
      const activeLoan = await query.get(
        `SELECT * FROM loans WHERE user_id = ? AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
        [u.id]
      );

      let loanDetails = null;
      if (activeLoan) {
        const dueDate = new Date(activeLoan.due_date);
        const now = new Date();
        const diffMs = dueDate - now;
        const remainingDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isOverdue = diffMs < 0;
        loanDetails = {
          ...activeLoan,
          remaining_days: remainingDays,
          is_overdue: isOverdue,
          days_overdue: isOverdue ? Math.abs(remainingDays) : 0
        };
      }

      // 4. Kalkulasi Total Net Worth Riil
      const totalStockVal = stockPortfolios.reduce((acc, cur) => acc + (cur.market_value || 0), 0);
      const totalCashHolding = companiesOwned.reduce((acc, cur) => acc + (cur.company_balance_ib || 0), 0);
      const debtAmount = loanDetails ? (loanDetails.remaining_amount || 0) : 0;
      const netWorth = (u.balance_ib || 0) + (u.company_balance_ib || 0) + totalStockVal - debtAmount;

      users.push({
        ...u,
        stock_valuation: totalStockVal,
        total_cash_holding: totalCashHolding,
        net_worth: netWorth,
        companies_owned: companiesOwned,
        stock_portfolios: stockPortfolios,
        active_loan: loanDetails,
      });
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Companies: Mengetahui Siapa Pemilik Setiap Perusahaan di Bursa & Status Pengawasan
app.get('/api/admin/companies', async (req, res) => {
  try {
    const list = await query.all(`
      SELECT c.*, 
             u.username as owner_username,
             u.pt_name as owner_pt_name,
             u.balance_ib as owner_balance_ib,
             CASE 
               WHEN c.is_bot = 1 THEN 'BOT_BURSA'
               WHEN c.is_acquired = 1 THEN 'AKUISISI'
               ELSE 'FOUNDER'
             END as ownership_category,
             COALESCE(sh.percentage, 100.0) as founder_pct,
             (c.current_price * c.total_shares) as market_cap
      FROM companies c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN company_shareholders sh ON c.id = sh.company_id AND sh.holder_type = 'FOUNDER'
      ORDER BY market_cap DESC
    `);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/ban', async (req, res) => {
  const user = await query.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  const newStatus = user.is_banned ? 0 : 1;
  await query.run('UPDATE users SET is_banned = ? WHERE id = ?', [newStatus, user.id]);
  res.json({ success: true, isBanned: Boolean(newStatus) });
});

app.post('/api/admin/users/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { balance_ib, cash_balance_ib, company_balance_ib, credit_score, credit_tier, pt_name, sector, role } = req.body;

    const user = await query.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const newBalance = balance_ib !== undefined ? parseFloat(balance_ib) : (cash_balance_ib !== undefined ? parseFloat(cash_balance_ib) : user.balance_ib);
    const newCompanyBalance = company_balance_ib !== undefined ? parseFloat(company_balance_ib) : user.company_balance_ib;
    const newCreditScore = credit_score !== undefined ? parseInt(credit_score) : (user.credit_score || 700);
    const newCreditTier = credit_tier !== undefined ? credit_tier : (user.credit_tier || 'STANDARD');
    const newPtName = pt_name !== undefined ? pt_name : user.pt_name;
    const newSector = sector !== undefined ? sector : user.sector;
    const newRole = role !== undefined ? role : (user.role || 'PLAYER');

    try {
      await query.run(
        `UPDATE users 
         SET balance_ib = ?, company_balance_ib = ?, credit_score = ?, credit_tier = ?, pt_name = ?, sector = ?, role = ? 
         WHERE id = ?`,
        [newBalance, newCompanyBalance, newCreditScore, newCreditTier, newPtName, newSector, newRole, id]
      );
    } catch (dbErr) {
      // Fallback query if credit_tier column is not yet present in some tables
      await query.run(
        `UPDATE users 
         SET balance_ib = ?, company_balance_ib = ?, credit_score = ?, pt_name = ?, sector = ?, role = ? 
         WHERE id = ?`,
        [newBalance, newCompanyBalance, newCreditScore, newPtName, newSector, newRole, id]
      );
    }

    // Broadcast balance update immediately to the user via Socket.IO
    io.emit('user:balance_updated', {
      userId: id,
      balance_ib: newBalance,
      company_balance_ib: newCompanyBalance,
      credit_score: newCreditScore
    });

    const updatedUser = await query.get('SELECT * FROM users WHERE id = ?', [id]);
    delete updatedUser.password_hash;

    res.json({
      success: true,
      message: `Data & Saldo pemain ${user.username} berhasil diperbarui!`,
      user: updatedUser
    });
  } catch (err) {
    console.error('Edit user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// BANK SENTRAL: PINJAMAN & BAILOUT
// ----------------------------------------------------

// 1. Ambil Riwayat & Status Pinjaman Aktif Pengguna
app.get('/api/bank/loans/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const loans = await query.all(
      'SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    const now = Date.now();
    const formatted = loans.map(l => {
      const dueMs = new Date(l.due_date).getTime();
      const isOverdue = l.status === 'ACTIVE' && now > dueMs;
      const msLeft = Math.max(0, dueMs - now);
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.ceil(msLeft / (1000 * 60 * 60));

      return {
        ...l,
        is_overdue: isOverdue,
        days_remaining: daysLeft,
        hours_remaining: hoursLeft,
        formatted_due_date: new Date(l.due_date).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })
      };
    });

    const activeLoan = formatted.find(l => l.status === 'ACTIVE') || null;

    res.json({
      loans: formatted,
      activeLoan
    });
  } catch (err) {
    console.error('Get loans error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Pengajuan Pinjaman Tunai Bank Sentral (dengan Tenor, Bunga, Cicilan & Ceklis Syarat Sita Aset)
app.post('/api/bank/loan/apply', async (req, res) => {
  try {
    const { userId, amount, tenorDays, agreedToTerms, collateralType } = req.body;
    const loanAmount = parseFloat(amount);

    if (!userId || !loanAmount || loanAmount <= 0) {
      return res.status(400).json({ error: 'Jumlah pinjaman tidak valid' });
    }

    if (!agreedToTerms) {
      return res.status(400).json({
        error: 'Anda wajib menyetujui Perjanjian Kredit & Penyitaan Aset Bank Sentral IPMC sebelum mengajukan pinjaman!'
      });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Cek apakah ada pinjaman aktif yang belum lunas
    const existingActive = await query.get(
      "SELECT * FROM loans WHERE user_id = ? AND status = 'ACTIVE' AND remaining_amount > 0",
      [userId]
    );
    if (existingActive) {
      return res.status(400).json({
        error: `Anda masih memiliki pinjaman aktif sebesar IB ${Math.round(existingActive.remaining_amount).toLocaleString('id-ID')}. Lunasi terlebih dahulu sebelum mengajukan pinjaman baru!`
      });
    }

    // Suku bunga bank sentral saat ini (p.a.)
    const rateRow = await query.get("SELECT value FROM central_bank_settings WHERE key = 'interest_rate'");
    const interestRate = parseFloat(rateRow ? rateRow.value : 6.5);

    // Cek limit plafon berdasarkan credit score (Credit score 750 = limit s.d IB 1.5 Miliar)
    const maxLoan = user.credit_score * 2000000;
    if (loanAmount > maxLoan) {
      return res.status(400).json({
        error: `Jumlah pinjaman melebihi plafon credit score Anda. Maksimal pinjaman: IB ${maxLoan.toLocaleString('id-ID')}`
      });
    }

    // Hitung Tenor & Bunga
    const tenor = parseInt(tenorDays) || 7; // Default 7 hari
    const totalInterest = Math.round(loanAmount * (interestRate / 100) * (tenor / 30));
    const totalRepayment = loanAmount + totalInterest;
    const dailyInstallment = Math.round(totalRepayment / tenor);
    const dueDate = new Date(Date.now() + tenor * 24 * 60 * 60 * 1000).toISOString();
    const loanId = uuidv4();

    // Catat pinjaman ke tabel loans
    await query.run(
      `INSERT INTO loans (id, user_id, principal_amount, remaining_amount, interest_rate, collateral_type, status, due_date, tenor_days, installment_interval_days, daily_installment_ib, total_interest_ib, paid_amount)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, 1, ?, ?, 0)`,
      [
        loanId,
        userId,
        loanAmount,
        totalRepayment,
        interestRate,
        collateralType || 'ASET_DAN_SAHAM_PT',
        dueDate,
        tenor,
        dailyInstallment,
        totalInterest
      ]
    );

    // Cairkan pinjaman langsung ke Kas Tabungan Pribadi
    await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [loanAmount, userId]);

    const updatedUser = await query.get('SELECT * FROM users WHERE id = ?', [userId]);

    // Broadcast update saldo seketika
    io.to(userId).emit('user:balance_updated', {
      balance_ib: updatedUser.balance_ib,
      company_balance_ib: updatedUser.company_balance_ib
    });

    // Catat transaksi
    io.emit('trade:executed', {
      type: 'LOAN',
      symbol: 'BANK SENTRAL',
      lots: 0,
      pricePerShare: 0,
      totalAmount: loanAmount,
      userName: user.username
    });

    res.json({
      success: true,
      message: `Pinjaman likuiditas IB ${loanAmount.toLocaleString('id-ID')} cair ke Kas Pribadi! Tenor ${tenor} hari, bunga ${interestRate}%.`,
      newBalance: updatedUser.balance_ib,
      loan: {
        id: loanId,
        principalAmount: loanAmount,
        remainingAmount: totalRepayment,
        interestRate,
        tenorDays: tenor,
        dailyInstallment,
        dueDate
      }
    });
  } catch (err) {
    console.error('Loan apply error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Pembayaran Cicilan / Pelunasan Hutang Bank Sentral
app.post('/api/bank/loan/repay', async (req, res) => {
  try {
    const { loanId, userId, type, amount } = req.body;
    if (!loanId || !userId) {
      return res.status(400).json({ error: 'Data pembayaran tidak lengkap' });
    }

    const loan = await query.get('SELECT * FROM loans WHERE id = ? AND user_id = ?', [loanId, userId]);
    if (!loan) return res.status(404).json({ error: 'Pinjaman tidak ditemukan' });

    if (loan.status !== 'ACTIVE' || loan.remaining_amount <= 0) {
      return res.status(400).json({ error: 'Pinjaman ini sudah lunas atau tidak aktif!' });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Tentukan jumlah bayar: cicilan harian atau lunas semua
    let payAmt = 0;
    if (type === 'FULL') {
      payAmt = loan.remaining_amount;
    } else if (type === 'INSTALLMENT') {
      payAmt = Math.min(loan.remaining_amount, loan.daily_installment_ib > 0 ? loan.daily_installment_ib : Math.round(loan.remaining_amount / 3));
    } else if (amount && parseFloat(amount) > 0) {
      payAmt = Math.min(loan.remaining_amount, parseFloat(amount));
    } else {
      payAmt = loan.remaining_amount;
    }

    if (user.balance_ib < payAmt) {
      return res.status(400).json({
        error: `Saldo Kas Pribadi Anda (IB ${Math.round(user.balance_ib).toLocaleString('id-ID')}) tidak mencukupi untuk membayar IB ${Math.round(payAmt).toLocaleString('id-ID')}!`
      });
    }

    // Potong dari Kas Pribadi
    await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [payAmt, userId]);

    const newRemaining = Math.max(0, loan.remaining_amount - payAmt);
    const newPaid = (loan.paid_amount || 0) + payAmt;
    const isFullyPaid = newRemaining <= 0;
    const newStatus = isFullyPaid ? 'PAID' : 'ACTIVE';

    await query.run(
      'UPDATE loans SET remaining_amount = ?, paid_amount = ?, status = ? WHERE id = ?',
      [newRemaining, newPaid, newStatus, loanId]
    );

    // Jika lunas tepat waktu, beri apresiasi bonus Credit Score +25 poin!
    if (isFullyPaid) {
      await query.run(
        'UPDATE users SET credit_score = MIN(850, credit_score + 25) WHERE id = ?',
        [userId]
      );
    }

    const updatedUser = await query.get('SELECT * FROM users WHERE id = ?', [userId]);

    io.to(userId).emit('user:balance_updated', {
      balance_ib: updatedUser.balance_ib,
      company_balance_ib: updatedUser.company_balance_ib
    });

    res.json({
      success: true,
      message: isFullyPaid
        ? `Selamat! Pinjaman Bank Sentral telah LUNAS! Credit score Anda naik +25 poin.`
        : `Pembayaran cicilan IB ${Math.round(payAmt).toLocaleString('id-ID')} berhasil. Sisa hutang: IB ${Math.round(newRemaining).toLocaleString('id-ID')}.`,
      newBalance: updatedUser.balance_ib,
      remainingAmount: newRemaining,
      paidAmount: newPaid,
      isFullyPaid
    });
  } catch (err) {
    console.error('Loan repay error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Eksekusi Sita Aset & Likuidasi Jaminan Bank Sentral IPMC (Jika Gagal Bayar / Menunggak)
app.post('/api/bank/loan/seize', async (req, res) => {
  try {
    const { loanId } = req.body;
    const loan = await query.get('SELECT * FROM loans WHERE id = ?', [loanId]);
    if (!loan) return res.status(404).json({ error: 'Pinjaman tidak ditemukan' });

    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Hanya pinjaman aktif yang dapat dieksekusi sita aset!' });
    }

    const user = await query.get('SELECT * FROM users WHERE id = ?', [loan.user_id]);
    const debt = loan.remaining_amount;

    // Sita saldo Kas PT atau potong kepemilikan saham
    let seizedCash = 0;
    if (user.company_balance_ib > 0) {
      seizedCash = Math.min(debt, user.company_balance_ib);
      await query.run('UPDATE users SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [seizedCash, user.id]);
    }

    // Pinalti skor kredit dan status sita
    await query.run('UPDATE users SET credit_score = MAX(300, credit_score - 100) WHERE id = ?', [user.id]);
    await query.run("UPDATE loans SET status = 'SEIZED', remaining_amount = 0 WHERE id = ?", [loanId]);

    // Eksekusi Sita Perusahaan Pemilik (Batas Jatuh Tempo 4 Hari Masa Tenggang)
    const nowS = new Date();
    const seizedAt = nowS.toISOString();
    const seizureDeadline = new Date(nowS.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
    await query.run(
      `UPDATE companies 
       SET is_seized = 1, seized_by = 'Bank Central Federation & PNAF', seized_at = ?, seizure_deadline = ?, is_auction_ready = 0, 
           seize_reason = 'Gagal bayar kredit sindikasi BCF jatuh tempo (Masa tenggang 4 hari)' 
       WHERE owner_id = ?`,
      [seizedAt, seizureDeadline, user.id]
    );

    // Siarkan berita sita aset ke seluruh bursa
    const newsId = uuidv4();
    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment) VALUES (?, ?, ?, ?, ?)',
      [
        newsId,
        `🚨 SITA ASET BANK SENTRAL: Jaminan & Perseroan Konglomerat ${user.username} Disita!`,
        `Bank Central Federation & PNAF menyita aset dan membekukan perseroan ${user.username} karena gagal melunasi pinjaman kredit jatuh tempo IB ${Math.round(debt).toLocaleString('id-ID')}. Diberikan masa tenggang 4 hari sebelum dilelang publik.`,
        'Finansial',
        'BEARISH'
      ]
    );

    io.emit('market:news_broadcast', {
      id: newsId,
      title: `🚨 SITA ASET: Jaminan & Perseroan Konglomerat ${user.username} Disita BCF!`,
      content: `Gagal bayar pinjaman likuiditas jatuh tempo. Perseroan disita dan dibekukan dengan masa tenggang tebus 4 hari.`,
      affectedSector: 'Finansial',
      sentiment: 'BEARISH',
      published_at: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Eksekusi sita aset dan pembekuan perseroan berhasil dilakukan oleh Bank Central Federation & PNAF (Masa tebus: 4 hari).`
    });
  } catch (err) {
    console.error('Loan seize error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Pengajuan Bailout / Dana Talangan Pailit
app.post('/api/bank/bailout', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Syarat bailout: saldo kas pribadi < IB 500.000
    if (user.balance_ib >= 500000) {
      return res.status(400).json({ error: 'Dana bailout darurat hanya diberikan jika saldo kas Anda di bawah IB 500.000!' });
    }

    const bailoutAmount = 5000000.0; // Injeksi darurat IB 5 Juta
    await query.run('UPDATE users SET balance_ib = balance_ib + ?, credit_score = MAX(300, credit_score - 50) WHERE id = ?', [bailoutAmount, userId]);

    res.json({
      success: true,
      message: `Bailout kemanusiaan IB ${bailoutAmount.toLocaleString('id-ID')} disetujui Bank Sentral. Credit score berkurang 50 poin.`,
      newBalance: user.balance_ib + bailoutAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public Central Bank Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await query.all('SELECT * FROM central_bank_settings');
    res.json(Object.fromEntries(settings.map(s => [s.key, s.value])));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Events & News
app.post('/api/admin/events/trigger', async (req, res) => {
  const { title, description, affectedSector, priceImpactPct } = req.body;
  const id = uuidv4();
  await query.run(
    'INSERT INTO macro_events (id, title, description, affected_sector, price_impact_pct, active, duration_seconds) VALUES (?, ?, ?, ?, ?, 1, 1800)',
    [id, title, description, affectedSector || 'ALL', priceImpactPct || 10.0]
  );

  // Efek Langsung ke Pasar: Anjlokkan / Dongkrak harga saham dan indeks seketika!
  if (simulationEngine && typeof simulationEngine.applyMacroShock === 'function') {
    await simulationEngine.applyMacroShock(affectedSector || 'ALL', parseFloat(priceImpactPct || 10.0));
  }

  // Siarkan breaking news otomatis ke running text & ticker seluruh pemain
  const newsSentiment = (parseFloat(priceImpactPct) < 0) ? 'BEARISH' : 'BULLISH';
  const newsId = uuidv4();
  await query.run(
    'INSERT INTO news (id, title, content, affected_sector, sentiment) VALUES (?, ?, ?, ?, ?)',
    [newsId, `🚨 BREAKING: ${title}`, description, affectedSector || 'ALL', newsSentiment]
  );
  io.emit('market:news_broadcast', {
    id: newsId,
    title: `🚨 BREAKING: ${title}`,
    content: description,
    affectedSector: affectedSector || 'ALL',
    sentiment: newsSentiment,
    published_at: new Date().toISOString()
  });

  io.emit('macro:event_triggered', { id, title, description, affectedSector, priceImpactPct });
  res.json({ success: true, message: `Event '${title}' aktif. Efek ke pasar (${priceImpactPct}%) langsung diterapkan!` });
});

app.post('/api/admin/news/inject', async (req, res) => {
  const { title, content, affectedSector, sentiment } = req.body;
  const id = uuidv4();
  await query.run(
    'INSERT INTO news (id, title, content, affected_sector, sentiment) VALUES (?, ?, ?, ?, ?)',
    [id, title, content, affectedSector || 'ALL', sentiment || 'BULLISH']
  );
  const item = { id, title, content, affectedSector, sentiment, published_at: new Date().toISOString() };
  io.emit('market:news_broadcast', item);
  res.json({ success: true, news: item });
});

app.get('/api/admin/settings', async (req, res) => {
  const settings = await query.all('SELECT * FROM central_bank_settings');
  res.json(Object.fromEntries(settings.map(s => [s.key, s.value])));
});

app.put('/api/admin/settings', async (req, res) => {
  const settingsObj = req.body.settings || req.body;
  if (settingsObj && typeof settingsObj === 'object') {
    for (const [key, value] of Object.entries(settingsObj)) {
      await query.run('INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES (?, ?)', [key, String(value)]);
    }
  }
  const allSettings = await query.all('SELECT * FROM central_bank_settings');
  const mapped = Object.fromEntries(allSettings.map(s => [s.key, s.value]));

  // Broadcast real-time update to mobile app and web admin!
  io.emit('settings:updated', mapped);
  if (mapped.interest_rate) {
    const rate = parseFloat(mapped.interest_rate);
    io.emit('central_bank:rate', { interestRate: rate });
  }

  // Perbarui timer arus kas jika interval diubah
  if (simulationEngine && typeof simulationEngine.updateRevenueInterval === 'function') {
    await simulationEngine.updateRevenueInterval();
  }

  res.json({ success: true, settings: mapped });
});

app.put('/api/admin/bots/:id/status', async (req, res) => {
  await query.run('UPDATE companies SET bot_status = ? WHERE id = ?', [req.body.status, req.params.id]);
  io.emit('company:bot_status_changed', { companyId: req.params.id, botStatus: req.body.status });
  res.json({ success: true, botStatus: req.body.status });
});

app.get('/api/admin/transactions', async (req, res) => {
  const logs = await query.all(`
    SELECT t.*, 
           t.price_per_share as price,
           t.total_amount as total_amount_ib,
           u.username, 
           c.symbol, 
           c.name as company_name
    FROM transactions t
    JOIN users u ON t.user_id = u.id
    JOIN companies c ON t.company_id = c.id
    ORDER BY t.created_at DESC LIMIT 100
  `);
  res.json(logs);
});

// Mount Modular Routers: Deals (P2P/Global), Live Courtroom, State Treasury, Company Seizure, Ledger, Trade Orders, Bonds, Subsidies, and Tenders
const dealsRouter = require('./routes/deals.routes')(io);
const courtRoomRouter = require('./routes/court_room.routes')(io);
const treasuryRouter = require('./routes/treasury.routes')(io, simulationEngine);
const seizureRouter = require('./routes/seizure.routes')(io, simulationEngine);
const ledgerRouter = require('./routes/ledger.routes')();
const ordersRouter = require('./routes/orders.routes')(io, simulationEngine);
const bondsRouter = require('./routes/bonds.routes')(io);
const subsidiesRouter = require('./routes/subsidies.routes')(io);
const tendersRouter = require('./routes/tenders.routes')(io);

app.use('/api/deals', dealsRouter);
app.use('/api/court', courtRoomRouter);
app.use('/api/treasury', treasuryRouter);
app.use('/api/companies', seizureRouter);
app.use('/api/seizure', seizureRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/trade-orders', ordersRouter);
app.use('/api/bonds', bondsRouter);
app.use('/api/subsidies', subsidiesRouter);
app.use('/api/tenders', tendersRouter);

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const releasesDir = path.join(__dirname, '../data/releases');
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}
const hostedApkPath = path.join(releasesDir, 'Capital-Federation-CFX.apk');
const bundledPublicApkPath = path.join(__dirname, '../public/downloads/Capital-Federation-CFX.apk');
const localBuiltApkPath = path.join(__dirname, '../../mobile/build/app/outputs/flutter-apk/app-release.apk');

async function getApkSettingsMap() {
  const defaults = {
    apk_version: '1.5.8',
    apk_build_number: '12',
    apk_min_android: 'Android 10.0 (API Level 29 / Quince Tart) ke atas',
    apk_file_size_mb: '25.0 MB',
    apk_release_notes: 'Sistem Suksesi Kepemilikan & PT Utama Otomatis saat Akuisisi Mayoritas (M&A/RUPS), Bot P2P Kooperatif Cerdas yang Bisa Membeli & Menolak Divestasi Saham Pemain, Hak Dividen Saham Minoritas, dan Perbaikan Duplikasi Kartu Perusahaan.',
    apk_external_url: '',
    apk_download_count: '185',
    apk_sha256: 'a063050909de6876837f05f3dba5aed608e7cc2d5ec47b9a2ed0ab0ea4438d08',
    apk_updated_at: new Date().toISOString(),
  };
  try {
    const rows = await query.all("SELECT key, value FROM central_bank_settings WHERE key LIKE 'apk_%'");
    for (const r of (rows || [])) {
      if (r.key && r.value !== undefined && r.value !== null) {
        defaults[r.key] = String(r.value);
      }
    }
    if (parseInt(defaults.apk_build_number || '0', 10) < 12) {
      defaults.apk_version = '1.5.8';
      defaults.apk_build_number = '12';
      defaults.apk_file_size_mb = '25.0 MB';
      defaults.apk_release_notes = 'Sistem Suksesi Kepemilikan & PT Utama Otomatis saat Akuisisi Mayoritas (M&A/RUPS), Bot P2P Kooperatif Cerdas yang Bisa Membeli & Menolak Divestasi Saham Pemain, Hak Dividen Saham Minoritas, dan Perbaikan Duplikasi Kartu Perusahaan.';
    }
  } catch (_) {}
  return defaults;
}

async function saveApkSetting(key, value) {
  await query.run(
    'INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES (?, ?)',
    [key, String(value ?? '')]
  );
}

function getActiveApkFilePath() {
  const candidates = [hostedApkPath, bundledPublicApkPath, localBuiltApkPath].filter((p) => fs.existsSync(p));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0];
}

// Endpoint Info Versi Sistem (Mobile APK, Web Admin, Website Download & Backend Server)
app.get('/api/version', async (req, res) => {
  try {
    const compCount = await query.get('SELECT COUNT(*) as count FROM companies');
    const userCount = await query.get("SELECT COUNT(*) as count FROM users WHERE role != 'ADMIN'");
    const apkCfg = await getApkSettingsMap();
    const activeApk = getActiveApkFilePath();
    let fileSizeMb = apkCfg.apk_file_size_mb || '24.7 MB';
    if (activeApk) {
      const stat = fs.statSync(activeApk);
      fileSizeMb = `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;
    }
    const ver = apkCfg.apk_version || '1.5.0';
    const buildNum = parseInt(apkCfg.apk_build_number || '5', 10) || 5;

    res.json({
      version: ver,
      buildNumber: buildNum,
      apkVersion: `v${ver}-CFX Production (Build ${buildNum})`,
      adminVersion: `v${ver} Sovereign Launch`,
      backendVersion: `v${ver}-CFX Production`,
      minAndroid: apkCfg.apk_min_android,
      fileSizeMb,
      hasHostedApk: Boolean(activeApk),
      externalUrl: apkCfg.apk_external_url || '',
      downloadUrl: '/api/download/apk',
      downloadCount: parseInt(apkCfg.apk_download_count || '148', 10) || 148,
      sha256: apkCfg.apk_sha256,
      totalCompanies: compCount?.count || 236,
      totalPlayers: userCount?.count || 126,
      releaseNotes: apkCfg.apk_release_notes,
      updatedAt: apkCfg.apk_updated_at || new Date().toISOString(),
      databaseProtection: 'SQLite Persistent Volume (Zero Reset on Update)'
    });
  } catch (err) {
    res.json({
      version: '1.5.0',
      buildNumber: 5,
      apkVersion: 'v1.5.0-CFX Production (Build 5)',
      adminVersion: 'v1.5.0 Sovereign Launch',
      backendVersion: 'v1.5.0-CFX Production',
      minAndroid: 'Android 10.0 (API Level 29 / Quince Tart) ke atas',
      fileSizeMb: '24.7 MB',
      hasHostedApk: Boolean(getActiveApkFilePath()),
      downloadUrl: '/api/download/apk',
      downloadCount: 148,
      releaseNotes: 'Ticker Saham 4-Huruf Resmi (Tanpa Angka), Perbaikan Nama PT, Efek Emas Chat Sultan 9 Naga & VIP, dan Deteksi Update Otomatis',
      databaseProtection: 'SQLite Persistent Volume (Zero Reset on Update)'
    });
  }
});

// Admin: Simpan Metadata Versi APK & Catatan Rilis
app.post('/api/admin/apk/metadata', async (req, res) => {
  try {
    const { version, buildNumber, minAndroid, releaseNotes, externalUrl } = req.body || {};
    if (version) await saveApkSetting('apk_version', String(version).trim());
    if (buildNumber !== undefined) await saveApkSetting('apk_build_number', String(buildNumber).trim());
    if (minAndroid) await saveApkSetting('apk_min_android', String(minAndroid).trim());
    if (releaseNotes !== undefined) await saveApkSetting('apk_release_notes', String(releaseNotes).trim());
    if (externalUrl !== undefined) await saveApkSetting('apk_external_url', String(externalUrl).trim());
    await saveApkSetting('apk_updated_at', new Date().toISOString());

    const updated = await getApkSettingsMap();
    res.json({
      success: true,
      message: `Metadata APK v${updated.apk_version} (Build ${updated.apk_build_number}) berhasil disimpan dan langsung aktif di Website Download & pendeteksi update aplikasi!`,
      config: updated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Upload File APK secara Chunked (Aman menembus Cloudflare Tunnel tanpa batas ukuran)
app.post('/api/admin/apk/upload-chunk', async (req, res) => {
  try {
    const { chunkIndex, totalChunks, chunkBase64, version, buildNumber, minAndroid, releaseNotes, key } = req.body || {};
    if (chunkBase64 === undefined || chunkIndex === undefined || totalChunks === undefined) {
      return res.status(400).json({ error: 'Parameter chunk tidak lengkap' });
    }

    const tmpPath = `${hostedApkPath}.tmp`;
    const buf = Buffer.from(chunkBase64, 'base64');

    if (Number(chunkIndex) === 0) {
      fs.writeFileSync(tmpPath, buf);
    } else {
      fs.appendFileSync(tmpPath, buf);
    }

    if (Number(chunkIndex) + 1 >= Number(totalChunks)) {
      if (fs.existsSync(hostedApkPath)) {
        fs.unlinkSync(hostedApkPath);
      }
      fs.renameSync(tmpPath, hostedApkPath);

      const stat = fs.statSync(hostedApkPath);
      const sizeMb = `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;
      const fileBuffer = fs.readFileSync(hostedApkPath);
      const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      await saveApkSetting('apk_file_size_mb', sizeMb);
      await saveApkSetting('apk_sha256', sha256);
      await saveApkSetting('apk_updated_at', new Date().toISOString());
      if (version) await saveApkSetting('apk_version', String(version).trim());
      if (buildNumber !== undefined) await saveApkSetting('apk_build_number', String(buildNumber).trim());
      if (minAndroid) await saveApkSetting('apk_min_android', String(minAndroid).trim());
      if (releaseNotes) await saveApkSetting('apk_release_notes', String(releaseNotes).trim());

      return res.json({
        success: true,
        completed: true,
        sizeMb,
        sha256,
        downloadUrl: '/api/download/apk',
        message: `🎉 File APK (${sizeMb}) berhasil diunggah ke server dan siap didownload di Website Utama!`
      });
    }

    res.json({
      success: true,
      completed: false,
      chunkIndex: Number(chunkIndex),
      totalChunks: Number(totalChunks)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Public: Download File APK Resmi Capital Federation
const handleApkDownload = async (req, res) => {
  try {
    const apkCfg = await getApkSettingsMap();
    const currentCount = parseInt(apkCfg.apk_download_count || '148', 10) || 148;
    await saveApkSetting('apk_download_count', String(currentCount + 1));

    const activeApk = getActiveApkFilePath();
    const ver = (apkCfg.apk_version || '1.5.0').replace(/[^0-9a-zA-Z._-]/g, '');
    const downloadFileName = `Capital-Federation-v${ver}-CFX.apk`;

    if (activeApk) {
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
      return res.sendFile(activeApk);
    }

    if (apkCfg.apk_external_url && apkCfg.apk_external_url.startsWith('http')) {
      return res.redirect(apkCfg.apk_external_url);
    }

    res.status(404).json({
      error: 'File installer APK sedang dipersiapkan oleh Otoritas Admin IPMC. Silakan coba beberapa saat lagi.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.get('/api/download/apk', handleApkDownload);
app.get('/download/apk', handleApkDownload);

// ----------------------------------------------------
// DATABASE BACKUP & RECOVERY SYSTEM (DISASTER RECOVERY)
// ----------------------------------------------------
const dbFilePath = path.resolve(__dirname, '../data/capital_federation.db');
const backupsDir = path.resolve(__dirname, '../data/backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// 1. Download database sqlite file directly
app.get('/api/admin/backup/download', async (req, res) => {
  try {
    const key = req.query.key;
    const authHeader = req.headers.authorization;
    let isAuthorized = false;

    if (key === '19122004') {
      isAuthorized = true;
    } else if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && (decoded.role === 'ADMIN' || decoded.username === 'admin')) {
          isAuthorized = true;
        }
      } catch (_) {}
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Akses ditolak: Diperlukan otorisasi Administrator.' });
    }

    if (!fs.existsSync(dbFilePath)) {
      return res.status(404).json({ error: 'File database tidak ditemukan.' });
    }

    // Flush WAL to disk for clean snapshot
    try {
      await query.run('PRAGMA wal_checkpoint(FULL)');
    } catch (_) {}

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const filename = `CapitalFederation_DB_Backup_${dateStr}.sqlite`;

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.sendFile(dbFilePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Buat snapshot lokal di server
app.post('/api/admin/backup/snapshot', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const key = req.body?.key || req.query.key;
    let isAuthorized = false;

    if (key === '19122004') {
      isAuthorized = true;
    } else if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && (decoded.role === 'ADMIN' || decoded.username === 'admin')) {
          isAuthorized = true;
        }
      } catch (_) {}
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Akses ditolak: Diperlukan otorisasi Administrator.' });
    }

    if (!fs.existsSync(dbFilePath)) {
      return res.status(404).json({ error: 'File database tidak ditemukan.' });
    }

    try {
      await query.run('PRAGMA wal_checkpoint(FULL)');
    } catch (_) {}

    const dateFormatted = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotFilename = `snapshot_${dateFormatted}.sqlite`;
    const snapshotPath = path.join(backupsDir, snapshotFilename);

    fs.copyFileSync(dbFilePath, snapshotPath);
    const stat = fs.statSync(snapshotPath);
    const sizeKb = Math.round(stat.size / 1024);

    // Prune: simpan maksimal 15 snapshot terbaru
    const existing = fs.readdirSync(backupsDir).filter(f => f.endsWith('.sqlite')).sort();
    if (existing.length > 15) {
      const toRemove = existing.slice(0, existing.length - 15);
      for (const f of toRemove) {
        try { fs.unlinkSync(path.join(backupsDir, f)); } catch (_) {}
      }
    }

    res.json({
      success: true,
      message: `Snapshot database berhasil diamankan di server: ${snapshotFilename} (${sizeKb} KB).`,
      filename: snapshotFilename,
      sizeKb,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Status cadangan database & list snapshot
app.get('/api/admin/backup/status', async (req, res) => {
  try {
    let dbSizeKb = 0;
    if (fs.existsSync(dbFilePath)) {
      const stat = fs.statSync(dbFilePath);
      dbSizeKb = Math.round(stat.size / 1024);
    }

    const userCount = await query.get("SELECT COUNT(*) as count FROM users WHERE role != 'ADMIN'");
    const compCount = await query.get("SELECT COUNT(*) as count FROM companies");
    const txCount = await query.get("SELECT COUNT(*) as count FROM transactions");

    let snapshots = [];
    if (fs.existsSync(backupsDir)) {
      snapshots = fs.readdirSync(backupsDir)
        .filter(f => f.endsWith('.sqlite'))
        .map(f => {
          const sStat = fs.statSync(path.join(backupsDir, f));
          return {
            filename: f,
            sizeKb: Math.round(sStat.size / 1024),
            createdAt: sStat.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json({
      dbSizeKb,
      totalPlayers: userCount?.count || 0,
      totalCompanies: compCount?.count || 0,
      totalTransactions: txCount?.count || 0,
      snapshots,
      downloadUrl: '/api/admin/backup/download?key=19122004',
      storageEngine: 'SQLite WAL Mode (Full ACID Compliance)'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deployment & Server Utility Routes (Auto-Deploy Git Pull - sejajar dengan db.js, seed.js, server.js)
const deployRoute = require('./deployRoute');
app.use('/', deployRoute);

// Sajikan Web Admin & Public Download Portal Statis dari folder backend/public
const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      const indexFile = path.join(publicDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
      }
    }
    next();
  });
}

// Socket connection
io.on('connection', (socket) => {
  socket.on('join_user', (userId) => {
    socket.join(userId);
  });
  socket.on('join_court_room', (caseId) => {
    socket.join(`court:${caseId}`);
  });
});

async function start() {
  await initDb();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🏦 Capital Federation Backend v1.4.0-CFX running on http://0.0.0.0:${PORT}`);
  });
  try {
    // Auto-seed 100 emiten bursa HANYA saat pertama kali server baru di-launching (database masih 0 emiten)
    // Saat ada update kodingan berikutnya, database TIDAK AKAN PERNAH di-seed ulang atau di-reset!
    const compCount = await query.get('SELECT COUNT(*) as count FROM companies');
    if (!compCount || compCount.count === 0) {
      console.log('🌱 Server baru terdeteksi (0 emiten). Menjalankan inisialisasi pasar perdana...');
      const { seed } = require('./seed');
      await seed();
      await syncAllToMariaDb();
    } else {
      // Pastikan 250+ emiten Tbk. dan 265 bot konglomerat/ritel aktif di database yang sudah berjalan
      const { ensureMarketPopulation } = require('./seed');
      await ensureMarketPopulation();
      await syncAllToMariaDb();
    }
  } catch (seedErr) {
    console.error('⚠️ Non-fatal warning in ensureMarketPopulation:', seedErr.message);
  }
  simulationEngine.start();
  surveillance.start();
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
