const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');

module.exports = function(io, simulationEngine) {
  // 1. Ringkasan Kas Negara & Sovereign Wealth Fund
  router.get('/summary', async (req, res) => {
    try {
      const rows = await query.all('SELECT source_type, direction, SUM(amount_ib) as total FROM state_treasury_ledger GROUP BY source_type, direction');
      const reserveRow = await query.get("SELECT value FROM central_bank_settings WHERE key = 'sovereign_base_reserve_ib'");
      let baseReserve = reserveRow?.value ? parseFloat(reserveRow.value) : 1000000000000.0; // Cadangan Devisa Awal Negara Federasi 1 Triliun IB
      let totalIncome = 0.0;
      let totalExpense = 0.0;
      let finesTotal = 0.0;
      let filingFeesTotal = 0.0;
      let meteraiTotal = 0.0;
      let taxTotal = 0.0;
      let corporateTaxTotal = 0.0;

      for (const r of (rows || [])) {
        const amt = r.total || 0.0;
        if (r.direction === 'INCOME') {
          totalIncome += amt;
          if (r.source_type === 'SEIZURE_FINE') finesTotal += amt;
          if (r.source_type === 'PNAF_FILING_FEE') filingFeesTotal += amt;
          if (r.source_type === 'METERAI_FEE') meteraiTotal += amt;
          if (r.source_type === 'TRANSACTION_TAX' || r.source_type === 'CORPORATE_TAX') taxTotal += amt;
          if (r.source_type === 'CORPORATE_TAX') corporateTaxTotal += amt;
        } else {
          totalExpense += amt;
        }
      }

      const netTreasuryBalance = baseReserve + totalIncome - totalExpense;

      // Ambil jumlah perusahaan yang disita negara
      const seizedCount = await query.get('SELECT COUNT(*) as count FROM companies WHERE is_seized = 1');
      const bumnCount = await query.get('SELECT COUNT(*) as count FROM companies WHERE is_bumn = 1');

      res.json({
        netTreasuryBalance,
        totalIncome,
        totalExpense,
        breakdown: {
          finesTotal,
          filingFeesTotal,
          meteraiTotal,
          taxTotal,
          corporateTaxTotal,
          baseReserve
        },
        seizedCompaniesCount: seizedCount ? seizedCount.count : 0,
        bumnCompaniesCount: bumnCount ? bumnCount.count : 0
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Riwayat Mutasi Buku Kas Negara (Ledger)
  router.get('/ledger', async (req, res) => {
    try {
      const ledger = await query.all('SELECT * FROM state_treasury_ledger ORDER BY created_at DESC LIMIT 50');
      res.json(ledger || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Stimulus / Bailout Dana Talangan Krisis ke Emiten (Pemicu Rebound ARA +35%)
  router.post('/bailout', async (req, res) => {
    try {
      const { companyId, amountIb, reason } = req.body;
      const amount = parseFloat(amountIb);
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Nominal stimulus bailout tidak valid' });
      }

      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      // Suntik dana ke kas perusahaan
      await query.run('UPDATE companies SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?', [amount, companyId]);

      // Catat pengeluaran di kas negara (mengurangi Saldo Kas Likuid)
      const ledgerId = uuidv4();
      await query.run(
        'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [ledgerId, 'BAILOUT_DISBURSEMENT', `Kucuran Dana Bailout Penyelamatan Emiten ${comp.symbol}`, amount, 'EXPENSE', comp.symbol, reason || 'Stimulus stabilitas pasar modal']
      );

      // Rebound Bullish ARA: Dongkrak harga saham menuju batas atas (+25% s/d +35%) & hilangkan UMA
      const refPrice = comp.prev_close > 0 ? comp.prev_close : comp.base_price;
      const araPct = refPrice <= 200 ? 0.35 : (refPrice <= 5000 ? 0.25 : 0.20);
      const newPrice = Math.round(refPrice * (1 + araPct));
      const dailyHigh = Math.max(comp.daily_high || newPrice, newPrice);

      await query.run(
        `UPDATE companies 
         SET current_price = ?, daily_high = ?, fundamental_score = 95.0, status = 'HEALTHY', uma_flag = 0, is_seized = 0 
         WHERE id = ?`,
        [newPrice, dailyHigh, companyId]
      );

      // Shift engine baseline trend ke Bullish Rally
      if (simulationEngine && simulationEngine.stockTrends) {
        simulationEngine.stockTrends.set(companyId, araPct * 100);
      }

      // Siarkan Breaking News Bailout & Lonjakan Bullish
      const newsItem = {
        id: uuidv4(),
        title: `🏛️ STIMULUS KAS NEGARA: Dana Talangan IB ${amount.toLocaleString('id-ID')} Dikucurkan ke ${comp.symbol}!`,
        content: `Otoritas Finansial Federasi meresmikan injeksi likuiditas kas negara untuk menyelamatkan operasional perseroan ${comp.name}. Saham langsung meroket +${(araPct * 100).toFixed(0)}% (ARA) dan status UMA resmi dicabut!`,
        affected_sector: comp.sector,
        sentiment: 'BULLISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );

      io.emit('market:news_broadcast', newsItem);
      io.emit('company:seized_status', { companyId, isSeized: false });
      io.emit('treasury:updated');

      res.json({
        success: true,
        newPrice,
        priceChangePct: (araPct * 100).toFixed(2),
        message: `🎉 Dana Talangan Bailout IB ${amount.toLocaleString('id-ID')} berhasil disuntikkan! Saham ${comp.symbol} pulih ke harga IB ${newPrice.toLocaleString('id-ID')} (+${(araPct * 100).toFixed(0)}% ARA) & status UMA dicabut.`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3b. Injeksi Cadangan Brankas Kas Negara (Top Up Sovereign Fund)
  router.post('/inject-reserve', async (req, res) => {
    try {
      const { amountIb, notes } = req.body;
      const amount = parseFloat(amountIb);
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Nominal injeksi cadangan kas negara tidak valid' });
      }

      const ledgerId = uuidv4();
      const reasonDesc = (notes || '').trim() || 'Injeksi Likuiditas Cadangan Devisa Kas Negara oleh Otoritas Moneter';

      await query.run(`
        INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
        VALUES (?, 'SOVEREIGN_INJECTION', 'Injeksi Cadangan Devisa Kas Negara (Sovereign Capital Injection)', ?, 'INCOME', 'SOVEREIGN_VAULT_TOPUP', ?)
      `, [ledgerId, amount, reasonDesc]);

      io.emit('treasury:updated');

      // Ambil saldo terbaru
      const rows = await query.all('SELECT direction, SUM(amount_ib) as total FROM state_treasury_ledger GROUP BY direction');
      let baseReserve = 1000000000000.0;
      let totalIncome = 0.0;
      let totalExpense = 0.0;
      for (const r of (rows || [])) {
        if (r.direction === 'INCOME') totalIncome += (r.total || 0);
        else totalExpense += (r.total || 0);
      }
      const newNetTreasury = baseReserve + totalIncome - totalExpense;

      res.json({
        success: true,
        injectedAmount: amount,
        newNetTreasury,
        message: `🎉 Berhasil menyuntikkan cadangan kas negara sebesar IB ${amount.toLocaleString('id-ID')}! Saldo Kas Likuid kini: IB ${newNetTreasury.toLocaleString('id-ID')}.`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Pembagian Dividen Kemakmuran Rakyat / BLT Ekonomi
  router.post('/distribute-dividend', async (req, res) => {
    try {
      const { amountPerUser, note, targetAudience = 'HUMAN_ONLY', allowDeficit = false } = req.body;
      const perUser = parseFloat(amountPerUser) || 50000000.0;

      let users = [];
      if (targetAudience === 'HUMAN_ONLY') {
        users = await query.all("SELECT id, username, balance_ib FROM users WHERE (is_bot_account = 0 OR is_bot_account IS NULL) AND id NOT LIKE 'bot-user-%'");
      } else {
        users = await query.all('SELECT id, username, balance_ib FROM users');
      }

      if (!users || users.length === 0) {
        return res.status(400).json({ error: 'Tidak ada konglomerat yang sesuai target' });
      }

      const totalDisbursed = perUser * users.length;

      // Salurkan ke pemain sesuai target
      if (targetAudience === 'HUMAN_ONLY') {
        await query.run("UPDATE users SET balance_ib = balance_ib + ? WHERE (is_bot_account = 0 OR is_bot_account IS NULL) AND id NOT LIKE 'bot-user-%'", [perUser]);
      } else {
        await query.run('UPDATE users SET balance_ib = balance_ib + ?', [perUser]);
      }

      const audienceLabel = targetAudience === 'HUMAN_ONLY' ? `${users.length} Konglomerat Pemain Asli` : `${users.length} Seluruh Konglomerat`;

      // Catat pengeluaran kas negara (mengurangi saldo kas likuid negara)
      await query.run(
        'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), 'BAILOUT_DISBURSEMENT', `Penyaluran Dividen Kemakmuran Rakyat Federasi (${audienceLabel})`, totalDisbursed, 'EXPENSE', 'BLT_FEDERASI', note || 'Stimulus daya beli masyarakat']
      );

      // Siarkan breaking news
      const newsItem = {
        id: uuidv4(),
        title: `💰 DIVIDEN KEMAKMURAN RAKYAT FEDERASI DICAIRKAN!`,
        content: `Pemerintah Federasi menyalurkan surplus kas negara sebesar IB ${perUser.toLocaleString('id-ID')} langsung ke setiap kas pribadi ${audienceLabel}!`,
        affected_sector: 'Semua Sektor',
        sentiment: 'BULLISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );

      io.emit('market:news_broadcast', newsItem);
      io.emit('treasury:updated');
      io.emit('user:balance_batch_updated', { addedBalance: perUser, targetAudience });

      // Update balance untuk pemain (efisien, batasi loop agar server tidak lagging)
      if (users.length <= 100) {
        for (const u of users) {
          io.emit('user:balance_updated', { userId: u.id, newBalance: (u.balance_ib || 0) + perUser });
        }
      } else {
        // Broadcast umum agar semua client me-refresh balance
        io.emit('user:balance_updated', {});
      }

      res.json({
        success: true,
        totalDisbursed,
        perUser,
        recipientsCount: users.length,
        targetAudience,
        message: `🎉 Berhasil mencairkan IB ${perUser.toLocaleString('id-ID')} ke ${audienceLabel}! Total dana negara disalurkan: IB ${totalDisbursed.toLocaleString('id-ID')}.`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Penarikan / Penggunaan Langsung Saldo Kas Negara ke Kas Pribadi atau Kas PT
  router.post('/withdraw-funds', async (req, res) => {
    try {
      const { targetType, userId, companyId, amountIb, purpose, allowDeficit = false } = req.body;
      const amount = parseFloat(amountIb);
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Nominal penarikan kas negara tidak valid' });
      }

      // Hitung saldo kas negara saat ini
      const rows = await query.all('SELECT direction, SUM(amount_ib) as total FROM state_treasury_ledger GROUP BY direction');
      let baseReserve = 1000000000000.0;
      let totalIncome = 0.0;
      let totalExpense = 0.0;
      for (const r of (rows || [])) {
        if (r.direction === 'INCOME') totalIncome += (r.total || 0);
        else totalExpense += (r.total || 0);
      }
      const netTreasury = baseReserve + totalIncome - totalExpense;
      if (amount > netTreasury && !allowDeficit) {
        return res.status(400).json({
          error: `Saldo Kas Negara tidak mencukupi (Tersedia: IB ${netTreasury.toLocaleString('id-ID')}). Silakan lakukan Injeksi Kas Negara terlebih dahulu atau aktifkan persetujuan defisit anggaran.`
        });
      }

      const reasonDesc = (purpose || '').trim() || 'Pencairan Anggaran Kas Negara / Insentif Finansial';

      if (targetType === 'PERSONAL' || !targetType) {
        if (!userId) {
          return res.status(400).json({ error: 'Pilih pemain penerima dana kas negara' });
        }
        const user = await query.get('SELECT id, username, balance_ib FROM users WHERE id = ?', [userId]);
        if (!user) return res.status(404).json({ error: 'Pengguna tidak ditemukan' });

        await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [amount, userId]);
        const postUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [userId]);

        const ledgerId = uuidv4();
        await query.run(
          'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [ledgerId, 'STATE_TREASURY_WITHDRAWAL', `Pencairan Kas Negara ke Kas Pribadi ${user.username}`, amount, 'EXPENSE', user.username, reasonDesc]
        );

        // Catat buku kas mutasi pemain
        const flowId = uuidv4();
        await query.run(`
          INSERT INTO cash_flow_ledger (id, user_id, account_type, category, title, amount_ib, direction, balance_after, notes)
          VALUES (?, ?, 'PERSONAL', 'TREASURY_GRANT', ?, ?, 'INCOME', ?, ?)
        `, [flowId, userId, `Dana Anggaran Kas Negara: ${reasonDesc}`, amount, postUser.balance_ib, `Kucuran dana resmi dari Brankas Kas Negara Sovereign Fund`]);

        io.emit('user:balance_updated', { userId, newBalance: postUser.balance_ib });
        io.emit('treasury:updated');

        return res.json({
          success: true,
          message: `Berhasil mencairkan IB ${amount.toLocaleString('id-ID')} dari Kas Negara ke Kas Pribadi ${user.username}!`,
          newBalance: postUser.balance_ib,
        });
      } else if (targetType === 'COMPANY') {
        if (!companyId) {
          return res.status(400).json({ error: 'Pilih perusahaan / PT penerima dana kas negara' });
        }
        const comp = await query.get('SELECT id, name, symbol, owner_id, company_balance_ib FROM companies WHERE id = ?', [companyId]);
        if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

        await query.run('UPDATE companies SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?', [amount, companyId]);
        const postComp = await query.get('SELECT company_balance_ib FROM companies WHERE id = ?', [companyId]);

        const ledgerId = uuidv4();
        await query.run(
          'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [ledgerId, 'STATE_TREASURY_WITHDRAWAL', `Kucuran Kas Negara ke Kas PT ${comp.symbol}`, amount, 'EXPENSE', comp.symbol, reasonDesc]
        );

        if (comp.owner_id) {
          const flowId = uuidv4();
          await query.run(`
            INSERT INTO cash_flow_ledger (id, user_id, company_id, account_type, category, title, amount_ib, direction, balance_after, notes)
            VALUES (?, ?, ?, 'COMPANY', 'TREASURY_GRANT', ?, ?, 'INCOME', ?, ?)
          `, [flowId, comp.owner_id, comp.id, `Dana Hibah Kas Negara: ${reasonDesc}`, amount, postComp.company_balance_ib, `Injeksi likuiditas resmi dari Kas Negara`]);

          io.emit('user:balance_updated', { userId: comp.owner_id, companyId: comp.id, companyBalance: postComp.company_balance_ib });
        }

        io.emit('treasury:updated');

        return res.json({
          success: true,
          message: `Berhasil mencairkan IB ${amount.toLocaleString('id-ID')} dari Kas Negara ke Kas PT ${comp.name} (${comp.symbol})!`,
          newCompanyBalance: postComp.company_balance_ib,
        });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
