/**
 * Admin — Bank Sentral IPMC
 *  GET  /api/admin/bank/overview
 *  POST /api/admin/bank/set-rate
 *  POST /api/admin/bank/seize-debtor
 */
module.exports = function registerBankRoutes(app, { query, io }) {
  const DAY_MS = 1000 * 60 * 60 * 24;

  app.get('/api/admin/bank/overview', async (req, res) => {
    try {
      const rateRow = await query.get("SELECT value FROM central_bank_settings WHERE key = 'interest_rate'");
      const currentRate = rateRow ? parseFloat(rateRow.value) : 20.0;

      const allLoans = await query.all(`
        SELECT l.*, u.username, u.pt_name, u.balance_ib, u.company_balance_ib, u.credit_score
        FROM loans l
        JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
      `);

      let totalIssued = 0;
      let totalOutstanding = 0;
      let totalPaid = 0;
      let nplCount = 0;
      const now = Date.now();

      const loans = allLoans.map((l) => {
        const principal = l.principal_amount || 0;
        const remaining = l.remaining_amount || 0;
        const paid = l.paid_amount || 0;
        const isActive = l.status === 'ACTIVE';

        totalIssued += principal;
        totalPaid += paid;
        if (isActive) totalOutstanding += remaining;

        const diffMs = new Date(l.due_date).getTime() - now;
        const remainingDays = Math.ceil(diffMs / DAY_MS);
        const isOverdue = isActive && diffMs < 0;
        if (isOverdue) nplCount++;

        return {
          id: l.id,
          user_id: l.user_id,
          username: l.username,
          pt_name: l.pt_name || '',
          credit_score: l.credit_score || 0,
          balance_ib: l.balance_ib || 0,
          company_balance_ib: l.company_balance_ib || 0,
          principal_amount: principal,
          principal_ib: principal,
          remaining_amount: remaining,
          remaining_debt_ib: remaining,
          paid_amount: paid,
          paid_ib: paid,
          interest_rate: l.interest_rate || 0,
          daily_installment_ib: l.daily_installment_ib || 0,
          total_interest_ib: l.total_interest_ib || 0,
          tenor_days: l.tenor_days || 0,
          collateral_type: l.collateral_type || '-',
          status: l.status,
          due_date: l.due_date,
          created_at: l.created_at,
          remaining_days: remainingDays,
          is_overdue: isOverdue,
          days_overdue: isOverdue ? Math.abs(remainingDays) : 0,
        };
      });

      res.json({
        interest_rate: currentRate,
        total_issued: totalIssued,
        total_outstanding: totalOutstanding,
        total_paid: totalPaid,
        npl_count: nplCount,
        active_loans_count: loans.filter((l) => l.status === 'ACTIVE').length,
        loans,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/bank/set-rate', async (req, res) => {
    try {
      const numRate = parseFloat(req.body.rate);
      if (isNaN(numRate) || numRate < 1 || numRate > 100) {
        return res.status(400).json({ error: 'Suku bunga acuan tidak valid (1% - 100%)' });
      }

      await query.run("INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES ('interest_rate', ?)", [String(numRate)]);

      io.emit('central_bank:rate', { interestRate: numRate });
      io.emit('market:breaking_news', {
        title: '🏛️ BANK SENTRAL MENETAPKAN SUKU BUNGA ACUAN BARU',
        content: `Rapat Dewan Gubernur Bank Sentral IPMC memutuskan Suku Bunga Acuan resmi ditetapkan sebesar ${numRate.toFixed(1)}% p.a.`,
        sentiment: numRate > 20 ? 'BEARISH' : 'BULLISH',
      });

      res.json({ success: true, interest_rate: numRate, message: `Suku bunga acuan berhasil diubah menjadi ${numRate.toFixed(1)}% p.a.` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Quantitative Easing: Bank Sentral menyuntik likuiditas ke emiten yang jatuh dalam
  app.post('/api/admin/bank/liquidity-injection', async (req, res) => {
    try {
      const rows = await query.all(
        `SELECT id, symbol, current_price, prev_close FROM companies
         WHERE status != 'SUSPENDED' AND prev_close > 0 AND current_price < prev_close * 0.9
         ORDER BY (current_price / prev_close) ASC LIMIT 25`
      );

      for (const c of rows) {
        const lifted = Math.min(c.prev_close, Math.round(c.current_price * 1.04));
        await query.run('UPDATE companies SET current_price = ? WHERE id = ?', [lifted, c.id]);
        io.emit('market:intervention', { symbol: c.symbol, companyId: c.id, newPrice: lifted });
      }

      if (rows.length > 0) {
        io.emit('market:breaking_news', {
          title: '🏛️ BANK SENTRAL SUNTIK LIKUIDITAS (QE)',
          content: `Bank Sentral IPMC menyuntik likuiditas ke ${rows.length} emiten yang terkoreksi dalam untuk menahan kepanikan pasar.`,
          sentiment: 'BULLISH',
        });
      }

      res.json({
        success: true,
        count: rows.length,
        message: rows.length > 0
          ? `Likuiditas disuntik ke ${rows.length} emiten yang terkoreksi >10%.`
          : 'Tidak ada emiten yang terkoreksi >10%. Pasar dalam kondisi sehat.',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/bank/seize-debtor', async (req, res) => {
    try {
      const { loanId } = req.body;
      const loan = await query.get('SELECT * FROM loans WHERE id = ?', [loanId]);
      if (!loan) return res.status(404).json({ error: 'Data pinjaman tidak ditemukan' });
      if (loan.status !== 'ACTIVE') return res.status(400).json({ error: 'Hanya pinjaman aktif yang dapat disita asetnya' });

      const user = await query.get('SELECT * FROM users WHERE id = ?', [loan.user_id]);
      if (!user) return res.status(404).json({ error: 'Debitur tidak ditemukan' });

      const debt = loan.remaining_amount;
      let fromCompany = 0;
      let fromPersonal = 0;

      if (user.company_balance_ib > 0) {
        fromCompany = Math.min(user.company_balance_ib, debt);
        await query.run('UPDATE users SET company_balance_ib = company_balance_ib - ? WHERE id = ?', [fromCompany, user.id]);
      }
      const rest = debt - fromCompany;
      if (rest > 0 && user.balance_ib > 0) {
        fromPersonal = Math.min(user.balance_ib, rest);
        await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [fromPersonal, user.id]);
      }

      const totalSeized = fromCompany + fromPersonal;
      const remainingAfter = Math.max(0, debt - totalSeized);
      const newStatus = remainingAfter <= 0 ? 'SEIZED' : 'ACTIVE';

      await query.run('UPDATE users SET credit_score = MAX(300, credit_score - 75) WHERE id = ?', [user.id]);
      await query.run(
        'UPDATE loans SET remaining_amount = ?, paid_amount = COALESCE(paid_amount, 0) + ?, status = ? WHERE id = ?',
        [remainingAfter, totalSeized, newStatus, loan.id]
      );

      io.emit('user:balance_updated', {
        userId: user.id,
        newBalance: user.balance_ib - fromPersonal,
        companyBalance: user.company_balance_ib - fromCompany,
      });
      io.emit('market:breaking_news', {
        title: '🚨 BANK SENTRAL IPMC EKSEKUSI SITA ASET DEBITUR',
        content: `Bank Sentral IPMC mengeksekusi penyitaan aset senilai IB ${Math.round(totalSeized).toLocaleString('id-ID')} milik ${user.username} (${user.pt_name || 'Konglomerat'}) akibat wanprestasi kredit.`,
        sentiment: 'BEARISH',
      });

      res.json({
        success: true,
        message: `Sita aset berhasil. Disita IB ${Math.round(totalSeized).toLocaleString('id-ID')}. Sisa hutang: IB ${Math.round(remainingAfter).toLocaleString('id-ID')}`,
        totalSeized,
        seizedFromCompany: fromCompany,
        seizedFromPersonal: fromPersonal,
        remainingDebt: remainingAfter,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. PILAR 4: Program Pemutihan Denda Bunga Massal (National Debt Penalty Waiver)
  app.post('/api/admin/bank/mass-penalty-waiver', async (req, res) => {
    try {
      const now = Date.now();
      const overdueLoans = await query.all(
        'SELECT l.*, u.username FROM loans l JOIN users u ON l.user_id = u.id WHERE l.status = "ACTIVE"'
      );

      let waivedCount = 0;
      let totalPenaltyWaived = 0;

      for (const loan of overdueLoans) {
        const dueMs = new Date(loan.due_date).getTime();
        if (dueMs < now) {
          // Hitung perkiraan denda bunga (misal 10% dari sisa utang)
          const penaltyEst = Math.round((loan.remaining_amount || 0) * 0.1);
          totalPenaltyWaived += penaltyEst;
          waivedCount++;

          // Perpanjang jatuh tempo +7 hari dari hari ini
          const newDueDate = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
          await query.run('UPDATE loans SET due_date = ? WHERE id = ?', [newDueDate, loan.id]);
          await query.run('UPDATE users SET credit_score = MIN(850, COALESCE(credit_score, 700) + 25) WHERE id = ?', [loan.user_id]);

          // Catat audit pemutihan
          await query.run(
            `INSERT INTO debt_relief_records (id, loan_id, user_id, relief_type, penalty_waived_ib, notes)
             VALUES (?, ?, ?, 'MASS_PENALTY_WAIVER', ?, ?)`,
            [
              require('uuid').v4(),
              loan.id,
              loan.user_id,
              penaltyEst,
              `Pemutihan Denda Bunga Nasional: Tenor diperpanjang 7 hari, skor kredit dipulihkan +25.`
            ]
          );
        }
      }

      // Siarkan Breaking News ke seluruh penjuru game
      const newsItem = {
        id: require('uuid').v4(),
        title: '🏛️ BANK SENTRAL TERBITKAN AMNESTI BUNGA KREDIT NASIONAL',
        content: `Dewan Gubernur Bank Sentral resmi mengumumkan pemutihan denda bunga keterlambatan bagi seluruh debitur perseroan. Tenor diperpanjang dan skor kredit dipulihkan demi stabilitas industri nasional!`,
        affected_sector: 'Keuangan',
        sentiment: 'BULLISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );

      if (io) {
        io.emit('debt_relief:executed', { reliefType: 'MASS_PENALTY_WAIVER', waivedCount, totalPenaltyWaived });
        io.emit('market:news_broadcast', newsItem);
      }

      res.json({
        success: true,
        message: `Program Pemutihan Denda Nasional berhasil dieksekusi! ${waivedCount} pinjaman macet telah diperpanjang tenornya dan denda dihapuskan.`,
        waivedCount,
        totalPenaltyWaived
      });
    } catch (err) {
      console.error('Mass penalty waiver error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. PILAR 4: Restrukturisasi Kredit Debitur Individual (Tenor Baru + Diskon Pokok)
  app.post('/api/admin/bank/restructure-loan', async (req, res) => {
    try {
      const { loanId, extensionDays, haircutPct, newInterestRate } = req.body;
      if (!loanId) return res.status(400).json({ error: 'Loan ID wajib disertakan' });

      const loan = await query.get('SELECT l.*, u.username, u.pt_name FROM loans l JOIN users u ON l.user_id = u.id WHERE l.id = ?', [loanId]);
      if (!loan) return res.status(404).json({ error: 'Pinjaman tidak ditemukan' });

      const extraDays = parseInt(extensionDays || 14, 10);
      const discountPct = parseFloat(haircutPct || 0); // Diskon pokok (0 - 50%)
      const rate = newInterestRate ? parseFloat(newInterestRate) : 2.5;

      const currentRemaining = loan.remaining_amount || 0;
      const principalHaircut = Math.round(currentRemaining * (discountPct / 100.0));
      const newRemaining = Math.max(0, currentRemaining - principalHaircut);

      // Hitung tanggal jatuh tempo baru
      const curDueMs = new Date(loan.due_date).getTime();
      const baseMs = Math.max(Date.now(), curDueMs);
      const newDueDate = new Date(baseMs + extraDays * 24 * 60 * 60 * 1000).toISOString();

      await query.run('BEGIN TRANSACTION');
      try {
        await query.run(
          'UPDATE loans SET remaining_amount = ?, interest_rate = ?, due_date = ?, status = "ACTIVE" WHERE id = ?',
          [newRemaining, rate, newDueDate, loanId]
        );

        // Pulihkan skor kredit debitur
        await query.run(
          'UPDATE users SET credit_score = MIN(850, COALESCE(credit_score, 700) + 40) WHERE id = ?',
          [loan.user_id]
        );

        // Jika ada diskon pokok (haircut), catat sebagai subsidi dari Kas Negara
        if (principalHaircut > 0) {
          await query.run(
            `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
             VALUES (?, 'DEBT_RESTRUCTURING_SUBSIDY', ?, ?, 'EXPENSE', ?, ?)`,
            [
              require('uuid').v4(),
              `Subsidi Restrukturisasi Kredit & Pemotongan Pokok Hutang ${loan.username}`,
              principalHaircut,
              loanId,
              `Diskon pokok ${discountPct}% untuk pemulihan perseroan ${loan.pt_name || loan.username}`
            ]
          );
        }

        // Catat audit restrukturisasi
        await query.run(
          `INSERT INTO debt_relief_records (id, loan_id, user_id, relief_type, principal_haircut_ib, notes)
           VALUES (?, ?, ?, 'HAIRCUT_AND_RESTRUCTURE', ?, ?)`,
          [
            require('uuid').v4(),
            loanId,
            loan.user_id,
            principalHaircut,
            `Restrukturisasi pinjaman: Tenor +${extraDays} hari, bunga turun ke ${rate}%, diskon pokok IB ${principalHaircut.toLocaleString('id-ID')}`
          ]
        );

        await query.run('COMMIT');

        if (io) {
          io.emit('debt_relief:executed', {
            loanId,
            userId: loan.user_id,
            newRemaining,
            newDueDate,
            principalHaircut
          });
          io.emit('treasury:updated');
        }

        res.json({
          success: true,
          message: `Restrukturisasi kredit atas debitur ${loan.username} berhasil! Pokok hutang didiskon IB ${principalHaircut.toLocaleString('id-ID')}, tenor diperpanjang +${extraDays} hari dengan bunga super ringan ${rate}%.`,
          newRemaining,
          newDueDate,
          principalHaircut
        });
      } catch (rstErr) {
        await query.run('ROLLBACK');
        throw rstErr;
      }
    } catch (err) {
      console.error('Restructure loan error:', err);
      res.status(500).json({ error: err.message });
    }
  });
};
