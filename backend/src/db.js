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
            scheduleMariaDbSync(sql);
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
  },
  transaction: async (workFn) => {
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        db.run('BEGIN IMMEDIATE TRANSACTION', async (beginErr) => {
          if (beginErr) return reject(beginErr);
          const txRun = (sql, params = []) =>
            new Promise((resRun, rejRun) => {
              db.run(sql, params, function (err) {
                if (err) rejRun(err);
                else resRun({ lastID: this.lastID, changes: this.changes });
              });
            });
          try {
            const result = await workFn({ run: txRun });
            db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                db.run('ROLLBACK', () => reject(commitErr));
              } else {
                scheduleMariaDbSync('UPDATE');
                resolve(result);
              }
            });
          } catch (workErr) {
            db.run('ROLLBACK', () => reject(workErr));
          }
        });
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
  await safeAddColumn('users', 'fcm_token TEXT');
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
  await safeAddColumn('users', "email TEXT");
  await safeAddColumn('users', "email_verified INTEGER DEFAULT 0");
  await safeAddColumn('users', "google_id TEXT");
  await safeAddColumn('users', "avatar_url TEXT");
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
  await safeAddColumn('court_cases', 'bot_stage INTEGER DEFAULT 0');
  await safeAddColumn('court_cases', 'bot_next_action_at TEXT');
  await safeAddColumn('court_cases', 'decided_by TEXT');
  await safeAddColumn('court_cases', 'deed_id TEXT');
  await safeAddColumn('court_cases', 'deed_number TEXT');
  await safeAddColumn('court_chat_messages', 'sender_user_id TEXT');

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

    CREATE TABLE IF NOT EXISTS acquisition_proposals (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      company_symbol TEXT NOT NULL,
      company_name TEXT NOT NULL,
      sector TEXT,
      buyer_user_id TEXT NOT NULL,
      buyer_username TEXT NOT NULL,
      founder_user_id TEXT,
      founder_username TEXT NOT NULL,
      founder_share_pct REAL DEFAULT 60.0,
      is_bot_founder INTEGER DEFAULT 1,
      percentage_requested INTEGER NOT NULL,
      lots_transferred INTEGER NOT NULL,
      price_per_share_ib REAL NOT NULL,
      raw_acquisition_ib REAL NOT NULL,
      total_deduction_ib REAL NOT NULL,
      offer_tier TEXT DEFAULT 'RESCUE_30',
      payment_source TEXT DEFAULT 'PERSONAL',
      pitch_notes TEXT,
      status TEXT DEFAULT 'PENDING_FOUNDER',
      founder_response_note TEXT,
      deed_id TEXT,
      deed_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      responded_at TEXT
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

  // Connect to MariaDB MSS Panel (mss-db:3306 / db_capitalfederation) if available & restore existing data if container is fresh
  await connectAndInitMariaDb();
  await restoreFromMariaDbIfNeeded();

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

  // High-speed SQLite indexes for sub-50ms API latency on 1,000+ users & 500+ companies
  await query.exec(`
    CREATE INDEX IF NOT EXISTS idx_portfolios_user_comp ON portfolios(user_id, company_id);
    CREATE INDEX IF NOT EXISTS idx_portfolios_comp ON portfolios(company_id);
    CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);
    CREATE INDEX IF NOT EXISTS idx_companies_symbol ON companies(symbol);
    CREATE INDEX IF NOT EXISTS idx_companies_listing ON companies(listing_status, is_ipo, is_bot);
    CREATE INDEX IF NOT EXISTS idx_shareholders_company ON company_shareholders(company_id);
    CREATE INDEX IF NOT EXISTS idx_shareholders_user ON company_shareholders(user_id, holder_type);
    CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_price_history_comp_ts ON price_history(company_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_cash_flow_user ON cash_flow_ledger(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_market_orders_status ON market_orders(status, created_at ASC);
  `);

  // Otomatisasi Perbaikan Inkonsistensi Status Kepemilikan & Pemulihan PT Pemain Asli
  await healRealPlayerCompanies();

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

  await syncAllToMariaDb();

  console.log('Database tables verified / created with dual accounts (Personal & Company).');
}

// ============================================================================
// REAL-PLAYER COMPANY RECOVERY & OWNERSHIP INTEGRITY ENGINE
// Ensures no real player's founder/majority PT is ever hijacked by a bot or
// desynced between `users` and `companies`.
// ============================================================================
async function healRealPlayerCompanies() {
  try {
    // 1. Recover any company where a REAL user (non-bot) is recorded in company_shareholders
    //    as FOUNDER or majority owner (>= 50%), e.g. PT. Syafiq Capital Tbk. (SYCA) -> msyafiq19
    const realFounderRows = await query.all(`
      SELECT cs.company_id, cs.user_id, cs.holder_type, cs.percentage,
             u.username, u.has_pt, u.pt_name, u.pt_symbol, u.sector as user_sector,
             u.company_balance_ib as user_comp_bal, u.rd_level as user_rd,
             u.marketing_level as user_mkt, u.hr_level as user_hr,
             u.capacity_level as user_cap, u.pt_level as user_pt_lvl,
             u.employees_count as user_emp, u.ceo_level as user_ceo,
             u.cfo_level as user_cfo, u.cmo_level as user_cmo,
             u.fundamental_score as user_fund,
             c.name as comp_name, c.symbol as comp_symbol, c.sector as comp_sector,
             c.owner_id as comp_owner_id, c.is_bot as comp_is_bot, c.is_ipo as comp_is_ipo,
             c.company_balance_ib as comp_bal, c.rd_level as comp_rd,
             c.marketing_level as comp_mkt, c.hr_level as comp_hr,
             c.capacity_level as comp_cap, c.pt_level as comp_pt_lvl,
             c.employees_count as comp_emp, c.ceo_level as comp_ceo,
             c.cfo_level as comp_cfo, c.cmo_level as comp_cmo,
             c.fundamental_score as comp_fund, c.founder_shares_sold as comp_founder_sold
      FROM company_shareholders cs
      JOIN users u ON cs.user_id = u.id
      JOIN companies c ON cs.company_id = c.id
      WHERE cs.user_id IS NOT NULL
        AND cs.user_id NOT LIKE 'bot-user-%'
        AND cs.user_id NOT LIKE 'user-bot-%'
        AND u.role != 'ADMIN'
        AND (
          (cs.holder_type = 'FOUNDER' AND COALESCE(cs.percentage, 0) > 0)
          OR COALESCE(cs.percentage, 0) >= 50.0
        )
      ORDER BY CASE WHEN cs.holder_type = 'FOUNDER' THEN 0 ELSE 1 END ASC, cs.percentage DESC
    `);

    const restoredPrimaryUsers = new Set();

    for (const row of (realFounderRows || [])) {
      const prevOwner = String(row.comp_owner_id || '');
      const wasHijackedByBotOrNull = !prevOwner || prevOwner.startsWith('bot-user-') || prevOwner.startsWith('user-bot-');

      // Only reclaim if currently owned by this user, NULL, or mistakenly assigned to a bot
      if (prevOwner !== row.user_id && !wasHijackedByBotOrNull) {
        continue;
      }

      if (prevOwner && prevOwner !== row.user_id && (prevOwner.startsWith('bot-user-') || prevOwner.startsWith('user-bot-'))) {
        await query.run(
          "UPDATE users SET pt_name = '', pt_symbol = '' WHERE id = ? AND pt_name = ?",
          [prevOwner, row.comp_name]
        );
      }

      // Check if user already has a DIFFERENT active primary PT owned by them
      const existingOtherPrimary = await query.get(
        'SELECT id, symbol, name FROM companies WHERE owner_id = ? AND id != ? AND (symbol = ? OR name = ?)',
        [row.user_id, row.company_id, row.pt_symbol || '---', row.pt_name || '---']
      );

      const shouldBePrimary =
        !restoredPrimaryUsers.has(row.user_id) &&
        (!existingOtherPrimary || row.pt_symbol === row.comp_symbol || row.pt_name === row.comp_name || !row.has_pt);

      if (shouldBePrimary) {
        restoredPrimaryUsers.add(row.user_id);
        const bestBal = (Number(row.comp_bal || 0) < 0 && Number(row.user_comp_bal || 0) === 0)
          ? Number(row.comp_bal)
          : Math.max(Number(row.comp_bal || 0), Number(row.user_comp_bal || 0));
        const bestRd = Math.max(Number(row.comp_rd || 1), Number(row.user_rd || 1));
        const bestMkt = Math.max(Number(row.comp_mkt || 1), Number(row.user_mkt || 1));
        const bestHr = Math.max(Number(row.comp_hr || 1), Number(row.user_hr || 1));
        const bestCap = Math.max(Number(row.comp_cap || 1), Number(row.user_cap || 1));
        const bestPtLvl = Math.max(
          Number(row.comp_pt_lvl || 1),
          Number(row.user_pt_lvl || 1),
          Math.floor((bestRd + bestMkt + bestHr + bestCap + 1) / 4) + 1
        );
        const bestEmp = Math.max(Number(row.comp_emp || 0), Number(row.user_emp || 0));
        const bestCeo = Math.max(Number(row.comp_ceo || 0), Number(row.user_ceo || 0));
        const bestCfo = Math.max(Number(row.comp_cfo || 0), Number(row.user_cfo || 0));
        const bestCmo = Math.max(Number(row.comp_cmo || 0), Number(row.user_cmo || 0));
        const bestFund = Math.min(100, Math.max(Number(row.comp_fund || 70), Number(row.user_fund || 70)));

        await query.run(
          `UPDATE companies
           SET owner_id = ?, founder_name = ?, is_bot = 0,
               company_balance_ib = ?, rd_level = ?, marketing_level = ?, hr_level = ?, capacity_level = ?,
               pt_level = ?, operational_level = ?, employees_count = ?,
               ceo_level = ?, cfo_level = ?, cmo_level = ?, fundamental_score = ?
           WHERE id = ?`,
          [
            row.user_id, row.username,
            bestBal, bestRd, bestMkt, bestHr, bestCap,
            bestPtLvl, bestPtLvl, bestEmp,
            bestCeo, bestCfo, bestCmo, bestFund,
            row.company_id
          ]
        );

        await query.run(
          `UPDATE users
           SET has_pt = 1, pt_name = ?, pt_symbol = ?, sector = ?, is_ipo = ?,
               company_balance_ib = ?, rd_level = ?, marketing_level = ?, hr_level = ?, capacity_level = ?,
               pt_level = ?, employees_count = ?, ceo_level = ?, cfo_level = ?, cmo_level = ?,
               fundamental_score = ?, founder_shares_sold = COALESCE(?, founder_shares_sold, 0)
           WHERE id = ?`,
          [
            row.comp_name, row.comp_symbol, row.comp_sector || row.user_sector || 'Teknologi', row.comp_is_ipo || 0,
            bestBal, bestRd, bestMkt, bestHr, bestCap,
            bestPtLvl, bestEmp, bestCeo, bestCfo, bestCmo,
            bestFund, row.comp_founder_sold || 0,
            row.user_id
          ]
        );

        if (prevOwner !== row.user_id || !row.has_pt) {
          console.log(`🛡️ [Auto-Healing] Memulihkan kepemilikan PT Utama ${row.comp_name} (${row.comp_symbol}) ke @${row.username} (Kas: IB ${Math.round(bestBal).toLocaleString('id-ID')}, R&D Lvl ${bestRd})!`);
        }
      } else {
        // Subsidiary or acquired company where real user holds >= 50%
        await query.run(
          `UPDATE companies
           SET owner_id = ?,
               is_bot = CASE WHEN ? = 'FOUNDER' THEN 0 ELSE is_bot END,
               founder_name = CASE WHEN ? = 'FOUNDER' THEN ? ELSE founder_name END
           WHERE id = ?`,
          [row.user_id, row.holder_type, row.holder_type, row.username, row.company_id]
        );
      }
    }

    // 2. Sync all real users who already have has_pt = 1 with their primary company row
    const realUsersWithPt = await query.all(`
      SELECT * FROM users
      WHERE has_pt = 1
        AND role != 'ADMIN'
        AND id NOT LIKE 'bot-user-%'
        AND id NOT LIKE 'user-bot-%'
    `);

    for (const u of (realUsersWithPt || [])) {
      const primaryOwned = await query.get(
        'SELECT * FROM companies WHERE owner_id = ? AND (symbol = ? OR name = ?)',
        [u.id, u.pt_symbol || '---', u.pt_name || '---']
      ) || await query.get(
        'SELECT * FROM companies WHERE owner_id = ? ORDER BY is_bot ASC, founded_at ASC, id ASC LIMIT 1',
        [u.id]
      );

      if (primaryOwned) {
        const bestBal = (Number(primaryOwned.company_balance_ib || 0) < 0 && Number(u.company_balance_ib || 0) === 0)
          ? Number(primaryOwned.company_balance_ib)
          : Math.max(Number(primaryOwned.company_balance_ib || 0), Number(u.company_balance_ib || 0));
        const bestRd = Math.max(Number(primaryOwned.rd_level || 1), Number(u.rd_level || 1));
        const bestMkt = Math.max(Number(primaryOwned.marketing_level || 1), Number(u.marketing_level || 1));
        const bestHr = Math.max(Number(primaryOwned.hr_level || 1), Number(u.hr_level || 1));
        const bestCap = Math.max(Number(primaryOwned.capacity_level || 1), Number(u.capacity_level || 1));
        const bestPtLvl = Math.max(Number(primaryOwned.pt_level || 1), Number(u.pt_level || 1));
        const bestEmp = Math.max(Number(primaryOwned.employees_count || 0), Number(u.employees_count || 0));
        const bestCeo = Math.max(Number(primaryOwned.ceo_level || 0), Number(u.ceo_level || 0));
        const bestCfo = Math.max(Number(primaryOwned.cfo_level || 0), Number(u.cfo_level || 0));
        const bestCmo = Math.max(Number(primaryOwned.cmo_level || 0), Number(u.cmo_level || 0));
        const bestFund = Math.min(100, Math.max(Number(primaryOwned.fundamental_score || 70), Number(u.fundamental_score || 70)));

        await query.run(
          `UPDATE companies
           SET company_balance_ib = ?, rd_level = ?, marketing_level = ?, hr_level = ?, capacity_level = ?,
               pt_level = ?, operational_level = ?, employees_count = ?,
               ceo_level = ?, cfo_level = ?, cmo_level = ?, fundamental_score = ?
           WHERE id = ?`,
          [bestBal, bestRd, bestMkt, bestHr, bestCap, bestPtLvl, bestPtLvl, bestEmp, bestCeo, bestCfo, bestCmo, bestFund, primaryOwned.id]
        );
        await query.run(
          `UPDATE users
           SET pt_name = ?, pt_symbol = ?, sector = ?, is_ipo = ?,
               company_balance_ib = ?, rd_level = ?, marketing_level = ?, hr_level = ?, capacity_level = ?,
               pt_level = ?, employees_count = ?, ceo_level = ?, cfo_level = ?, cmo_level = ?, fundamental_score = ?
           WHERE id = ?`,
          [
            primaryOwned.name, primaryOwned.symbol, primaryOwned.sector || u.sector, primaryOwned.is_ipo || 0,
            bestBal, bestRd, bestMkt, bestHr, bestCap, bestPtLvl, bestEmp, bestCeo, bestCfo, bestCmo, bestFund, u.id
          ]
        );
      } else {
        // Check if user still holds >= 50% in portfolios on any company before resetting has_pt
        const portMajority = await query.get(`
          SELECT c.* FROM portfolios p
          JOIN companies c ON p.company_id = c.id
          WHERE p.user_id = ? AND ((p.lots_owned * 100.0) / COALESCE(NULLIF(c.total_shares, 0), 10000000)) >= 0.50
          ORDER BY p.lots_owned DESC LIMIT 1
        `, [u.id]);

        if (portMajority) {
          await query.run('UPDATE companies SET owner_id = ? WHERE id = ?', [u.id, portMajority.id]);
          await query.run(
            'UPDATE users SET pt_name = ?, pt_symbol = ?, sector = ?, is_ipo = ?, company_balance_ib = ?, has_pt = 1 WHERE id = ?',
            [portMajority.name, portMajority.symbol, portMajority.sector, portMajority.is_ipo || 0, portMajority.company_balance_ib || 0, u.id]
          );
        } else {
          console.log(`🔄 [Auto-Healing] Seluruh PT @${u.username} telah beralih kepemilikan sah, mereset status PT Utama...`);
          await query.run(
            "UPDATE users SET has_pt = 0, pt_name = '', pt_symbol = '', is_ipo = 0, company_balance_ib = 0 WHERE id = ?",
            [u.id]
          );
        }
      }
    }

    // 3. Sinkronkan seluruh perusahaan hasil akuisisi mayoritas (>= 50% saham di portfolios / company_shareholders)
    // milik pemain asli agar owner_id tercatat seragam di APK, Web Admin, dan Profil Publik!
    const realMajorities = await query.all(`
      SELECT u.id as user_id, u.username, u.pt_symbol as primary_symbol, c.id as company_id, c.symbol, c.name, c.owner_id,
             COALESCE(p.lots_owned, 0) as lots_owned,
             COALESCE(c.total_shares, 10000000) as total_shares,
             COALESCE(sh.sh_pct, 0) as sh_pct
      FROM users u
      JOIN companies c ON (
        EXISTS (
          SELECT 1 FROM portfolios p2
          WHERE p2.user_id = u.id AND p2.company_id = c.id
            AND (((p2.lots_owned * 100.0) / COALESCE(NULLIF(c.total_shares, 0), 10000000)) * 100.0) >= 50.0
        )
        OR EXISTS (
          SELECT 1 FROM company_shareholders cs2
          WHERE cs2.user_id = u.id AND cs2.company_id = c.id
          GROUP BY cs2.company_id
          HAVING SUM(COALESCE(cs2.percentage, 0)) >= 50.0
        )
      )
      LEFT JOIN portfolios p ON p.user_id = u.id AND p.company_id = c.id
      LEFT JOIN (
        SELECT company_id, user_id, SUM(COALESCE(percentage, 0)) as sh_pct
        FROM company_shareholders
        WHERE user_id IS NOT NULL
        GROUP BY company_id, user_id
      ) sh ON sh.company_id = c.id AND sh.user_id = u.id
      WHERE u.role != 'ADMIN'
        AND u.id NOT LIKE 'bot-user-%'
        AND u.id NOT LIKE 'user-bot-%'
    `);

    for (const rm of (realMajorities || [])) {
      const isBotOrEmptyOwner = !rm.owner_id || String(rm.owner_id).startsWith('bot-user-') || String(rm.owner_id).startsWith('user-bot-');
      if (isBotOrEmptyOwner || rm.owner_id === rm.user_id) {
        const isPrimaryComp = rm.primary_symbol && rm.symbol === rm.primary_symbol;
        await query.run(
          `UPDATE companies
           SET owner_id = ?,
               is_acquired = CASE WHEN ? = 1 THEN 0 ELSE 1 END
           WHERE id = ?`,
          [rm.user_id, isPrimaryComp ? 1 : 0, rm.company_id]
        );
      }
    }

    // 4. Migrasi otomatis seluruh teks legacy '9 Naga' di proposal akuisisi menjadi '12 Naga'
    await query.run(`
      UPDATE acquisition_proposals 
      SET pitch_notes = REPLACE(pitch_notes, '9 Naga', '12 Naga') 
      WHERE pitch_notes LIKE '%9 Naga%'
    `);

    // 5. Normalisasi role VIP: Cabut role VIP dari bot & akun lain agar VIP strictly dikontrol Admin
    await query.run(`
      UPDATE users 
      SET role = 'PLAYER' 
      WHERE role = 'VIP' AND username != 'msyafiq19'
    `);

    // 6. Tetapkan VIP resmi untuk akun utama Bapak (msyafiq19)
    await query.run(`UPDATE users SET role = 'VIP' WHERE username = 'msyafiq19'`);
  } catch (healErr) {
    console.error('Auto-healing error (non-fatal):', healErr.message);
  }
}

async function optimizeAndPruneDatabase() {
  try {
    // 1. Indeks Komposit Performa Tinggi (Memangkas query 17.7s menjadi <20ms)
    const indexStatements = [
      'CREATE INDEX IF NOT EXISTS idx_users_role_banned ON users(role, is_banned);',
      'CREATE INDEX IF NOT EXISTS idx_companies_owner ON companies(owner_id);',
      'CREATE INDEX IF NOT EXISTS idx_companies_listing_price ON companies(listing_status, current_price DESC);',
      'CREATE INDEX IF NOT EXISTS idx_portfolios_user_lots ON portfolios(user_id, lots_owned);',
      'CREATE INDEX IF NOT EXISTS idx_portfolios_comp_lots ON portfolios(company_id, lots_owned);',
      'CREATE INDEX IF NOT EXISTS idx_shareholders_comp_user ON company_shareholders(company_id, user_id);',
      'CREATE INDEX IF NOT EXISTS idx_loans_user_status ON loans(user_id, status);',
      'CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id, created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_treasury_dir ON state_treasury_ledger(direction, amount_ib);',
      'CREATE INDEX IF NOT EXISTS idx_macro_events_active ON macro_events(active, started_at DESC);',
    ];
    for (const sql of indexStatements) {
      await query.run(sql);
    }

    // 2. Bersihkan penumpukan ratusan ribu log dividen BOT di tabel transactions & cash_flow_ledger
    // PENTING: 100% transaksi & mutasi kas PEMAIN ASLI dilindungi permanen dan TIDAK PERNAH dihapus!
    const botTxCount = await query.get(
      "SELECT COUNT(*) as cnt FROM transactions WHERE (user_id LIKE 'bot-user-%' OR user_id LIKE 'user-bot-%')"
    );
    if (botTxCount && botTxCount.cnt > 600) {
      await query.run(`
        DELETE FROM transactions
        WHERE (user_id LIKE 'bot-user-%' OR user_id LIKE 'user-bot-%')
          AND id NOT IN (
            SELECT id FROM transactions
            WHERE (user_id LIKE 'bot-user-%' OR user_id LIKE 'user-bot-%')
            ORDER BY created_at DESC
            LIMIT 300
          )
      `);
      console.log(`🧹 [DB Optimizer] Membersihkan ${botTxCount.cnt - 300} log transaksi bot lama (100% transaksi pemain asli aman utuh).`);
    }

    const botLedgerCount = await query.get(
      "SELECT COUNT(*) as cnt FROM cash_flow_ledger WHERE (user_id LIKE 'bot-user-%' OR user_id LIKE 'user-bot-%')"
    );
    if (botLedgerCount && botLedgerCount.cnt > 100) {
      await query.run(
        "DELETE FROM cash_flow_ledger WHERE (user_id LIKE 'bot-user-%' OR user_id LIKE 'user-bot-%')"
      );
      console.log(`🧹 [DB Optimizer] Membersihkan ${botLedgerCount.cnt} baris mutasi kas internal bot.`);
    }

    // 3. Auto-expire macro_events yang sudah lewat durasinya agar tidak menumpuk aktif bersamaan
    await query.run(`
      UPDATE macro_events
      SET active = 0
      WHERE active = 1
        AND started_at IS NOT NULL
        AND (strftime('%s', 'now') - strftime('%s', started_at)) > COALESCE(NULLIF(duration_seconds, 0), 1800)
    `);

    await query.run('PRAGMA optimize;');
  } catch (optErr) {
    console.warn('DB optimization warning (non-fatal):', optErr.message);
  }
}

/**
 * Membekukan (is_banned = 1) kuota akun BOT ritel untuk meringankan beban simulasi & server.
 * PROTEKSI MUTLAK: Akun Pemain Asli (id NOT LIKE 'bot-user-%' AND id NOT LIKE 'user-bot-%')
 * TIDAK AKAN PERNAH DISENTUH oleh fungsi ini!
 */
async function enforceBotFreezeQuota(customTarget = null) {
  try {
    let targetFrozen = 525;
    if (customTarget !== null && customTarget !== undefined && !isNaN(parseInt(customTarget, 10))) {
      targetFrozen = Math.max(0, Math.min(1000, parseInt(customTarget, 10)));
      await query.run(
        "INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES ('bot_freeze_target', ?)",
        [String(targetFrozen)]
      );
    } else {
      const saved = await query.get("SELECT value FROM central_bank_settings WHERE key = 'bot_freeze_target'");
      if (saved && !isNaN(parseInt(saved.value, 10))) {
        targetFrozen = Math.max(0, Math.min(1000, parseInt(saved.value, 10)));
      } else {
        await query.run(
          "INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES ('bot_freeze_target', '525')"
        );
      }
    }

    const allBots = await query.all(`
      SELECT id, username, is_banned, balance_ib, company_balance_ib
      FROM users
      WHERE (id LIKE 'bot-user-%' OR id LIKE 'user-bot-%')
        AND role != 'ADMIN'
      ORDER BY id DESC
    `);

    const totalBots = allBots.length;
    const currentlyFrozen = allBots.filter((b) => Number(b.is_banned) === 1);
    const currentlyActive = allBots.filter((b) => Number(b.is_banned) !== 1);

    // Lindungi Top 35 Bot (12 Naga & Taipan) + Bot yang sedang terlibat perkara hukum / P2P dengan pemain asli
    const protectedBotIds = new Set();
    for (let i = 1; i <= 35; i++) {
      protectedBotIds.add(`bot-user-${String(i).padStart(4, '0')}`);
    }
    try {
      const busyDealBots = await query.all(`
        SELECT seller_user_id as uid FROM private_deals WHERE status IN ('OPEN', 'PENDING', 'NEGOTIATING')
        UNION
        SELECT buyer_user_id as uid FROM private_deals WHERE status IN ('OPEN', 'PENDING', 'NEGOTIATING')
      `);
      for (const r of (busyDealBots || [])) {
        if (r?.uid) protectedBotIds.add(r.uid);
      }
    } catch (_) {}
    try {
      const busyCourtBots = await query.all(`
        SELECT plaintiff_id as uid FROM court_cases WHERE status NOT IN ('CLOSED', 'RESOLVED', 'DISMISSED', 'EXECUTED')
        UNION
        SELECT defendant_id as uid FROM court_cases WHERE status NOT IN ('CLOSED', 'RESOLVED', 'DISMISSED', 'EXECUTED')
      `);
      for (const r of (busyCourtBots || [])) {
        if (r?.uid) protectedBotIds.add(r.uid);
      }
    } catch (_) {}

    if (currentlyFrozen.length < targetFrozen) {
      const needed = targetFrozen - currentlyFrozen.length;
      const candidates = currentlyActive
        .filter((b) => !protectedBotIds.has(b.id))
        .slice(0, needed);

      if (candidates.length > 0) {
        await query.transaction(async (tx) => {
          for (const b of candidates) {
            await tx.run(
              "UPDATE users SET is_banned = 1 WHERE id = ? AND (id LIKE 'bot-user-%' OR id LIKE 'user-bot-%')",
              [b.id]
            );
          }
        });
        console.log(`❄️ [Bot Freeze Manager] Membekukan ${candidates.length} akun bot ritel (Total bot dibekukan: ${currentlyFrozen.length + candidates.length}/${totalBots}). Seluruh pemain asli 100% aman!`);
      }
    } else if (customTarget !== null && currentlyFrozen.length > targetFrozen) {
      const toUnfreezeCount = currentlyFrozen.length - targetFrozen;
      // Pulihkan mulai dari nomor bot lebih kecil terlebih dahulu
      const toUnfreeze = [...currentlyFrozen].reverse().slice(0, toUnfreezeCount);
      if (toUnfreeze.length > 0) {
        await query.transaction(async (tx) => {
          for (const b of toUnfreeze) {
            await tx.run(
              "UPDATE users SET is_banned = 0 WHERE id = ? AND (id LIKE 'bot-user-%' OR id LIKE 'user-bot-%')",
              [b.id]
            );
          }
        });
        console.log(`🔥 [Bot Freeze Manager] Memulihkan ${toUnfreeze.length} akun bot (Total bot dibekukan: ${currentlyFrozen.length - toUnfreeze.length}/${totalBots}).`);
      }
    }

    const finalStats = await query.get(`
      SELECT
        SUM(CASE WHEN (id LIKE 'bot-user-%' OR id LIKE 'user-bot-%') THEN 1 ELSE 0 END) as total_bots,
        SUM(CASE WHEN (id LIKE 'bot-user-%' OR id LIKE 'user-bot-%') AND is_banned = 1 THEN 1 ELSE 0 END) as frozen_bots,
        SUM(CASE WHEN (id LIKE 'bot-user-%' OR id LIKE 'user-bot-%') AND is_banned = 0 THEN 1 ELSE 0 END) as active_bots,
        SUM(CASE WHEN id NOT LIKE 'bot-user-%' AND id NOT LIKE 'user-bot-%' THEN 1 ELSE 0 END) as real_players,
        SUM(CASE WHEN id NOT LIKE 'bot-user-%' AND id NOT LIKE 'user-bot-%' AND is_banned = 1 THEN 1 ELSE 0 END) as frozen_real_players
      FROM users
      WHERE role != 'ADMIN'
    `);

    return {
      targetFrozen,
      totalBots: Number(finalStats?.total_bots || 0),
      frozenBots: Number(finalStats?.frozen_bots || 0),
      activeBots: Number(finalStats?.active_bots || 0),
      realPlayers: Number(finalStats?.real_players || 0),
      frozenRealPlayers: Number(finalStats?.frozen_real_players || 0),
    };
  } catch (err) {
    console.error('enforceBotFreezeQuota error:', err.message);
    return null;
  }
}

// ============================================================================
// MARIADB MSS PANEL BRIDGE (mss-db:3306 / db_capitalfederation)
// Automatically creates & synchronizes all tables with MariaDB on Linux Server
// while maintaining 100% SQLite speed & query compatibility.
// ============================================================================
let mysqlPool = null;
let mariaDbConnected = false;
let syncTimer = null;
let isSyncing = false;
let lastMariaSyncCompletedAt = 0;
const MIN_MARIADB_SYNC_INTERVAL_MS = 120000;

const SYNC_TABLES_ORDER = [
  'central_bank_settings',
  'users',
  'companies',
  'portfolios',
  'transactions',
  'loans',
  'auction_items',
  'auction_bids',
  'chat_messages',
  'company_shareholders',
  'ipo_offerings',
  'ipo_orders',
  'ipo_bids',
  'court_cases',
  'court_chat_messages',
  'private_deals',
  'deal_deeds',
  'acquisition_proposals',
  'state_treasury_ledger',
  'sovereign_bonds',
  'user_bond_holdings',
  'sector_subsidies',
  'government_tenders',
  'tender_bids',
  'debt_relief_records',
  'market_orders',
  'market_oversight_log',
  'macro_events',
  'news',
  'cash_flow_ledger',
  'price_history'
];

function getMariaColumnType(col) {
  const upperType = String(col.type || '').toUpperCase();
  const name = String(col.name || '').toLowerCase();
  if (col.pk > 0) {
    return upperType.includes('INT') ? 'BIGINT NOT NULL' : 'VARCHAR(191) NOT NULL';
  }
  if (upperType.includes('INT')) return 'BIGINT NULL';
  if (upperType.includes('REAL') || upperType.includes('FLOA') || upperType.includes('DOUB')) return 'DOUBLE NULL';
  if (
    ['id', 'user_id', 'company_id', 'owner_id', 'username', 'symbol', 'sector', 'status', 'role', 'key', 'case_number', 'deal_number', 'deed_number', 'bond_code', 'tender_code'].includes(name)
  ) {
    return 'VARCHAR(191) NULL';
  }
  return 'LONGTEXT NULL';
}

async function connectAndInitMariaDb() {
  const host = process.env.DB_HOST || 'mss-db';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USERNAME || 'root';
  const password = process.env.DB_PASSWORD || 'root_secret_pass';
  const database = process.env.DB_DATABASE || 'db_capitalfederation';

  try {
    const mysql = require('mysql2/promise');
    const bootstrapConn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      connectTimeout: 2500
    });
    await bootstrapConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await bootstrapConn.end();

    mysqlPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 3000
    });

    // Ensure all tables and columns exist in MariaDB (db_capitalfederation)
    for (const table of SYNC_TABLES_ORDER) {
      const cols = await query.all(`PRAGMA table_info(${table})`);
      if (!cols || cols.length === 0) continue;

      const pkCols = cols.filter((c) => c.pk > 0).map((c) => `\`${c.name}\``);
      const colDefs = cols.map((c) => `\`${c.name}\` ${getMariaColumnType(c)}`);
      if (pkCols.length > 0) {
        colDefs.push(`PRIMARY KEY (${pkCols.join(', ')})`);
      }

      const createSql = `CREATE TABLE IF NOT EXISTS \`${table}\` (${colDefs.join(', ')}) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
      await mysqlPool.query(createSql);

      // Ensure any newly migrated columns also exist in MariaDB
      for (const c of cols) {
        if (c.pk > 0) continue;
        try {
          await mysqlPool.query(
            `ALTER TABLE \`${table}\` ADD COLUMN IF NOT EXISTS \`${c.name}\` ${getMariaColumnType(c)};`
          );
        } catch (_) {
          // Ignore if column already exists or syntax varies
        }
      }
    }

    mariaDbConnected = true;
    console.log(`🗄️  Connected & Verified MariaDB MSS Panel (${host}:${port}/${database})`);
  } catch (err) {
    mariaDbConnected = false;
    console.log(
      `ℹ️  MariaDB MSS Panel (${host}:${port}) belum terjangkau di environment ini (${err.code || err.message}) — menggunakan Persistent SQLite lokal.`
    );
  }
}

async function restoreFromMariaDbIfNeeded() {
  if (!mariaDbConnected || !mysqlPool) return;
  try {
    const sqliteUsers = await query.get("SELECT COUNT(*) as count FROM users WHERE username != 'admin'");
    const sqliteComps = await query.get('SELECT COUNT(*) as count FROM companies');
    const [mariaUsersRows] = await mysqlPool.query("SELECT COUNT(*) as count FROM `users` WHERE `username` != 'admin'");
    const [mariaCompsRows] = await mysqlPool.query('SELECT COUNT(*) as count FROM `companies`');

    const mariaUserCount = mariaUsersRows?.[0]?.count || 0;
    const mariaCompCount = mariaCompsRows?.[0]?.count || 0;

    // Restore from MariaDB if SQLite is fresh/empty while MariaDB has existing data
    if ((sqliteUsers.count === 0 && mariaUserCount > 0) || (sqliteComps.count === 0 && mariaCompCount > 0)) {
      console.log('♻️  Memulihkan data pemain & pasar dari MariaDB (db_capitalfederation) ke engine lokal...');
      await query.exec('PRAGMA foreign_keys = OFF;');
      for (const table of SYNC_TABLES_ORDER) {
        const [rows] = await mysqlPool.query(`SELECT * FROM \`${table}\``);
        if (!rows || rows.length === 0) continue;
        const colNames = Object.keys(rows[0]);
        const placeholders = colNames.map(() => '?').join(', ');
        const insertSql = `INSERT OR REPLACE INTO ${table} (${colNames.join(', ')}) VALUES (${placeholders})`;
        for (const r of rows) {
          await new Promise((resolve) => {
            db.run(insertSql, colNames.map((k) => r[k]), () => resolve());
          });
        }
      }
      await query.exec('PRAGMA foreign_keys = ON;');
      console.log(`✅ Pemulihan selesai (${mariaUserCount} akun pemain & ${mariaCompCount} emiten dipulihkan dari MariaDB).`);
    }
  } catch (err) {
    console.error('Warning during MariaDB restore check:', err.message);
  }
}

async function syncAllToMariaDb() {
  if (!mariaDbConnected || !mysqlPool || isSyncing) return;
  isSyncing = true;
  try {
    for (const table of SYNC_TABLES_ORDER) {
      // Yield to Node event loop between tables so live HTTP/Socket requests stay <50ms!
      await new Promise((r) => setImmediate(r));

      let limitClause = '';
      if (table === 'price_history') limitClause = ' ORDER BY timestamp DESC LIMIT 300';
      else if (table === 'cash_flow_ledger') limitClause = ' ORDER BY created_at DESC LIMIT 400';
      else if (table === 'transactions') limitClause = ' ORDER BY created_at DESC LIMIT 500';
      else if (table === 'state_treasury_ledger') limitClause = ' ORDER BY rowid DESC LIMIT 600';
      else if (table === 'portfolios') {
        limitClause = " ORDER BY CASE WHEN user_id NOT LIKE 'bot-user-%' AND user_id NOT LIKE 'user-bot-%' THEN 0 ELSE 1 END ASC, lots_owned DESC LIMIT 2000";
      }

      const rows = await query.all(`SELECT * FROM ${table}${limitClause}`);
      if (!rows || rows.length === 0) continue;

      const colNames = Object.keys(rows[0]);
      const quotedCols = colNames.map((c) => `\`${c}\``).join(', ');
      const valuesMatrix = rows.map((r) => colNames.map((c) => r[c]));

      // Batch in chunks of 150 rows with event-loop yield per chunk
      for (let i = 0; i < valuesMatrix.length; i += 150) {
        const chunk = valuesMatrix.slice(i, i + 150);
        await mysqlPool.query(`REPLACE INTO \`${table}\` (${quotedCols}) VALUES ?`, [chunk]);
        await new Promise((r) => setImmediate(r));
      }
    }
    lastMariaSyncCompletedAt = Date.now();
  } catch (err) {
    // Non-fatal background sync error
  } finally {
    isSyncing = false;
  }
}

function scheduleMariaDbSync(sql = '') {
  if (!mariaDbConnected || !mysqlPool || isSyncing) return;
  const upper = String(sql).trim().toUpperCase();
  if (!upper.startsWith('INSERT') && !upper.startsWith('UPDATE') && !upper.startsWith('DELETE') && !upper.startsWith('REPLACE')) {
    return;
  }
  if (syncTimer) return;
  const elapsed = Date.now() - lastMariaSyncCompletedAt;
  const delayMs = Math.max(15000, MIN_MARIADB_SYNC_INTERVAL_MS - elapsed);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncAllToMariaDb().catch(() => {});
  }, delayMs);
}

module.exports = {
  db,
  query,
  initDb,
  recordCashFlow,
  syncAllToMariaDb,
  healRealPlayerCompanies,
  optimizeAndPruneDatabase,
  enforceBotFreezeQuota
};
