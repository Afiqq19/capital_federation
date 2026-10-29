/**
 * Surveillance Service — Pengawasan Bursa IPMC
 *
 * Membedakan dua instrumen otoritas bursa:
 *
 *  1. UMA (Unusual Market Activity)  → PERINGATAN.
 *     Saham tetap diperdagangkan. Ditandai karena pergerakan tidak wajar.
 *     Bisa AUTO (terdeteksi sistem saat |perubahan harga| >= ambang) atau MANUAL (admin).
 *
 *  2. SUSPENSI                        → perdagangan DIHENTIKAN.
 *     Saham dibekukan sampai tanggal/jam yang ditentukan (suspend_until),
 *     setelah itu otomatis dibuka kembali oleh scheduler.
 */
const { v4: uuidv4 } = require('uuid');

const DEFAULT_CONFIG = {
  uma_auto_enabled: 'true',
  uma_threshold_pct: '15',
  uma_clear_pct: '7',
};

const SCAN_INTERVAL_MS = 10_000;
const MAX_INDIVIDUAL_NEWS_PER_SCAN = 3;

class SurveillanceService {
  constructor({ query, io, simulationEngine }) {
    this.query = query;
    this.io = io;
    this.simulationEngine = simulationEngine;
    this.timer = null;
    this.scanning = false;
  }

  // ---------- Lifecycle ----------
  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.scan().catch((e) => console.error('Surveillance scan error:', e)), SCAN_INTERVAL_MS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // ---------- Config ----------
  async getConfig() {
    const rows = await this.query.all(
      "SELECT key, value FROM central_bank_settings WHERE key IN ('uma_auto_enabled','uma_threshold_pct','uma_clear_pct')"
    );
    const map = { ...DEFAULT_CONFIG, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) };
    const threshold = parseFloat(map.uma_threshold_pct) || 15;
    const clear = Math.min(parseFloat(map.uma_clear_pct) || 7, threshold);
    return {
      autoEnabled: String(map.uma_auto_enabled) !== 'false',
      thresholdPct: threshold,
      clearPct: clear,
    };
  }

  // ---------- Helpers ----------
  static changePct(c) {
    const ref = c.prev_close > 0 ? c.prev_close : c.base_price;
    if (!ref) return 0;
    return ((c.current_price - ref) / ref) * 100;
  }

  async _log({ company, action, source, reason, until }) {
    await this.query.run(
      `INSERT INTO market_oversight_log (id, company_id, symbol, action, source, reason, until)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), company.id, company.symbol, action, source, reason || null, until || null]
    );
  }

  async _news(title, content, sentiment) {
    const newsId = uuidv4();
    const nowIso = new Date().toISOString();
    try {
      await this.query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsId, title, content, 'Semua Sektor', sentiment || 'NEUTRAL', nowIso]
      );
    } catch (e) {
      console.warn('Gagal menyimpan berita pengawasan:', e.message);
    }
    this.io.emit('market:breaking_news', { id: newsId, title, content, sentiment });
    this.io.emit('market:news_broadcast', {
      id: newsId,
      title,
      content,
      affectedSector: 'Semua Sektor',
      sentiment: sentiment || 'NEUTRAL',
      published_at: nowIso,
    });
  }

  async _getCompany(companyId) {
    return this.query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
  }

  // ---------- UMA ----------
  async flagUma(companyId, { reason, direction, source = 'MANUAL', silent = false } = {}) {
    const comp = await this._getCompany(companyId);
    if (!comp) throw new Error('Emiten tidak ditemukan');

    const ref = comp.prev_close > 0 ? comp.prev_close : (comp.base_price || 5000);
    const computedDir = comp.current_price >= ref ? 'UP' : 'DOWN';
    const finalDir = direction ? direction.toUpperCase() : computedDir;
    const isUp = finalDir === 'UP';

    const defaultReason = isUp
      ? 'Lonjakan kenaikan harga kumulatif dan volume transaksi yang di luar kebiasaan (Unusual Market Activity Bullish).'
      : 'Penurunan anjlok harga kumulatif yang di luar kebiasaan (Unusual Market Activity Bearish).';
    const why = reason || defaultReason;
    const now = new Date().toISOString();

    await this.query.run(
      'UPDATE companies SET uma_flag = 1, uma_direction = ?, uma_reason = ?, uma_source = ?, uma_at = ? WHERE id = ?',
      [finalDir, why, source, now, companyId]
    );
    await this._log({ company: comp, action: `UMA_ON_${finalDir}`, source, reason: why });

    const payload = {
      companyId,
      symbol: comp.symbol,
      uma: true,
      direction: finalDir,
      source,
      reason: why,
      uma_direction: finalDir,
    };
    this.io.emit('market:uma_changed', payload);
    this.io.emit('company:uma_changed', payload);

    if (!silent) {
      const newsTitle = isUp
        ? `🚀 UMA PENAIKAN BURSA: ${comp.symbol}`
        : `⚠️ UMA PENURUNAN BURSA: ${comp.symbol}`;
      const newsContent = isUp
        ? `Bursa IPMC merilis sinyal UMA (Kategori Kenaikan Ekstrem) pada saham ${comp.name} (${comp.symbol}). ${why}. Perdagangan tetap berjalan normal.`
        : `Bursa IPMC merilis sinyal UMA (Kategori Penurunan Anjlok) pada saham ${comp.name} (${comp.symbol}). ${why}. Perdagangan tetap berjalan normal.`;

      this._news(newsTitle, newsContent, isUp ? 'BULLISH' : 'BEARISH');
    }
    return { symbol: comp.symbol, name: comp.name, direction: finalDir };
  }

  async clearUma(companyId, { source = 'MANUAL', silent = false } = {}) {
    const comp = await this._getCompany(companyId);
    if (!comp) throw new Error('Emiten tidak ditemukan');

    await this.query.run(
      'UPDATE companies SET uma_flag = 0, uma_direction = NULL, uma_reason = NULL, uma_source = NULL, uma_at = NULL WHERE id = ?',
      [companyId]
    );
    await this._log({ company: comp, action: 'UMA_OFF', source, reason: 'Penandaan UMA dicabut' });

    const payload = { companyId, symbol: comp.symbol, uma: false, source };
    this.io.emit('market:uma_changed', payload);
    this.io.emit('company:uma_changed', payload);

    if (!silent) {
      this._news(
        `✅ UMA DICABUT: ${comp.symbol}`,
        `Bursa IPMC mencabut penandaan UMA pada saham ${comp.name} (${comp.symbol}). Pergerakan harga kembali dalam batas toleransi wajar.`,
        'BULLISH'
      );
    }
    return { symbol: comp.symbol, name: comp.name };
  }

  // ---------- SUSPENSI ----------
  async suspend(companyId, { reason, until, source = 'ADMIN' } = {}) {
    const comp = await this._getCompany(companyId);
    if (!comp) throw new Error('Emiten tidak ditemukan');

    const untilDate = new Date(until);
    if (!until || isNaN(untilDate.getTime())) throw new Error('Tanggal berakhir suspensi wajib diisi dengan benar');
    if (untilDate.getTime() <= Date.now()) throw new Error('Tanggal berakhir suspensi harus di masa depan');

    const untilIso = untilDate.toISOString();
    const nowIso = new Date().toISOString();
    const why = reason || 'Perlindungan investor atas pergerakan harga tidak wajar';
    const wasSuspended = comp.status === 'SUSPENDED';

    await this.query.run(
      `UPDATE companies
         SET status = 'SUSPENDED',
             suspended_at = CASE WHEN status = 'SUSPENDED' AND suspended_at IS NOT NULL THEN suspended_at ELSE ? END,
             suspend_until = ?, suspend_reason = ?
       WHERE id = ?`,
      [nowIso, untilIso, why, companyId]
    );
    await this._log({ company: comp, action: wasSuspended ? 'SUSPEND_EXTEND' : 'SUSPEND', source, reason: why, until: untilIso });

    if (this.simulationEngine && this.simulationEngine.stockTrends) {
      this.simulationEngine.stockTrends[comp.symbol] = 'FLAT';
    }

    this.io.emit('market:company_status_changed', { companyId, symbol: comp.symbol, status: 'SUSPENDED', until: untilIso });
    this.io.emit('company:status_changed', { companyId, symbol: comp.symbol, status: 'SUSPENDED', suspendedAt: nowIso, until: untilIso });

    const untilLabel = untilDate.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
    this._news(
      wasSuspended ? `⏳ SUSPENSI DIPERPANJANG: ${comp.symbol}` : `🚨 SUSPENSI SAHAM ${comp.symbol}`,
      `Perdagangan saham ${comp.name} (${comp.symbol}) DIHENTIKAN sementara oleh Otoritas Bursa IPMC hingga ${untilLabel}. Alasan: ${why}.`,
      'BEARISH'
    );
    return { symbol: comp.symbol, name: comp.name, until: untilIso };
  }

  async lift(companyId, { source = 'ADMIN', reason } = {}) {
    const comp = await this._getCompany(companyId);
    if (!comp) throw new Error('Emiten tidak ditemukan');
    if (comp.status !== 'SUSPENDED') throw new Error('Saham ini tidak sedang disuspensi');

    await this.query.run(
      "UPDATE companies SET status = 'HEALTHY', suspended_at = NULL, suspend_until = NULL, suspend_reason = NULL WHERE id = ?",
      [companyId]
    );
    await this._log({ company: comp, action: 'SUSPEND_LIFT', source, reason: reason || 'Suspensi dicabut' });

    if (this.simulationEngine && this.simulationEngine.stockTrends) {
      this.simulationEngine.stockTrends[comp.symbol] = 'VOLATILE';
    }

    this.io.emit('market:company_status_changed', { companyId, symbol: comp.symbol, status: 'HEALTHY' });
    this.io.emit('company:status_changed', { companyId, symbol: comp.symbol, status: 'HEALTHY', suspendedAt: null });
    this._news(
      `✅ SUSPENSI DICABUT: ${comp.symbol}`,
      `Suspensi perdagangan saham ${comp.name} (${comp.symbol}) telah berakhir. Saham dapat diperdagangkan kembali.`,
      'BULLISH'
    );
    return { symbol: comp.symbol, name: comp.name };
  }

  // ---------- Scheduler ----------
  async scan() {
    if (this.scanning) return;
    this.scanning = true;
    try {
      const cfg = await this.getConfig();
      const now = Date.now();
      const rows = await this.query.all(
        `SELECT id, symbol, name, current_price, prev_close, base_price, status,
                uma_flag, uma_source, suspend_until
         FROM companies`
      );

      const newlyFlagged = [];

      for (const c of rows) {
        // 1) Buka suspensi otomatis ketika masa suspensi berakhir
        if (c.status === 'SUSPENDED' && c.suspend_until && Date.parse(c.suspend_until) <= now) {
          await this.lift(c.id, { source: 'AUTO', reason: 'Masa suspensi berakhir otomatis' });
          continue;
        }
        if (!cfg.autoEnabled || c.status === 'SUSPENDED') continue;

        // 2) UMA otomatis berdasarkan deviasi harga
        const pct = SurveillanceService.changePct(c);
        const abs = Math.abs(pct);

        if (!c.uma_flag && abs >= cfg.thresholdPct) {
          const dir = pct >= 0 ? 'melonjak' : 'anjlok';
          await this.flagUma(c.id, {
            source: 'AUTO',
            reason: `Harga ${dir} ${abs.toFixed(1)}% dari harga acuan (ambang UMA ${cfg.thresholdPct}%)`,
            silent: true,
          });
          newlyFlagged.push({ symbol: c.symbol, name: c.name, pct });
        } else if (c.uma_flag && c.uma_source === 'AUTO' && abs <= cfg.clearPct) {
          await this.clearUma(c.id, { source: 'AUTO', silent: true });
        }
      }

      // Siaran berita ringkas supaya tidak membanjiri running text
      if (newlyFlagged.length > 0 && newlyFlagged.length <= MAX_INDIVIDUAL_NEWS_PER_SCAN) {
        for (const f of newlyFlagged) {
          this._news(
            `⚠️ UMA BURSA IPMC: ${f.symbol}`,
            `Sistem pengawasan mendeteksi pergerakan ${f.pct >= 0 ? '+' : ''}${f.pct.toFixed(1)}% pada ${f.name} (${f.symbol}). Saham ditandai UMA — perdagangan tetap berjalan, harap berhati-hati.`,
            'BEARISH'
          );
        }
      } else if (newlyFlagged.length > MAX_INDIVIDUAL_NEWS_PER_SCAN) {
        const list = newlyFlagged.slice(0, 6).map((f) => f.symbol).join(', ');
        this._news(
          `⚠️ UMA MASAL: ${newlyFlagged.length} SAHAM DITANDAI`,
          `Volatilitas ekstrem terdeteksi. ${newlyFlagged.length} saham ditandai UMA (${list}${newlyFlagged.length > 6 ? ', dll' : ''}). Investor diimbau berhati-hati.`,
          'BEARISH'
        );
      }
    } finally {
      this.scanning = false;
    }
  }
}

module.exports = SurveillanceService;
