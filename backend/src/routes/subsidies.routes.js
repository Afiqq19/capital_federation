const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');

module.exports = function(io) {
  // 1. Ambil Status Subsidi Seluruh Sektor Industri
  router.get('/status', async (req, res) => {
    try {
      const subsidies = await query.all(
        'SELECT * FROM sector_subsidies ORDER BY is_active DESC, sector ASC'
      );
      res.json(subsidies || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Sakelar Cepat Toggle Status Subsidi Sektor (Aktifkan / Nonaktifkan)
  router.post('/toggle', async (req, res) => {
    try {
      const { sector, isActive, effectiveTaxRatePct, operationalGrantIb, headlineNews } = req.body;
      if (!sector) return res.status(400).json({ error: 'Nama sektor industri wajib disertakan' });

      const existing = await query.get('SELECT * FROM sector_subsidies WHERE sector = ?', [sector]);
      const newActive = typeof isActive === 'boolean' ? (isActive ? 1 : 0) : (existing && existing.is_active ? 0 : 1);
      const taxRate = effectiveTaxRatePct ? parseFloat(effectiveTaxRatePct) : (existing ? existing.effective_tax_rate_pct : 5.0);
      const grant = operationalGrantIb ? parseFloat(operationalGrantIb) : (existing ? existing.operational_grant_ib : 0.0);
      const newsText = headlineNews || `Program Insentif Akselerasi Sektor ${sector} Federasi`;

      if (existing) {
        await query.run(
          `UPDATE sector_subsidies 
           SET is_active = ?, effective_tax_rate_pct = ?, operational_grant_ib = ?, headline_news = ?
           WHERE sector = ?`,
          [newActive, taxRate, grant, newsText, sector]
        );
      } else {
        await query.run(
          `INSERT INTO sector_subsidies (id, sector, is_active, tax_discount_pct, effective_tax_rate_pct, operational_grant_ib, headline_news)
           VALUES (?, ?, ?, 50.0, ?, ?, ?)`,
          [uuidv4(), sector, newActive, taxRate, grant, newsText]
        );
      }

      // Siarkan Breaking News ke Pasar Modal jika diaktifkan
      if (newActive === 1) {
        const newsItem = {
          id: uuidv4(),
          title: `🔥 KEMENKEU TERBITKAN TAX HOLIDAY: Sektor ${sector} PPh ${taxRate}%!`,
          content: `Pemerintah resmi mengumumkan insentif fiskal untuk seluruh emiten industri ${sector}. Tarif PPh Badan dipotong menjadi ${taxRate}% dan subsidi operasional aktif untuk memacu pertumbuhan industri nasional!`,
          affected_sector: sector,
          sentiment: 'BULLISH',
          published_at: new Date().toISOString()
        };
        await query.run(
          'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
          [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
        );
        if (io) io.emit('market:news_broadcast', newsItem);
      }

      if (io) {
        io.emit('subsidies:updated', { sector, isActive: newActive === 1, effectiveTaxRatePct: taxRate, operationalGrantIb: grant });
      }

      res.json({
        success: true,
        message: `Status subsidi sektor ${sector} berhasil diubah menjadi: ${newActive === 1 ? 'AKTIF (Tax Holiday Berjalan)' : 'NONAKTIF'}.`,
        sector,
        isActive: newActive === 1,
        effectiveTaxRatePct: taxRate
      });
    } catch (err) {
      console.error('Toggle subsidy error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Batch Simpan Pengaturan Seluruh Sektor dari Web Admin
  router.post('/batch-save', async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: 'Data items wajib berupa array' });

      for (const item of items) {
        await query.run(
          `UPDATE sector_subsidies
           SET is_active = ?, effective_tax_rate_pct = ?, operational_grant_ib = ?
           WHERE id = ?`,
          [item.is_active ? 1 : 0, parseFloat(item.effective_tax_rate_pct || 5), parseFloat(item.operational_grant_ib || 0), item.id]
        );
      }

      if (io) {
        io.emit('subsidies:updated', { items });
      }

      res.json({ success: true, message: 'Seluruh konfigurasi subsidi sektoral berhasil disimpan!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
