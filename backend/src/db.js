const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../data/capital_federation.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

// Enable WAL mode and busy timeout for high concurrency
db.configure('busyTimeout', 5000);
db.run('PRAGMA journal_mode = WAL;');
db.run('PRAGMA busy_timeout = 5000;');
db.run('PRAGMA synchronous = NORMAL;');
db.run('PRAGMA foreign_keys = ON;');

// Helper wrappers returning Promises
const query = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const execute = (attempts = 0) => {
        db.get(sql, params, (err, row) => {
          if (err) {
            if (err.code === 'SQLITE_BUSY' && attempts < 6) {
              setTimeout(() => execute(attempts + 1), 60 * (attempts + 1));
            } else {
              reject(err);
            }
          } else {
            resolve(row);
          }
        });
      };
      execute();
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const execute = (attempts = 0) => {
        db.all(sql, params, (err, rows) => {
          if (err) {
            if (err.code === 'SQLITE_BUSY' && attempts < 6) {
              setTimeout(() => execute(attempts + 1), 60 * (attempts + 1));
            } else {
              reject(err);
            }
          } else {
            resolve(rows);
          }
        });
      };
      execute();
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      const execute = (attempts = 0) => {
        db.run(sql, params, function (err) {
          if (err) {
            if (err.code === 'SQLITE_BUSY' && attempts < 6) {
              setTimeout(() => execute(attempts + 1), 60 * (attempts + 1));
            } else {
              reject(err);
            }
          } else {
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        });
      };
      execute();
    });
  },
  exec: (sql) => {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

const { v4: uuidv4 } = require('uuid');

async function recordCashFlow({
  userId,
  companyId = null,
  accountType,
  category,
  title,
  amountIb,
  direction,
  balanceAfter = 0,
  notes = ''
}) {
  try {
    const id = uuidv4();
    await query.run(
      `INSERT INTO cash_flow_ledger (id, user_id, company_id, account_type, category, title, amount_ib, direction, balance_after, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, companyId, accountType, category, title, Math.abs(amountIb), direction, balanceAfter, notes]
    );
    return id;
  } catch (err) {
    console.error('Failed to record cash flow ledger:', err);
    return null;
  }
}

async function initDb() {
  const schemaSql = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT DEFAULT '',
      email_verified INTEGER DEFAULT 0,
      password_hash TEXT NOT NULL,
      balance_ib REAL DEFAULT 10000000.0,       -- Saldo Rekening Kas Pribadi (Rp 10.000.000)
      company_balance_ib REAL DEFAULT 0.0,     -- Saldo Rekening Kas Perusahaan (PT)
      has_pt INTEGER DEFAULT 0,                -- 0 = Pemula (Belum punya PT), 1 = Sudah mendirikan PT
      pt_name TEXT DEFAULT '',
      sector TEXT DEFAULT '',
      pt_level INTEGER DEFAULT 1,
      fundamental_score REAL DEFAULT 70.0,
      rd_level INTEGER DEFAULT 1,              -- Riset & Pengembangan (R&D)
      marketing_level INTEGER DEFAULT 1,
      hr_level INTEGER DEFAULT 1,
      capacity_level INTEGER DEFAULT 1,
      is_ipo INTEGER DEFAULT 0,                -- 1 jika PT sudah go public (IPO)
      credit_score INTEGER DEFAULT 750,
      is_banned INTEGER DEFAULT 0,
      is_blue_chip INTEGER DEFAULT 0,
      bailout_count INTEGER DEFAULT 0,
      survivor_buff_until TEXT,
      role TEXT DEFAULT 'PLAYER',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      symbol TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sector TEXT NOT NULL,
      is_bot INTEGER DEFAULT 1,
      status TEXT DEFAULT 'HEALTHY',
      current_price REAL NOT NULL,
      base_price REAL NOT NULL,
      total_shares INTEGER DEFAULT 10000000,
      circulating_shares INTEGER DEFAULT 3000000,
      dividend_rate REAL DEFAULT 0.03,
      fundamental_score REAL DEFAULT 80.0,
      operational_level INTEGER DEFAULT 5,
      description TEXT,
      owner_id TEXT,
      is_ipo INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      price REAL NOT NULL,
      open REAL NOT NULL,
      close REAL NOT NULL,
      high REAL NOT NULL,
      low REAL NOT NULL,
      volume INTEGER DEFAULT 0,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      lots_owned INTEGER DEFAULT 0,
      avg_buy_price REAL DEFAULT 0.0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, company_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      type TEXT NOT NULL,                      -- 'BUY', 'SELL', 'TAKEOVER', 'DIVIDEND', 'INJECT_CAPITAL', 'WITHDRAW_DIVIDEND', 'IPO'
      lots INTEGER NOT NULL,
      price_per_share REAL NOT NULL,
      total_amount REAL NOT NULL,
      fee REAL DEFAULT 0.0,
      status TEXT DEFAULT 'COMPLETED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS macro_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      affected_sector TEXT NOT NULL,
      price_impact_pct REAL NOT NULL,
      active INTEGER DEFAULT 1,
      duration_seconds INTEGER DEFAULT 1800,
      started_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS news (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      affected_sector TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      impact_multiplier REAL DEFAULT 1.0,
      published_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS central_bank_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      principal_amount REAL NOT NULL,
      remaining_amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      collateral_type TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      due_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auction_items (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      shares_offered INTEGER NOT NULL,
      starting_bid_ib REAL NOT NULL,
      current_bid_ib REAL NOT NULL,
      highest_bidder_id TEXT,
      status TEXT DEFAULT 'ACTIVE',
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (highest_bidder_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS auction_bids (
      id TEXT PRIMARY KEY,
      auction_item_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      bid_amount_ib REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (auction_item_id) REFERENCES auction_items(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      pt_name TEXT NOT NULL,
      text TEXT NOT NULL,
      badge TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS company_shareholders (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      holder_name TEXT NOT NULL,
      holder_type TEXT NOT NULL, -- 'FOUNDER', 'INSTITUTION', 'PUBLIC', 'RETAIL'
      shares_count INTEGER NOT NULL,
      percentage REAL NOT NULL,
      user_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ipo_offerings (
      id TEXT PRIMARY KEY,
      company_id TEXT,
      user_id TEXT,
      company_name TEXT NOT NULL,
      symbol TEXT NOT NULL,
      sector TEXT NOT NULL,
      description TEXT,
      offering_price REAL NOT NULL,
      total_offering_shares INTEGER NOT NULL,
      total_offering_lots INTEGER NOT NULL,
      ordered_lots INTEGER DEFAULT 0,
      status TEXT DEFAULT 'OFFERING', -- 'BOOKBUILDING', 'OFFERING', 'LISTED_ARA'
      listing_date TEXT NOT NULL,
      listing_time TEXT DEFAULT '07:00 WIB',
      is_oversubscribed INTEGER DEFAULT 1,
      oversubscribed_ratio REAL DEFAULT 1.45,
      first_day_ara_pct REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ipo_orders (
      id TEXT PRIMARY KEY,
      ipo_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      lots INTEGER NOT NULL,
      price_per_share REAL NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'ALLOTED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ipo_id) REFERENCES ipo_offerings(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ipo_bids (
      id TEXT PRIMARY KEY,
      ipo_id TEXT NOT NULL,
      bidder_user_id TEXT NOT NULL,
      bidder_company_name TEXT NOT NULL,
      bidder_company_id TEXT,
      requested_percentage REAL NOT NULL,
      offered_price_per_share REAL NOT NULL,
      total_investment_ib REAL NOT NULL,
      strategic_pitch TEXT,
      status TEXT DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ipo_id) REFERENCES ipo_offerings(id) ON DELETE CASCADE,
      FOREIGN KEY (bidder_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS court_cases (
      id TEXT PRIMARY KEY,
      case_number TEXT UNIQUE NOT NULL,
      case_type TEXT NOT NULL, -- 'BANKRUPTCY', 'DISPUTE', 'REGULATORY'
      title TEXT NOT NULL,
      plaintiff_name TEXT NOT NULL,
      defendant_name TEXT NOT NULL,
      defendant_user_id TEXT,
      defendant_company_id TEXT,
      claim_amount_ib REAL DEFAULT 0.0,
      court_hearing_date TEXT,
      status TEXT DEFAULT 'IN_TRIAL', -- 'IN_TRIAL', 'VERDICT_PAILIT', 'VERDICT_PKPU', 'VERDICT_REJECTED'
      verdict_notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_flow_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT,                    -- ID PT atau Anak Perusahaan jika transaksi kas PT
      account_type TEXT NOT NULL,         -- 'PERSONAL' (Kas Pribadi) atau 'COMPANY' (Kas PT)
      category TEXT NOT NULL,             -- 'REVENUE', 'OPERATIONAL_EXPENSE', 'SALARY', 'DIVIDEND_INCOME', 'DIVIDEND_WITHDRAW', 'CAPITAL_INJECTION', 'STOCK_BUY', 'STOCK_SELL', 'IPO_PROCEEDS', 'IPO_FEE', 'TAX', 'BANK_LOAN', 'LOAN_REPAY'
      title TEXT NOT NULL,
      amount_ib REAL NOT NULL,
      direction TEXT NOT NULL,            -- 'INCOME' (+) atau 'EXPENSE' (-)
      balance_after REAL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS market_orders (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,                 -- 'BUY' atau 'SELL'
      target_lots INTEGER NOT NULL,
      filled_lots INTEGER DEFAULT 0,
      price_per_share REAL NOT NULL,
      status TEXT DEFAULT 'OPEN',         -- 'OPEN', 'PARTIAL', 'FILLED', 'CANCELLED'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ph_comp ON price_history(company_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_trans_user ON transactions(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_port_user ON portfolios(user_id);
    CREATE INDEX IF NOT EXISTS idx_sh_comp ON company_shareholders(company_id);
    CREATE INDEX IF NOT EXISTS idx_ipo_status ON ipo_offerings(status);
    CREATE INDEX IF NOT EXISTS idx_ipo_orders_user ON ipo_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_ipo_bids ON ipo_bids(ipo_id, bidder_user_id);
    CREATE INDEX IF NOT EXISTS idx_court_status ON court_cases(status);
    CREATE INDEX IF NOT EXISTS idx_cfl_user ON cash_flow_ledger(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_cfl_comp ON cash_flow_ledger(company_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_mkt_orders ON market_orders(company_id, status);
  `;

  await query.exec(schemaSql);

  // Safe Alter Table Migrations for realistic market and executive staff
  const safeAddColumn = async (table, colDef) => {
    try {
      await query.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
    } catch (e) {
      // Column already exists, safe to ignore
    }
  };

  await safeAddColumn('companies', 'prev_close REAL DEFAULT 0.0');
  await safeAddColumn('companies', 'daily_high REAL DEFAULT 0.0');
  await safeAddColumn('companies', 'daily_low REAL DEFAULT 0.0');
  await safeAddColumn('companies', 'is_acquired INTEGER DEFAULT 0');
  await safeAddColumn('companies', 'company_balance_ib REAL DEFAULT 50000000.0');
  await safeAddColumn('companies', 'employees_count INTEGER DEFAULT 10');
  await safeAddColumn('companies', 'ceo_level INTEGER DEFAULT 0');
  await safeAddColumn('companies', 'cfo_level INTEGER DEFAULT 0');
  await safeAddColumn('companies', 'cmo_level INTEGER DEFAULT 0');
  await safeAddColumn('companies', 'founder_shares_sold REAL DEFAULT 0.0');
  await safeAddColumn('companies', 'suspended_at TEXT');
  // Pengawasan bursa: UMA (peringatan) & Suspensi (berhenti sampai tanggal tertentu)
  await safeAddColumn('companies', 'uma_flag INTEGER DEFAULT 0');
  await safeAddColumn('companies', "uma_direction TEXT DEFAULT 'UP'");
  await safeAddColumn('companies', 'uma_reason TEXT');
  await safeAddColumn('companies', 'uma_source TEXT');
  await safeAddColumn('companies', 'uma_at TEXT');
  await safeAddColumn('companies', "bot_status TEXT DEFAULT 'MODERATE'");
  await safeAddColumn('companies', 'suspend_until TEXT');
  await safeAddColumn('companies', 'suspend_reason TEXT');
  await safeAddColumn('companies', 'rd_level INTEGER DEFAULT 1');
  await safeAddColumn('companies', 'marketing_level INTEGER DEFAULT 1');
  await safeAddColumn('companies', 'hr_level INTEGER DEFAULT 1');
  await safeAddColumn('companies', 'capacity_level INTEGER DEFAULT 1');
  await safeAddColumn('companies', 'pt_level INTEGER DEFAULT 1');
  await safeAddColumn('companies', "listing_status TEXT DEFAULT 'LISTED'");
  await safeAddColumn('users', "credit_tier TEXT DEFAULT 'STANDARD'");
  await query.exec(`
    CREATE TABLE IF NOT EXISTS market_oversight_log (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      action TEXT NOT NULL,
      source TEXT NOT NULL,
      reason TEXT,
      until TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_oversight_created ON market_oversight_log(created_at);
  `);
  await safeAddColumn('users', 'employees_count INTEGER DEFAULT 0');
  await safeAddColumn('users', 'ceo_level INTEGER DEFAULT 0');
  await safeAddColumn('users', 'cfo_level INTEGER DEFAULT 0');
  await safeAddColumn('users', 'cmo_level INTEGER DEFAULT 0');
  await safeAddColumn('users', 'founder_shares_sold REAL DEFAULT 0.0');
  await safeAddColumn('loans', 'tenor_days INTEGER DEFAULT 7');
  await safeAddColumn('loans', 'installment_interval_days INTEGER DEFAULT 1');
  await safeAddColumn('loans', 'daily_installment_ib REAL DEFAULT 0');
  await safeAddColumn('loans', 'total_interest_ib REAL DEFAULT 0');
  await safeAddColumn('loans', 'paid_amount REAL DEFAULT 0');

  // PT Deed & Synchronization columns
  await safeAddColumn('users', "pt_symbol TEXT DEFAULT ''");
  await safeAddColumn('users', "pt_description TEXT DEFAULT ''");
  await safeAddColumn('users', "pt_founded_at TEXT DEFAULT ''");
  await safeAddColumn('users', "pt_founder_name TEXT DEFAULT ''");
  await safeAddColumn('companies', "founder_name TEXT DEFAULT ''");
  await safeAddColumn('companies', "founded_at TEXT DEFAULT ''");
  await safeAddColumn('ipo_offerings', "start_date TEXT DEFAULT ''");
  await safeAddColumn('ipo_offerings', "bookbuilding_date TEXT DEFAULT ''");
  await safeAddColumn('ipo_offerings', "offering_date TEXT DEFAULT ''");
  await safeAddColumn('ipo_offerings', "allotment_date TEXT DEFAULT ''");
  await safeAddColumn('ipo_offerings', "public_pct REAL DEFAULT 10.0");
  await safeAddColumn('ipo_offerings', "strategic_pct REAL DEFAULT 40.0");
  await safeAddColumn('ipo_offerings', "founder_pct REAL DEFAULT 50.0");

  // Companies: Sita Eksekusi Negara & BUMN Status
  await safeAddColumn('companies', 'is_seized INTEGER DEFAULT 0');
  await safeAddColumn('companies', 'seized_by TEXT');
  await safeAddColumn('companies', 'seized_at TEXT');
  await safeAddColumn('companies', 'seize_reason TEXT');
  await safeAddColumn('companies', 'is_bumn INTEGER DEFAULT 0');
  await safeAddColumn('companies', 'seizure_deadline TEXT');
  await safeAddColumn('companies', 'is_auction_ready INTEGER DEFAULT 0');

  // Market Orders: Ensure dual column compatibility (type/order_type, target_lots/lots, price_per_share/price)
  await safeAddColumn('market_orders', "order_type TEXT DEFAULT 'BUY'");
  await safeAddColumn('market_orders', 'price REAL DEFAULT 0.0');
  await safeAddColumn('market_orders', 'lots INTEGER DEFAULT 0');
  await safeAddColumn('market_orders', 'updated_at TEXT DEFAULT CURRENT_TIMESTAMP');
  await query.exec(`
    UPDATE market_orders
    SET order_type = COALESCE(order_type, type),
        price = CASE WHEN price IS NULL OR price <= 0 THEN price_per_share ELSE price END,
        lots = CASE WHEN lots IS NULL OR lots <= 0 THEN target_lots ELSE lots END;
  `);

  // Court Cases: Live Room & Presence Tracking
  await safeAddColumn('court_cases', 'plaintiff_user_id TEXT');
  await safeAddColumn('court_cases', 'hearing_time TEXT DEFAULT "10:00 WIB"');
  await safeAddColumn('court_cases', 'plaintiff_present INTEGER DEFAULT 0');
  await safeAddColumn('court_cases', 'defendant_present INTEGER DEFAULT 0');
  await safeAddColumn('court_cases', 'verdict_awarded_amount REAL DEFAULT 0.0');
  await safeAddColumn('court_cases', 'room_status TEXT DEFAULT "WAITING_PRESENCE"');
  await safeAddColumn('court_cases', 'verdict_type TEXT'); // 'VERSTEK_PLAINTIFF_WIN', 'GUGUR_DISMISSED', 'SETTLED_MEDIATION', 'VERDICT_PAILIT'
  await safeAddColumn('court_cases', 'closed_at TEXT');
  await safeAddColumn('court_cases', 'target_asset_description TEXT');
  await safeAddColumn('court_cases', 'court_room_name TEXT DEFAULT "Ruang Sidang Utama Kartika PNAF"');
  await safeAddColumn('court_cases', 'summons_sent INTEGER DEFAULT 0');

  // New Corporate Legal & P2P Escrow Tables
  await query.exec(`
    CREATE TABLE IF NOT EXISTS private_deals (
      id TEXT PRIMARY KEY,
      deal_number TEXT UNIQUE NOT NULL,
      seller_user_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      buyer_user_id TEXT,
      buyer_name TEXT,
      company_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      company_symbol TEXT NOT NULL,
      total_shares_offered INTEGER NOT NULL,
      percentage_offered REAL NOT NULL,
      percentage_remaining REAL NOT NULL,
      price_per_share REAL NOT NULL,
      gross_amount REAL NOT NULL,
      deal_type TEXT DEFAULT 'P2P', -- 'P2P' atau 'GLOBAL'
      allow_partial INTEGER DEFAULT 1,
      status TEXT DEFAULT 'PENDING_BUYER_SIGNATURE', -- 'PENDING_BUYER_SIGNATURE', 'ACTIVE_GLOBAL', 'COMPLETED', 'CANCELLED', 'DISPUTED'
      seller_signed_at TEXT,
      buyer_signed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deal_deeds (
      id TEXT PRIMARY KEY,
      deed_number TEXT UNIQUE NOT NULL,
      deal_id TEXT,
      seller_user_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      buyer_user_id TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      company_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      company_symbol TEXT NOT NULL,
      percentage_transferred REAL NOT NULL,
      shares_transferred INTEGER NOT NULL,
      price_per_share REAL NOT NULL,
      total_price_ib REAL NOT NULL,
      meterai_status TEXT DEFAULT 'LUNAS_IB_10000',
      status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'DISPUTED_PNAF', 'BREACHED_WANPRESTASI', 'ANNULLED'
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS court_chat_messages (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL, -- 'PANITERA', 'HAKIM', 'PENGGUGAT', 'TERGUGAT'
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (case_id) REFERENCES court_cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS state_treasury_ledger (
      id TEXT PRIMARY KEY,
      source_type TEXT NOT NULL, -- 'PNAF_FILING_FEE', 'METERAI_FEE', 'TRANSACTION_TAX', 'SEIZURE_FINE', 'AUCTION_PROCEEDS', 'BAILOUT_DISBURSEMENT'
      title TEXT NOT NULL,
      amount_ib REAL NOT NULL,
      direction TEXT NOT NULL, -- 'INCOME' atau 'EXPENSE'
      reference_id TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_deals_seller ON private_deals(seller_user_id);
    CREATE INDEX IF NOT EXISTS idx_deals_buyer ON private_deals(buyer_user_id);
    CREATE INDEX IF NOT EXISTS idx_deals_status ON private_deals(status);
    CREATE INDEX IF NOT EXISTS idx_deeds_parties ON deal_deeds(seller_user_id, buyer_user_id);
    CREATE INDEX IF NOT EXISTS idx_treasury_src ON state_treasury_ledger(source_type);

    -- 4 PILAR KEBIJAKAN EKONOMI STRATEGIS NEGARA
    -- 1. Tabel Master Obligasi Negara (Sovereign Bonds)
    CREATE TABLE IF NOT EXISTS sovereign_bonds (
      id TEXT PRIMARY KEY,
      bond_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      total_quota_ib REAL NOT NULL,
      ordered_quota_ib REAL DEFAULT 0.0,
      coupon_rate_pct REAL NOT NULL,
      unit_price_ib REAL DEFAULT 1000000.0,
      min_order_units INTEGER DEFAULT 5,
      max_order_units INTEGER DEFAULT 500,
      tenor_days INTEGER NOT NULL,
      status TEXT DEFAULT 'OPEN',
      issued_at TEXT DEFAULT CURRENT_TIMESTAMP,
      maturity_date TEXT NOT NULL
    );

    -- 2. Portofolio Kepemilikan Obligasi Pemain
    CREATE TABLE IF NOT EXISTS user_bond_holdings (
      id TEXT PRIMARY KEY,
      bond_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      units_owned INTEGER NOT NULL,
      total_investment_ib REAL NOT NULL,
      coupon_rate_pct REAL NOT NULL,
      total_coupon_earned_ib REAL DEFAULT 0.0,
      status TEXT DEFAULT 'ACTIVE',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_coupon_paid_at TEXT,
      FOREIGN KEY (bond_id) REFERENCES sovereign_bonds(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 3. Kebijakan Subsidi & Tax Holiday Sektoral Dinamis
    CREATE TABLE IF NOT EXISTS sector_subsidies (
      id TEXT PRIMARY KEY,
      sector TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 0,
      tax_discount_pct REAL DEFAULT 50.0,
      effective_tax_rate_pct REAL DEFAULT 5.0,
      operational_grant_ib REAL DEFAULT 0.0,
      headline_news TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Tender Pengadaan Proyek Pemerintah (Mega-Projects)
    CREATE TABLE IF NOT EXISTS government_tenders (
      id TEXT PRIMARY KEY,
      tender_code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      sector TEXT NOT NULL,
      description TEXT NOT NULL,
      contract_value_ib REAL NOT NULL,
      min_pt_level INTEGER DEFAULT 2,
      min_rd_level INTEGER DEFAULT 2,
      min_capacity_staff INTEGER DEFAULT 10,
      min_cap_requirement_ib REAL DEFAULT 25000000.0,
      status TEXT DEFAULT 'OPEN',
      winner_company_id TEXT,
      winner_user_id TEXT,
      winner_company_name TEXT,
      deadline_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (winner_company_id) REFERENCES companies(id) ON DELETE SET NULL
    );

    -- 5. Proposal Lamaran Tender dari PT Pemain
    CREATE TABLE IF NOT EXISTS tender_bids (
      id TEXT PRIMARY KEY,
      tender_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      company_name TEXT NOT NULL,
      pt_level INTEGER NOT NULL,
      rd_level INTEGER NOT NULL,
      capacity_staff INTEGER NOT NULL,
      bid_pitch TEXT,
      bid_score REAL DEFAULT 75.0,
      status TEXT DEFAULT 'SUBMITTED',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tender_id) REFERENCES government_tenders(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );

    -- 6. Program Restrukturisasi & Pemutihan Utang Debitur Macet
    CREATE TABLE IF NOT EXISTS debt_relief_records (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      relief_type TEXT NOT NULL,
      penalty_waived_ib REAL DEFAULT 0.0,
      principal_haircut_ib REAL DEFAULT 0.0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_bonds_status ON sovereign_bonds(status);
    CREATE INDEX IF NOT EXISTS idx_bond_holdings_user ON user_bond_holdings(user_id);
    CREATE INDEX IF NOT EXISTS idx_subsidies_active ON sector_subsidies(is_active);
    CREATE INDEX IF NOT EXISTS idx_tenders_status ON government_tenders(status);
    CREATE INDEX IF NOT EXISTS idx_tender_bids_comp ON tender_bids(company_id);
  `);


  // Ensure all existing company names have official 'PT. ' with dot
  await query.exec(`
    UPDATE companies
    SET name = 'PT. ' || TRIM(SUBSTR(name, 4))
    WHERE name LIKE 'PT %' AND name NOT LIKE 'PT. %';

    UPDATE users
    SET pt_name = 'PT. ' || TRIM(SUBSTR(pt_name, 4))
    WHERE pt_name LIKE 'PT %' AND pt_name NOT LIKE 'PT. %';
  `);

  // Initialize prev_close with base_price or current_price if unset
  await query.exec(`
    UPDATE companies 
    SET prev_close = CASE WHEN prev_close IS NULL OR prev_close <= 0 THEN current_price ELSE prev_close END,
        daily_high = CASE WHEN daily_high IS NULL OR daily_high <= 0 THEN current_price * 1.02 ELSE daily_high END,
        daily_low = CASE WHEN daily_low IS NULL OR daily_low <= 0 THEN current_price * 0.98 ELSE daily_low END;
  `);

  // Seed Initial Sample E-IPO Offerings if empty
  const existingIpo = await query.get('SELECT COUNT(*) as count FROM ipo_offerings');
  if (!existingIpo || existingIpo.count === 0) {
    const defaultIpos = [
      {
        id: 'ipo-agro-01',
        company_name: 'PT Nusantara Agro Mandiri Tbk.',
        symbol: 'AGRO',
        sector: 'F&B',
        description: 'Perkebunan kelapa sawit & hilirisasi pangan nabati terpadu terbesar di Capital Federation.',
        offering_price: 350.0,
        total_offering_shares: 20000000,
        total_offering_lots: 200000,
        ordered_lots: 290000,
        status: 'OFFERING',
        listing_date: 'Besok (27 Okt 2026)',
        listing_time: '07:00 WIB',
        is_oversubscribed: 1,
        oversubscribed_ratio: 1.45,
        first_day_ara_pct: 50.0 // 201 - 5000: regular 25% * 2 = 50% ARA
      },
      {
        id: 'ipo-sstl-02',
        company_name: 'PT Satelit Surya Nusantara Tbk.',
        symbol: 'SSTL',
        sector: 'Teknologi',
        description: 'Operator konstelasi satelit orbit rendah (LEO) penyedia broadband kecepatan tinggi antar-pulau.',
        offering_price: 1850.0,
        total_offering_shares: 10000000,
        total_offering_lots: 100000,
        ordered_lots: 125000,
        status: 'BOOKBUILDING',
        listing_date: '28 Okt 2026',
        listing_time: '07:00 WIB',
        is_oversubscribed: 1,
        oversubscribed_ratio: 1.25,
        first_day_ara_pct: 50.0
      },
      {
        id: 'ipo-ghid-03',
        company_name: 'PT Green Hidrogen Energi Tbk.',
        symbol: 'GHID',
        sector: 'Energi',
        description: 'Pionir pembangkit hidrogen hijau dan energi bersih masa depan ramah emisi.',
        offering_price: 180.0,
        total_offering_shares: 50000000,
        total_offering_lots: 500000,
        ordered_lots: 850000,
        status: 'OFFERING',
        listing_date: '29 Okt 2026',
        listing_time: '07:00 WIB',
        is_oversubscribed: 1,
        oversubscribed_ratio: 1.70,
        first_day_ara_pct: 70.0 // <= 200: regular 35% * 2 = 70% ARA!
      }
    ];

    for (const item of defaultIpos) {
      await query.run(
        `INSERT INTO ipo_offerings (id, company_name, symbol, sector, description, offering_price, total_offering_shares, total_offering_lots, ordered_lots, status, listing_date, listing_time, is_oversubscribed, oversubscribed_ratio, first_day_ara_pct)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.company_name,
          item.symbol,
          item.sector,
          item.description,
          item.offering_price,
          item.total_offering_shares,
          item.total_offering_lots,
          item.ordered_lots,
          item.status,
          item.listing_date,
          item.listing_time,
          item.is_oversubscribed,
          item.oversubscribed_ratio,
          item.first_day_ara_pct
        ]
      );
    }
    console.log('✅ Default E-IPO Offerings successfully seeded with realistic ARA limits.');
  }

  // Seed initial sample court cases if empty
  const courtCount = await query.get('SELECT COUNT(*) as count FROM court_cases');
  if (courtCount && courtCount.count === 0) {
    const defaultCases = [
      {
        id: 'case-001',
        case_number: '018/Pdt.Sus-Pailit/2026/PNAF',
        case_type: 'BANKRUPTCY',
        title: 'Permohonan Pailit atas Wanprestasi Kredit Sindikasi BCF',
        plaintiff_name: 'Bank Sentral Federasi (BCF)',
        defendant_name: 'PT. Nusantara Properti Megah',
        claim_amount_ib: 4500000000.0,
        court_hearing_date: '30 Okt 2026, 09:30 WIB',
        status: 'IN_TRIAL',
        verdict_notes: 'Majelis Hakim sedang memeriksa pembukuan kas dan daftar aset jaminan debitur.'
      },
      {
        id: 'case-002',
        case_number: '042/Pdt.Sus-Sengketa/2026/PNAF',
        case_type: 'DISPUTE',
        title: 'Gugatan Pembatalan Akta Jual Beli Saham Tanpa Izin RUPS',
        plaintiff_name: 'Konsorsium Pemegang Saham Minoritas',
        defendant_name: 'PT. Titan Tambang Mandiri',
        claim_amount_ib: 1200000000.0,
        court_hearing_date: '27 Okt 2026, 14:00 WIB',
        status: 'VERDICT_PKPU',
        verdict_notes: 'Putusan Mediasi: Perjanjian direstrukturisasi dengan kompensasi dividen khusus.'
      },
      {
        id: 'case-003',
        case_number: '009/Pdt.Sus-Bursa/2026/PNAF',
        case_type: 'REGULATORY',
        title: 'Tuntutan Ganti Rugi Manipulasi Harga & Indikasi Goreng Saham',
        plaintiff_name: 'OPFF (Otoritas Pengawas Finansial Federasi)',
        defendant_name: 'Sindikat Spekulan Energi',
        claim_amount_ib: 850000000.0,
        court_hearing_date: '25 Okt 2026',
        status: 'VERDICT_PAILIT',
        verdict_notes: 'Vonis Hakim: Terbukti bersalah. Denda disita untuk kas negara Federasi dan aset dilelang.'
      }
    ];

    for (const c of defaultCases) {
      await query.run(
        `INSERT INTO court_cases (id, case_number, case_type, title, plaintiff_name, defendant_name, claim_amount_ib, court_hearing_date, status, verdict_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.case_number, c.case_type, c.title, c.plaintiff_name, c.defendant_name, c.claim_amount_ib, c.court_hearing_date, c.status, c.verdict_notes]
      );
    }
    console.log('⚖️ Sample Court Cases seeded in Pengadilan Niaga Arbitrase Federasi (PNAF).');
  }

  // Seed default macro indicator in central_bank_settings
  await query.run("INSERT OR IGNORE INTO central_bank_settings (key, value) VALUES ('economic_state', 'NORMAL')");
  await query.run("INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES ('country_name', 'Republik Federasi Indigo')");
  await query.run("INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES ('market_index_name', 'IPMC (Indigo Prime Monetary & Capital Exchange)')");

  // Seed State Treasury Ledger if empty
  const treasuryCount = await query.get('SELECT COUNT(*) as count FROM state_treasury_ledger');
  if (!treasuryCount || treasuryCount.count === 0) {
    const defaultLedger = [
      {
        id: 'trs-001',
        source_type: 'SEIZURE_FINE',
        title: 'Sita Eksekusi Denda Wanprestasi & Spekulan PNAF',
        amount_ib: 850000000.0,
        direction: 'INCOME',
        reference_id: 'case-003',
        notes: 'Denda pelanggaran manipulasi pasar bursa disita untuk kas negara federasi'
      },
      {
        id: 'trs-002',
        source_type: 'PNAF_FILING_FEE',
        title: 'Penerimaan Biaya Registrasi Perkara Kepaniteraan PNAF',
        amount_ib: 750000.0,
        direction: 'INCOME',
        reference_id: 'case-001',
        notes: 'Penerimaan PNBP Kepaniteraan Niaga Federasi 3 Perkara'
      },
      {
        id: 'trs-003',
        source_type: 'METERAI_FEE',
        title: 'Penerimaan Bea Meterai Digital Akta Saham (Lunas)',
        amount_ib: 120000.0,
        direction: 'INCOME',
        reference_id: 'akta-seed',
        notes: 'Meterai digital resmi pengesahan perjanjian korporasi'
      },
      {
        id: 'trs-004',
        source_type: 'TRANSACTION_TAX',
        title: 'Pajak Transaksi Jual-Beli Saham & Pelepasan Blok Saham (0.1%)',
        amount_ib: 142500000.0,
        direction: 'INCOME',
        reference_id: 'tax-batch-01',
        notes: 'Pajak penghasilan final atas transaksi bursa IPMC'
      }
    ];

    for (const t of defaultLedger) {
      await query.run(
        'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [t.id, t.source_type, t.title, t.amount_ib, t.direction, t.reference_id, t.notes]
      );
    }
    console.log('🏛️ Initial State Treasury (Kas Negara Federasi) ledger seeded.');
  }

  // Seed Sample Global Deals in Private Placement Directory if empty
  const dealsCount = await query.get('SELECT COUNT(*) as count FROM private_deals');
  if (!dealsCount || dealsCount.count === 0) {
    const sampleSeller = await query.get('SELECT id, username, pt_name FROM users LIMIT 1');
    const sampleComp = await query.get('SELECT id, name, symbol FROM companies LIMIT 1');

    if (sampleSeller && sampleComp) {
      await query.run(
        `INSERT INTO private_deals (
          id, deal_number, seller_user_id, seller_name, buyer_user_id, buyer_name,
          company_id, company_name, company_symbol, total_shares_offered, percentage_offered,
          percentage_remaining, price_per_share, gross_amount, deal_type, allow_partial, status
        ) VALUES (?, ?, ?, ?, NULL, 'Pasar Terbuka Federasi', ?, ?, ?, 1000000, 10.0, 10.0, 2500.0, 2500000000.0, 'GLOBAL', 1, 'ACTIVE_GLOBAL')`,
        [
          'deal-global-01', 'DEAL/IPMC/2026/0881', sampleSeller.id,
          `${sampleSeller.username} (${sampleSeller.pt_name || 'Konsorsium'})`,
          sampleComp.id, sampleComp.name, sampleComp.symbol
        ]
      );
      console.log('🌐 Sample Global Private Placement deals seeded.');
    }
  }

  // Seed Sovereign Bonds (Pilar 1) if empty
  const bondsCount = await query.get('SELECT COUNT(*) as count FROM sovereign_bonds');
  if (!bondsCount || bondsCount.count === 0) {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    await query.run(
      `INSERT INTO sovereign_bonds (id, bond_code, title, total_quota_ib, ordered_quota_ib, coupon_rate_pct, unit_price_ib, min_order_units, max_order_units, tenor_days, status, maturity_date)
       VALUES (?, ?, ?, ?, 0.0, ?, 1000000.0, 5, 500, ?, 'OPEN', ?)`,
      ['bond-001', 'ORI-026', 'Obligasi Republik Indigo Seri 026 (ORI-026)', 50000000000.0, 7.25, 7, in7Days]
    );
    await query.run(
      `INSERT INTO sovereign_bonds (id, bond_code, title, total_quota_ib, ordered_quota_ib, coupon_rate_pct, unit_price_ib, min_order_units, max_order_units, tenor_days, status, maturity_date)
       VALUES (?, ?, ?, ?, 0.0, ?, 1000000.0, 5, 500, ?, 'OPEN', ?)`,
      ['bond-002', 'SBR-015', 'Savings Bond Retail Seri 015 (SBR-015)', 25000000000.0, 6.80, 3, in3Days]
    );
    console.log('📜 Initial Sovereign Bonds (ORI-026 & SBR-015) seeded.');
  }

  // Seed Sector Subsidies (Pilar 2) if empty
  const subCount = await query.get('SELECT COUNT(*) as count FROM sector_subsidies');
  if (!subCount || subCount.count === 0) {
    const sectors = ['Teknologi', 'Energi', 'Properti', 'Keuangan', 'F&B', 'Manufaktur'];
    for (const s of sectors) {
      await query.run(
        `INSERT OR IGNORE INTO sector_subsidies (id, sector, is_active, tax_discount_pct, effective_tax_rate_pct, operational_grant_ib, headline_news)
         VALUES (?, ?, 0, 50.0, 5.0, 0.0, ?)`,
        [`sub-${s.toLowerCase().replace(/[^a-z]/g, '')}`, s, `Program Akselerasi Industri ${s} Federasi`]
      );
    }
    console.log('🌱 Initial Sector Subsidies catalog initialized.');
  }

  // Seed Government Tenders (Pilar 3) if empty
  const tendersCount = await query.get('SELECT COUNT(*) as count FROM government_tenders');
  if (!tendersCount || tendersCount.count === 0) {
    const in2Days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    await query.run(
      `INSERT INTO government_tenders (id, tender_code, title, sector, description, contract_value_ib, min_pt_level, min_rd_level, min_capacity_staff, status, deadline_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
      [
        'tender-001', 'TDR/INFRA/2026/01',
        'Pembangunan Backbone Jaringan Fiber Optic & Satelit Federasi',
        'Teknologi',
        'Pengadaan infrastruktur jaringan pita lebar nasional untuk menghubungkan seluruh sentra komersial dan bursa modal.',
        150000000.0, 2, 2, 10, in2Days
      ]
    );
    await query.run(
      `INSERT INTO government_tenders (id, tender_code, title, sector, description, contract_value_ib, min_pt_level, min_rd_level, min_capacity_staff, status, deadline_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
      [
        'tender-002', 'TDR/ENERGI/2026/02',
        'Konstruksi Pembangkit Listrik Tenaga Surya & Gardu Induk EBT',
        'Energi',
        'Mega proyek transisi energi hijau nasional untuk memasok listrik kawasan industri terpadu dan smelter.',
        250000000.0, 3, 2, 15, in2Days
      ]
    );
    console.log('🏗️ Initial Mega-Project Government Tenders seeded.');
  }

  // Ensure Default Admin Account always exists for IPMC / Bank Sentral Admin Console
  const bcrypt = require('bcryptjs');
  const existingAdmin = await query.get("SELECT id, role, password_hash FROM users WHERE username = 'admin'");
  if (!existingAdmin) {
    const adminPass = await bcrypt.hash('admin123', 10);
    await query.run(
      `INSERT INTO users (id, username, password_hash, balance_ib, company_balance_ib, has_pt, pt_name, sector, pt_level, credit_score, role, is_blue_chip)
       VALUES (?, 'admin', ?, 50000000000.0, 0.0, 0, 'Bank Sentral Capital Federation', 'Keuangan', 99, 999, 'ADMIN', 1)`,
      ['admin-001', adminPass]
    );
    console.log('🔐 Default Admin account (admin / admin123) initialized.');
  } else if (existingAdmin.role !== 'ADMIN') {
    await query.run("UPDATE users SET role = 'ADMIN' WHERE username = 'admin'");
  }

  console.log('Database tables verified / created with dual accounts (Personal & Company).');
}

module.exports = {
  db,
  query,
  initDb,
  recordCashFlow
};
