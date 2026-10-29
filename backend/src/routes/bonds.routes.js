const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');

module.exports = function(io) {
  // 1. Ambil Seluruh Seri Obligasi Negara Aktif & Terbuka
  router.get('/active', async (req, res) => {
    try {
      const bonds = await query.all(
        "SELECT * FROM sovereign_bonds ORDER BY CASE status WHEN 'OPEN' THEN 1 WHEN 'SOLD_OUT' THEN 2 ELSE 3 END, issued_at DESC"
      );
      res.json(bonds || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Ambil Portofolio Surat Utang Pemain Tertentu
  router.get('/my-holdings/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const holdings = await query.all(`
        SELECT h.*, b.bond_code, b.title as bond_title, b.tenor_days, b.maturity_date, b.status as bond_status
        FROM user_bond_holdings h
        JOIN sovereign_bonds b ON h.bond_id = b.id
        WHERE h.user_id = ?
        ORDER BY h.created_at DESC
      `, [userId]);
      res.json(holdings || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Pembelian Obligasi Negara oleh Pemain (Kas Pribadi)
  router.post('/order', async (req, res) => {
    try {
      const { userId, bondId, units } = req.body;
      const numUnits = parseInt(units, 10);
      if (!userId || !bondId || isNaN(numUnits) || numUnits <= 0) {
        return res.status(400).json({ error: 'Parameter pembelian obligasi tidak valid' });
      }

      const bond = await query.get('SELECT * FROM sovereign_bonds WHERE id = ?', [bondId]);
      if (!bond) return res.status(404).json({ error: 'Seri obligasi negara tidak ditemukan' });
      if (bond.status !== 'OPEN') {
        return res.status(400).json({ error: `Penerbitan seri ${bond.bond_code} sudah ditutup / berstatus ${bond.status}` });
      }

      if (numUnits < (bond.min_order_units || 5)) {
        return res.status(400).json({ error: `Minimum pemesanan seri ini adalah ${bond.min_order_units || 5} unit (IB ${((bond.min_order_units || 5) * (bond.unit_price_ib || 1000000)).toLocaleString('id-ID')})` });
      }

      const totalInvestment = numUnits * (bond.unit_price_ib || 1000000.0);
      const remainingQuota = (bond.total_quota_ib || 0) - (bond.ordered_quota_ib || 0);
      if (totalInvestment > remainingQuota) {
        return res.status(400).json({ error: `Sisa kuota emisi tidak mencukupi. Kuota tersisa hanya IB ${remainingQuota.toLocaleString('id-ID')}` });
      }

      const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'Pemain tidak ditemukan' });
      if ((user.balance_ib || 0) < totalInvestment) {
        return res.status(400).json({
          error: `Saldo Kas Pribadi Anda (IB ${(user.balance_ib || 0).toLocaleString('id-ID')}) tidak mencukupi untuk pembelian IB ${totalInvestment.toLocaleString('id-ID')}`
        });
      }

      // Validasi kuota maksimum per akun
      const existingHolding = await query.get(
        'SELECT SUM(units_owned) as total_units FROM user_bond_holdings WHERE user_id = ? AND bond_id = ? AND status = "ACTIVE"',
        [userId, bondId]
      );
      const curUnits = existingHolding ? (existingHolding.total_units || 0) : 0;
      if (curUnits + numUnits > (bond.max_order_units || 500)) {
        return res.status(400).json({
          error: `Maksimum kepemilikan seri ini adalah ${bond.max_order_units || 500} unit per konglomerat. Anda sudah memiliki ${curUnits} unit.`
        });
      }

      // Transaksi Atomik: Potong Kas Pribadi -> Tambah Kuota Obligasi -> Catat Kas Negara -> Simpan Kepemilikan
      await query.run('BEGIN TRANSACTION');
      try {
        // 1. Potong kas pribadi pemain
        await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [totalInvestment, userId]);

        // 2. Tambah kuota terjual obligasi
        const newOrdered = (bond.ordered_quota_ib || 0) + totalInvestment;
        const newStatus = newOrdered >= bond.total_quota_ib ? 'SOLD_OUT' : 'OPEN';
        await query.run('UPDATE sovereign_bonds SET ordered_quota_ib = ?, status = ? WHERE id = ?', [newOrdered, newStatus, bondId]);

        // 3. Masukkan dana pembelian ke Brankas Kas Negara (State Treasury)
        const trsId = uuidv4();
        await query.run(
          `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
           VALUES (?, 'BOND_ISSUANCE', ?, ?, 'INCOME', ?, ?)`,
          [
            trsId,
            `Penerimaan Dana Emisi Surat Utang Negara ${bond.bond_code}`,
            totalInvestment,
            bond.bond_code,
            `Diserap dari kas investor ${user.username} (${numUnits} unit @ IB ${(bond.unit_price_ib || 1000000).toLocaleString('id-ID')})`
          ]
        );

        // 4. Catat portofolio kepemilikan surat utang pemain
        const holdingId = uuidv4();
        await query.run(
          `INSERT INTO user_bond_holdings (id, bond_id, user_id, units_owned, total_investment_ib, coupon_rate_pct, status, last_coupon_paid_at)
           VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP)`,
          [holdingId, bondId, userId, numUnits, totalInvestment, bond.coupon_rate_pct]
        );

        await query.run('COMMIT');

        // Siarkan pembaruan real-time ke web dan aplikasi
        if (io) {
          io.emit('bonds:ordered', {
            bondId,
            bondCode: bond.bond_code,
            orderedQuotaIb: newOrdered,
            status: newStatus,
            username: user.username,
            totalInvestment
          });
          io.emit('treasury:updated');
        }

        res.json({
          success: true,
          message: `Selamat! Anda berhasil membeli ${numUnits} unit ${bond.bond_code} senilai IB ${totalInvestment.toLocaleString('id-ID')}. Kupon ${bond.coupon_rate_pct}% p.a. akan dibayar tiap siklus ke kas Anda.`,
          holdingId,
          bondCode: bond.bond_code,
          unitsOwned: numUnits,
          totalInvestment
        });
      } catch (txnErr) {
        await query.run('ROLLBACK');
        throw txnErr;
      }
    } catch (err) {
      console.error('Bond order error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Web Admin: Terbitkan Seri Obligasi Negara Baru
  router.post('/admin/issue', async (req, res) => {
    try {
      const { bondCode, title, totalQuotaIb, couponRatePct, tenorDays, minOrderUnits, maxOrderUnits } = req.body;
      if (!bondCode || !title || !totalQuotaIb || !couponRatePct || !tenorDays) {
        return res.status(400).json({ error: 'Kode, Judul, Kuota, Kupon, dan Tenor wajib diisi lengkap' });
      }

      const cleanCode = bondCode.trim().toUpperCase();
      const existing = await query.get('SELECT id FROM sovereign_bonds WHERE bond_code = ?', [cleanCode]);
      if (existing) {
        return res.status(400).json({ error: `Kode obligasi ${cleanCode} sudah terdaftar sebelumnya` });
      }

      const id = uuidv4();
      const quota = parseFloat(totalQuotaIb);
      const coupon = parseFloat(couponRatePct);
      const tenor = parseInt(tenorDays, 10);
      const maturityDate = new Date(Date.now() + tenor * 24 * 60 * 60 * 1000).toISOString();

      await query.run(
        `INSERT INTO sovereign_bonds (id, bond_code, title, total_quota_ib, ordered_quota_ib, coupon_rate_pct, unit_price_ib, min_order_units, max_order_units, tenor_days, status, maturity_date)
         VALUES (?, ?, ?, ?, 0.0, ?, 1000000.0, ?, ?, ?, 'OPEN', ?)`,
        [id, cleanCode, title, quota, coupon, parseInt(minOrderUnits || 5, 10), parseInt(maxOrderUnits || 500, 10), tenor, maturityDate]
      );

      // Siarkan Breaking News ke seluruh bursa
      const newsItem = {
        id: uuidv4(),
        title: `🏛️ KEMENKEU RESMI TERBITKAN ${cleanCode}: Kupon ${coupon}% p.a.!`,
        content: `Pemerintah resmi menerbitkan Surat Berharga Negara seri ${cleanCode} (${title}) dengan total kuota emisi IB ${quota.toLocaleString('id-ID')}. Terbuka untuk seluruh konglomerat dengan tenor ${tenor} hari.`,
        affected_sector: 'Keuangan',
        sentiment: 'BULLISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );

      if (io) {
        io.emit('bonds:issued', { id, bondCode: cleanCode, title, quota, coupon, tenor });
        io.emit('market:news_broadcast', newsItem);
      }

      res.json({
        success: true,
        message: `Seri Obligasi Negara ${cleanCode} berhasil diterbitkan ke publik!`,
        bond: { id, bondCode: cleanCode, title, quota, coupon, tenor, maturityDate }
      });
    } catch (err) {
      console.error('Issue bond error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Web Admin: Tutup / Lunasi Obligasi (Redeem)
  router.post('/admin/redeem/:bondId', async (req, res) => {
    try {
      const { bondId } = req.params;
      const bond = await query.get('SELECT * FROM sovereign_bonds WHERE id = ?', [bondId]);
      if (!bond) return res.status(404).json({ error: 'Seri obligasi tidak ditemukan' });

      // Ambil seluruh pemegang obligasi aktif
      const holdings = await query.all(
        'SELECT * FROM user_bond_holdings WHERE bond_id = ? AND status = "ACTIVE"',
        [bondId]
      );

      let totalPrincipalRefunded = 0;
      await query.run('BEGIN TRANSACTION');
      try {
        for (const h of holdings) {
          const refundAmount = h.total_investment_ib;
          await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [refundAmount, h.user_id]);
          await query.run('UPDATE user_bond_holdings SET status = "REDEEMED" WHERE id = ?', [h.id]);
          totalPrincipalRefunded += refundAmount;
        }

        // Catat pengeluaran pelunasan pokok dari Kas Negara
        if (totalPrincipalRefunded > 0) {
          await query.run(
            `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
             VALUES (?, 'BOND_REDEMPTION', ?, ?, 'EXPENSE', ?, ?)`,
            [
              uuidv4(),
              `Pelunasan Pokok Investasi Obligasi ${bond.bond_code}`,
              totalPrincipalRefunded,
              bond.bond_code,
              `Pengembalian pokok investasi kepada ${holdings.length} investor`
            ]
          );
        }

        await query.run('UPDATE sovereign_bonds SET status = "MATURED" WHERE id = ?', [bondId]);
        await query.run('COMMIT');

        if (io) {
          io.emit('bonds:redeemed', { bondId, bondCode: bond.bond_code, totalRefunded: totalPrincipalRefunded });
          io.emit('treasury:updated');
        }

        res.json({
          success: true,
          message: `Seri ${bond.bond_code} resmi dilunasi! Total pokok IB ${totalPrincipalRefunded.toLocaleString('id-ID')} telah dikembalikan ke kas masing-masing investor.`,
          totalRefunded: totalPrincipalRefunded
        });
      } catch (redErr) {
        await query.run('ROLLBACK');
        throw redErr;
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
