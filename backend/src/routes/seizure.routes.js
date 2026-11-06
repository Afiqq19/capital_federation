const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, recordCashFlow } = require('../db');
const { dispatchInboxNotification } = require('../services/courtEngine.service');

module.exports = function(io, simulationEngine) {
  // 1. Eksekusi Sita Perusahaan ke Kas Negara (Disertai Batas Jatuh Tempo 4 Hari Masa Tenggang)
  router.post('/:id/seize', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason = 'Sita Eksekusi Putusan PNAF & Kredit Macet BCF' } = req.body;

      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [id]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      const now = new Date();
      const seizedAt = now.toISOString();
      // Masa tenggang penebusan: 4 hari (96 jam) sebelum masuk antrean lelang negara
      const seizureDeadline = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();

      await query.run(
        `UPDATE companies 
         SET is_seized = 1, seized_by = 'Pengadilan Niaga & Arbitrase Federation (PNAF) & BCF', seized_at = ?, seizure_deadline = ?, is_auction_ready = 0, seize_reason = ?
         WHERE id = ?`,
        [seizedAt, seizureDeadline, reason, id]
      );

      // Siarkan Breaking News Sitaan Negara
      const newsItem = {
        id: uuidv4(),
        title: `🚨 SITA EKSEKUSI FEDERASI: Perseroan ${comp.name} (${comp.symbol}) Resmi Disita!`,
        content: `Kepaniteraan Eksekusi PNAF dan Bank Central Federation membekukan kepengurusan dan menyita aset perseroan ${comp.name}. Alasan: ${reason}. Pemilik diberi batas jatuh tempo 4 hari untuk menebus sebelum dilelang publik.`,
        affected_sector: comp.sector,
        sentiment: 'BEARISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );
      io.emit('market:news_broadcast', newsItem);
      io.emit('company:seized_status', { companyId: id, isSeized: true, reason, seizureDeadline });
      io.emit('treasury:updated');

      res.json({
        success: true,
        message: `⚖️ Emiten ${comp.name} (${comp.symbol}) resmi disita untuk Kas Kedaulatan Capital Federation (Masa tebus: 4 hari)!`,
        seizureDeadline
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Cabut Sitaan Perusahaan (Admin Otoritas)
  router.post('/:id/unseize', async (req, res) => {
    try {
      const { id } = req.params;
      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [id]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      const correctedPrice = Math.max(50, Math.round(Number(comp.current_price || 100) * 0.70));
      const newFundamental = Math.max(40, Math.min(65, Math.round(Number(comp.fundamental_score || 80) * 0.65)));

      await query.run(
        `UPDATE companies 
         SET is_seized = 0, seized_by = NULL, seized_at = NULL, seizure_deadline = NULL, is_auction_ready = 0, seize_reason = NULL, 
             status = 'CRITICAL', current_price = ?, fundamental_score = ? 
         WHERE id = ?`,
        [correctedPrice, newFundamental, id]
      );

      const newsItem = {
        id: uuidv4(),
        title: `✅ PEMULIHAN STATUS: Sitaan atas Perseroan ${comp.symbol} Resmi Dicabut!`,
        content: `Setelah restrukturisasi dan pelunasan kewajiban, Kepaniteraan PNAF membuka kembali suspensi perdagangan ${comp.name} dengan penyesuaian harga pasar ke IB ${correctedPrice.toLocaleString('id-ID')} (merintis di level dasar menanti minat investor baru).`,
        affected_sector: comp.sector,
        sentiment: 'NEUTRAL',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );
      io.emit('market:news_broadcast', newsItem);
      io.emit('company:seized_status', { companyId: id, isSeized: false });
      io.emit('treasury:updated');

      res.json({
        success: true,
        message: `Status sitaan ${comp.name} berhasil dicabut.`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Konversi Jadi BUMF (Badan Usaha Milik Federation)
  router.post('/:id/convert-bumn', async (req, res) => {
    try {
      const { id } = req.params;
      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [id]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      const newBumnVal = comp.is_bumn === 1 ? 0 : 1;
      await query.run('UPDATE companies SET is_bumn = ? WHERE id = ?', [newBumnVal, id]);
      io.emit('treasury:updated');

      res.json({
        success: true,
        isBumn: newBumnVal === 1,
        message: newBumnVal === 1 
          ? `Perseroan ${comp.name} resmi dinasionalisasi menjadi BUMF Capital Federation!`
          : `Status BUMF ${comp.name} dikembalikan menjadi perseroan swasta.`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Hitung Rincian Biaya Penebusan PT Disita + Validasi Jatuh Tempo Lelang
  router.get('/:id/redemption-info', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.query;
      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [id]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      // Hitung deadline masa tenggang (Default: 4 hari setelah disita)
      const now = new Date();
      let seizureDeadline = comp.seizure_deadline;
      if (!seizureDeadline && comp.seized_at) {
        seizureDeadline = new Date(new Date(comp.seized_at).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
      } else if (!seizureDeadline) {
        seizureDeadline = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
      }

      const deadlineDate = new Date(seizureDeadline);
      const msLeft = deadlineDate.getTime() - now.getTime();
      const isAuctionReady = msLeft <= 0 || comp.is_auction_ready === 1;
      const hoursLeft = Math.max(0, Math.round(msLeft / (1000 * 60 * 60)));

      const isDeficitPailit = Number(comp.company_balance_ib || 0) <= -50000000 || comp.status === 'BANKRUPT' || (comp.seize_reason && comp.seize_reason.toUpperCase().includes('PAILIT'));

      // Cari berkas perkara pengadilan (court_cases) yang mendasari sita eksekusi emiten ini (HANYA perkara yang menang/dikabulkan)
      let linkedCase = null;
      if (!isDeficitPailit) {
        linkedCase = await query.get(
          `SELECT * FROM court_cases 
           WHERE (defendant_company_id = ? OR defendant_user_id = ? OR title LIKE ? OR target_asset_description LIKE ?)
             AND status IN ('VERDICT_APPROVED', 'VERDICT_PAILIT')
             AND (plaintiff_user_id IS NULL OR plaintiff_user_id != ?)
           ORDER BY created_at DESC LIMIT 1`,
          [comp.id, comp.owner_id || '', `%${comp.symbol}%`, `%${comp.symbol}%`, comp.owner_id || '---']
        );
      }

      // Deteksi apakah pemohon / pemilik saat ini adalah PENGGUGAT yang memenangkan perkara
      const isOwnerPlaintiffWinner = Boolean(
        linkedCase && (
          (userId && String(linkedCase.plaintiff_user_id) === String(userId)) ||
          (comp.owner_id && String(linkedCase.plaintiff_user_id) === String(comp.owner_id))
        )
      );

      // Hitung denda / ganti rugi amar putusan sidang
      let courtFine = 0;
      if (linkedCase) {
        courtFine = Number(linkedCase.verdict_awarded_amount || linkedCase.claim_amount_ib || 0);
      }
      if (courtFine <= 0 && comp.seize_reason) {
        const fineMatch = comp.seize_reason.match(/\[Tuntutan\/Denda:\s*IB\s*([\d\.]+)\]/i);
        if (fineMatch) {
          courtFine = Number(fineMatch[1].replace(/\./g, '')) || 0;
        }
      }
      // Denda Sanksi PNAF: Jika pemilik saat ini adalah Penggugat yang memenangkan perkara, denda = 0 (Bebas Biaya!)
      let pnafSanctionFine = courtFine > 0 ? courtFine : (isDeficitPailit ? 50000000.0 : Math.max(100000000.0, Math.round((comp.base_price || 2000) * 50000)));
      if (isOwnerPlaintiffWinner) {
        pnafSanctionFine = 0.0;
        courtFine = 0.0;
      }

      // Ekstraksi info perkara lengkap
      let caseNumber = linkedCase ? linkedCase.case_number : null;
      let caseTitle = linkedCase ? linkedCase.title : null;
      let plaintiffName = linkedCase ? linkedCase.plaintiff_name : null;
      let defendantName = linkedCase ? linkedCase.defendant_name : (comp.name ? `${comp.name} (${comp.symbol})` : comp.symbol);
      let hearingTime = linkedCase ? (linkedCase.hearing_time || '10:00 WIB') : null;
      let hearingDate = linkedCase ? (linkedCase.court_hearing_date || 'Hari Ini') : null;

      if (isDeficitPailit) {
        caseNumber = 'PNAF/BCF-INSOLVENSI/2026';
        caseTitle = 'Kepailitan Operasional: Defisit Kas Melebihi Batas Maksimum (-IB 50.000.000)';
        plaintiffName = 'Kepaniteraan PNAF & Otoritas Bank BCF';
        defendantName = `${comp.name} (${comp.symbol})`;
        hearingTime = 'Sesi Insolvensi Bursa';
        hearingDate = 'Hari Ini';
      } else {
        if (!caseNumber && comp.seize_reason) {
          const match = comp.seize_reason.match(/No\.\s*([^\s\[(]+)/);
          if (match) caseNumber = match[1];
        }
        if (!plaintiffName && comp.seize_reason) {
          const match = comp.seize_reason.match(/(?:\[Penggugat:\s*|oleh Penggugat:\s*)([^\]|\-]+)/);
          if (match) plaintiffName = match[1].trim();
        }
        if (comp.seize_reason) {
          const defMatch = comp.seize_reason.match(/(?:\[Tergugat:\s*|terhadap Tergugat:\s*)([^\]|\-]+)/);
          if (defMatch) defendantName = defMatch[1].trim();

          const timeMatch = comp.seize_reason.match(/(?:\[Waktu(?: Sidang| Pembekuan)?:\s*)([^\]]+)/);
          if (timeMatch) hearingTime = timeMatch[1].trim();
        }
        if (!caseTitle && comp.seize_reason) {
          const match = comp.seize_reason.match(/\[Perkara:\s*([^\]]+)\]/) || comp.seize_reason.match(/\(([^)]+)\)/);
          if (match) caseTitle = match[1].trim();
        }
      }

      // Cek pinjaman aktif pemilik di tabel loans
      const ownerId = comp.owner_id;
      let bankLoanPrincipal = 0.0;
      let bankLoanInterest = 0.0;
      let activeLoansCount = 0;

      if (ownerId) {
        const activeLoans = await query.all("SELECT * FROM loans WHERE user_id = ? AND status IN ('ACTIVE', 'SEIZED', 'NPL', 'DEFAULT') AND remaining_amount > 0", [ownerId]);
        activeLoansCount = activeLoans.length;
        for (const loan of activeLoans) {
          const rem = loan.remaining_amount !== undefined ? loan.remaining_amount : loan.principal_amount;
          bankLoanPrincipal += Math.max(0, rem);
          const interest = loan.total_interest_ib !== undefined ? loan.total_interest_ib : (loan.principal_amount * (loan.interest_rate / 100));
          bankLoanInterest += Math.max(0, interest);
        }
      }

      const totalBankDebt = bankLoanPrincipal + bankLoanInterest;
      const totalRedemptionCost = pnafSanctionFine + totalBankDebt;
      let isOwner = Boolean(ownerId && userId && String(ownerId) === String(userId));
      if (!isOwner && userId) {
        const port = await query.get('SELECT lots_owned FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, id]);
        const sh = await query.get('SELECT percentage FROM company_shareholders WHERE user_id = ? AND company_id = ?', [userId, id]);
        const hasShares = (port && port.lots_owned > 0) || (sh && sh.percentage > 0);
        const isBotOwned = !comp.owner_id || String(comp.owner_id).startsWith('bot-user-') || String(comp.owner_id).startsWith('user-bot-');
        if (hasShares || isBotOwned) {
          isOwner = true;
        }
      }

      res.json({
        companyId: comp.id,
        companyName: comp.name,
        companySymbol: comp.symbol,
        isSeized: comp.is_seized === 1,
        seizedBy: comp.seized_by || 'Pengadilan Niaga & Arbitrase Federation (PNAF)',
        seizeReason: comp.seize_reason,
        courtCaseId: linkedCase ? linkedCase.id : null,
        caseNumber: caseNumber || '037.9703/Pdt.Sus-Bursa/2026/PNAF',
        caseTitle: caseTitle || 'Laporan Dugaan Manipulasi Pasar Bursa & Transaksi Semu',
        caseType: linkedCase ? linkedCase.case_type : (isDeficitPailit ? 'BANKRUPTCY' : 'REGULATORY'),
        plaintiffName: plaintiffName || 'Komite Pengawas Bursa OPFF',
        defendantName: defendantName || (linkedCase ? linkedCase.defendant_name : comp.name),
        hearingTime: hearingTime || (linkedCase ? linkedCase.hearing_time : '10:00 WIB'),
        courtHearingDate: hearingDate || (linkedCase ? linkedCase.court_hearing_date : 'Hari Ini'),
        isBankruptcy: isDeficitPailit,
        verdictNotes: linkedCase ? linkedCase.verdict_notes : (comp.seize_reason || 'Terbukti Bersalah'),
        claimAmountIb: linkedCase ? Number(linkedCase.claim_amount_ib || 0) : pnafSanctionFine,
        verdictAwardedAmount: pnafSanctionFine,
        ownerId,
        isOwner,
        isOwnerPlaintiffWinner,
        seizureDeadline,
        isAuctionReady,
        hoursLeft,
        pnafSanctionFine,
        bankLoanPrincipal,
        bankLoanInterest,
        totalBankDebt,
        totalRedemptionCost,
        activeLoansCount
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Eksekusi Penebusan PT Disita (Hanya Founder Sah & Belum Lewat Jatuh Tempo)
  router.post('/:id/redeem', async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [id]);
      if (!comp) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      if (comp.is_seized !== 1) {
        return res.status(400).json({ error: 'Perusahaan ini tidak dalam status disita.' });
      }

      // Validasi 1: Pemilik, Founder, atau Pemegang Saham Pengendali Konglomerat berhak menebus
      let canRedeem = Boolean(userId && comp.owner_id && String(comp.owner_id) === String(userId));
      if (!canRedeem && userId) {
        const port = await query.get('SELECT lots_owned FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, id]);
        const sh = await query.get('SELECT percentage FROM company_shareholders WHERE user_id = ? AND company_id = ?', [userId, id]);
        const hasShares = (port && port.lots_owned > 0) || (sh && sh.percentage > 0);
        const isBotOwned = !comp.owner_id || String(comp.owner_id).startsWith('bot-user-') || String(comp.owner_id).startsWith('user-bot-');
        if (hasShares || isBotOwned) {
          canRedeem = true;
        }
      }

      if (!canRedeem) {
        return res.status(403).json({
          error: 'Akses Ditolak: Anda bukan Pemilik, Founder, atau Pemegang Saham dari perseroan ini. Penebusan perseroan hanya berhak dilakukan oleh pemilik sah sebelum batas jatuh tempo lelang!'
        });
      }

      // Validasi 2: Cek Jatuh Tempo (+4 Hari Masa Tenggang)
      const now = new Date();
      let seizureDeadline = comp.seizure_deadline;
      if (!seizureDeadline && comp.seized_at) {
        seizureDeadline = new Date(new Date(comp.seized_at).getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
      }

      if (seizureDeadline && now > new Date(seizureDeadline)) {
        await query.run('UPDATE companies SET is_auction_ready = 1 WHERE id = ?', [id]);
        return res.status(400).json({
          error: 'Masa tenggang penebusan (+4 hari) telah kedaluwarsa! Hak tebus eksklusif telah hangus dan perseroan telah dialihkan ke Balai Lelang Negara PNAF.'
        });
      }

      const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'Pemain / Pemilik tidak ditemukan' });

      // Cari berkas perkara pengadilan (court_cases) yang mendasari sita
      let linkedCase = await query.get(
        `SELECT * FROM court_cases 
         WHERE (defendant_company_id = ? OR defendant_user_id = ? OR title LIKE ? OR target_asset_description LIKE ?)
           AND status IN ('VERDICT_APPROVED', 'VERDICT_PAILIT', 'VERDICT_PKPU', 'IN_TRIAL')
         ORDER BY created_at DESC LIMIT 1`,
        [comp.id, comp.owner_id || '', `%${comp.symbol}%`, `%${comp.symbol}%`]
      );
      if (!linkedCase) {
        linkedCase = await query.get(
          `SELECT * FROM court_cases 
           WHERE (defendant_company_id = ? OR defendant_user_id = ? OR title LIKE ? OR target_asset_description LIKE ?)
           ORDER BY created_at DESC LIMIT 1`,
          [comp.id, comp.owner_id || '', `%${comp.symbol}%`, `%${comp.symbol}%`]
        );
      }

      // Deteksi apakah pemohon / pemilik saat ini adalah PENGGUGAT yang memenangkan perkara
      const isOwnerPlaintiffWinner = Boolean(
        linkedCase && (
          (userId && String(linkedCase.plaintiff_user_id) === String(userId)) ||
          (comp.owner_id && String(linkedCase.plaintiff_user_id) === String(comp.owner_id))
        )
      );

      // Hitung total kewajiban persidangan & pinjaman bank
      let courtFine = 0;
      if (linkedCase) {
        courtFine = Number(linkedCase.verdict_awarded_amount || linkedCase.claim_amount_ib || 0);
      }
      if (courtFine <= 0 && comp.seize_reason) {
        const fineMatch = comp.seize_reason.match(/\[Tuntutan\/Denda:\s*IB\s*([\d\.]+)\]/i);
        if (fineMatch) {
          courtFine = Number(fineMatch[1].replace(/\./g, '')) || 0;
        }
      }
      // Denda Sanksi PNAF: Jika pemilik saat ini adalah Penggugat yang memenangkan perkara, denda = 0 (Bebas Biaya!)
      let pnafSanctionFine = courtFine > 0 ? courtFine : Math.max(100000000.0, Math.round((comp.base_price || 2000) * 50000));
      if (isOwnerPlaintiffWinner) {
        pnafSanctionFine = 0.0;
        courtFine = 0.0;
      }

      const activeLoans = await query.all("SELECT * FROM loans WHERE user_id = ? AND status IN ('ACTIVE', 'SEIZED', 'NPL', 'DEFAULT') AND remaining_amount > 0", [userId]);
      let bankLoanPrincipal = 0.0;
      let bankLoanInterest = 0.0;
      for (const loan of activeLoans) {
        const rem = loan.remaining_amount !== undefined ? loan.remaining_amount : loan.principal_amount;
        bankLoanPrincipal += Math.max(0, rem);
        const interest = loan.total_interest_ib !== undefined ? loan.total_interest_ib : (loan.principal_amount * (loan.interest_rate / 100));
        bankLoanInterest += Math.max(0, interest);
      }
      const totalBankDebt = bankLoanPrincipal + bankLoanInterest;
      const totalRedemptionCost = pnafSanctionFine + totalBankDebt;

      if (user.balance_ib < totalRedemptionCost) {
        return res.status(400).json({
          error: `Saldo Kas Pribadi tidak cukup untuk menebus perseroan. Total kewajiban: IB ${totalRedemptionCost.toLocaleString('id-ID')} (Amar Putusan Sidang: IB ${pnafSanctionFine.toLocaleString('id-ID')}, Utang Bank: IB ${totalBankDebt.toLocaleString('id-ID')}). Saldo Anda saat ini: IB ${(user.balance_ib || 0).toLocaleString('id-ID')}. Anda dapat mengajukan fasilitas pinjaman ke Bank BCF terlebih dahulu.`
        });
      }

      // Potong saldo pemain jika ada biaya penebusan / utang bank
      let newBal = user.balance_ib;
      if (totalRedemptionCost > 0) {
        newBal = user.balance_ib - totalRedemptionCost;
        await query.run('UPDATE users SET balance_ib = ? WHERE id = ?', [newBal, userId]);

        // Catat Mutasi Kas Transparan Penebusan
        await recordCashFlow({
          userId,
          accountType: 'PERSONAL',
          category: 'COURT_FINE',
          title: `Penebusan Emiten ${comp.symbol} (Pelunasan Amar Sidang PNAF & Bank)`,
          amountIb: totalRedemptionCost,
          direction: 'EXPENSE',
          balanceAfter: newBal,
          notes: `Pelunasan denda putusan sidang No. ${linkedCase?.case_number || 'PNAF'} dan utang bank untuk mencabut sitaan ${comp.name}.`
        });
      }

      // Selesaikan perkara pengadilan jika ada
      if (linkedCase) {
        const resolutionNote = isOwnerPlaintiffWinner
          ? ` [EKSEKUSI TEREALISASI: Perseroan ${comp.name} telah dipulihkan dan resmi beralih penuh ke tangan Penggugat @${user.username} sebagai Pemenang Gugatan.]`
          : ` [DILUNASI: Amar putusan perkara sebesar IB ${pnafSanctionFine.toLocaleString('id-ID')} telah dibayar lunas oleh Tergugat saat menebus perseroan ${comp.name}]`;
        await query.run(
          `UPDATE court_cases 
           SET status = 'RESOLVED',
               verdict_notes = COALESCE(verdict_notes, '') || ?,
               closed_at = ?
           WHERE id = ?`,
          [resolutionNote, new Date().toISOString(), linkedCase.id]
        );

        if (!isOwnerPlaintiffWinner) {
          // Jika ada Penggugat perseorangan (user nyata), teruskan dana ganti rugi ke Kas Pribadi Penggugat
          if (linkedCase.plaintiff_user_id) {
            await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [pnafSanctionFine, linkedCase.plaintiff_user_id]);
            await recordCashFlow({
              userId: linkedCase.plaintiff_user_id,
              accountType: 'PERSONAL',
              category: 'COURT_AWARD',
              title: `Penerimaan Pelunasan Ganti Rugi Putusan No. ${linkedCase.case_number} (${comp.symbol})`,
              amountIb: pnafSanctionFine,
              direction: 'INCOME',
              notes: `Pembayaran tunai ganti rugi perkara dari ${comp.name} saat penebusan perseroan.`
            });
            await dispatchInboxNotification(io, {
              userId: linkedCase.plaintiff_user_id,
              senderName: 'Kepaniteraan Eksekusi PNAF',
              category: 'COURT',
              title: `💰 Ganti Rugi Perkara Diterima: IB ${pnafSanctionFine.toLocaleString('id-ID')}`,
              message: `Kepaniteraan PNAF telah menerima dan meneruskan pelunasan amar putusan No. ${linkedCase.case_number} dari Tergugat (${comp.name}) sebesar IB ${pnafSanctionFine.toLocaleString('id-ID')} langsung ke Kas Pribadi Anda!`,
              referenceId: linkedCase.id,
            });
            io.emit('user:balance_updated', { userId: linkedCase.plaintiff_user_id });
          } else {
            // Setor Denda Sanksi PNAF ke Kas Negara
            const ledgerFineId = uuidv4();
            await query.run(
              `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) 
               VALUES (?, 'SEIZURE_FINE', ?, ?, 'INCOME', ?, ?)`,
              [ledgerFineId, `Penerimaan Pelunasan Denda Sitaan & Sanksi PNAF (${comp.symbol})`, pnafSanctionFine, comp.symbol, `Denda sanksi putusan No. ${linkedCase.case_number} pemulihan perseroan ${comp.name}`]
            );
          }
        }
      } else if (!isOwnerPlaintiffWinner && pnafSanctionFine > 0) {
        // Setor Denda Sanksi PNAF default ke Kas Negara
        const ledgerFineId = uuidv4();
        await query.run(
          `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) 
           VALUES (?, 'SEIZURE_FINE', ?, ?, 'INCOME', ?, ?)`,
          [ledgerFineId, `Penerimaan Pelunasan Denda Sitaan & Sanksi PNAF (${comp.symbol})`, pnafSanctionFine, comp.symbol, `Denda sanksi pemulihan hak perseroan ${comp.name}`]
        );
      }

      // Jika ada utang bank, lunaskan di database dan setor pokok+bunga ke kas negara
      if (activeLoans.length > 0) {
        for (const loan of activeLoans) {
          await query.run(
            `UPDATE loans SET status = 'PAID', remaining_amount = 0, paid_amount = principal_amount + total_interest_ib WHERE id = ?`,
            [loan.id]
          );
        }
        const ledgerBankId = uuidv4();
        await query.run(
          `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) 
           VALUES (?, 'BANK_LOAN_REPAYMENT', ?, ?, 'INCOME', ?, ?)`,
          [ledgerBankId, `Pelunasan Utang Bank Central Federation & Bunga (${comp.symbol})`, totalBankDebt, comp.symbol, `Pelunasan ${activeLoans.length} fasilitas kredit macet saat penebusan aset.`]
        );
      }

      // Cabut status sitaan dan pulihkan PT: jika pemenang gugatan, harga dan fundamental dipertahankan penuh
      const correctedPrice = isOwnerPlaintiffWinner
        ? (Number(comp.current_price) || 100)
        : Math.max(50, Math.round(Number(comp.current_price || 100) * 0.70));
      const newFundamental = isOwnerPlaintiffWinner
        ? Math.max(78, Number(comp.fundamental_score) || 80)
        : Math.max(40, Math.min(65, Math.round(Number(comp.fundamental_score || 80) * 0.65)));

      await query.run(
        `UPDATE companies 
         SET is_seized = 0, seized_by = NULL, seized_at = NULL, seizure_deadline = NULL, is_auction_ready = 0, seize_reason = NULL, 
             status = 'HEALTHY', current_price = ?, fundamental_score = ?,
             owner_id = CASE WHEN owner_id IS NULL OR owner_id LIKE 'bot-user-%' OR owner_id LIKE 'user-bot-%' THEN ? ELSE owner_id END,
             founder_name = CASE WHEN owner_id IS NULL OR owner_id LIKE 'bot-user-%' OR owner_id LIKE 'user-bot-%' THEN ? ELSE founder_name END
         WHERE id = ?`,
        [correctedPrice, newFundamental, userId, user.username, id]
      );

      // Reset tren di simulationEngine agar merintis stabil pasca koreksi
      if (simulationEngine && simulationEngine.stockTrends) {
        simulationEngine.stockTrends.set(id, isOwnerPlaintiffWinner ? 1.0 : -1.5);
      }

      // Siarkan Breaking News Penebusan Berhasil
      const newsTitle = isOwnerPlaintiffWinner
        ? `👑 SITA EKSEKUSI SELESAI: Kendali ${comp.name} (${comp.symbol}) Resmi Dipulihkan Penuh untuk Penggugat @${user.username}!`
        : `🏛️ SITAAN DICABUT: Perseroan ${comp.name} (${comp.symbol}) Resmi Bebas & Buka Suspensi!`;
      const newsContent = isOwnerPlaintiffWinner
        ? `Kepaniteraan Eksekusi PNAF resmi mencabut seluruh sitaan dan memulihkan operasional penuh perseroan ${comp.name} (${comp.symbol}) di bawah kepemilikan sah Penggugat @${user.username} tanpa dipungut denda!`
        : `Konglomerat ${user.username} telah melunasi denda amar putusan sidang PNAF dan kewajiban kredit perbankan. Sesuai dinamika bursa nyata pasca pembekuan, perdagangan ${comp.symbol} dibuka kembali pada level IB ${correctedPrice.toLocaleString('id-ID')} dan perseroan mulai merintis kembali untuk meyakinkan investor.`;

      const newsItem = {
        id: uuidv4(),
        title: newsTitle,
        content: newsContent,
        affected_sector: comp.sector,
        sentiment: isOwnerPlaintiffWinner ? 'BULLISH' : 'NEUTRAL',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );

      io.emit('market:news_broadcast', newsItem);
      io.emit('company:seized_status', { companyId: id, isSeized: false });
      io.emit('company:status_changed', { companyId: id, status: 'HEALTHY' });
      io.emit('user:balance_updated', { userId, newBalance: newBal });
      if (linkedCase) io.emit('court:case_updated', { caseId: linkedCase.id, status: 'RESOLVED' });
      io.emit('treasury:updated');

      res.json({
        success: true,
        message: isOwnerPlaintiffWinner
          ? `👑 Pemulihan Aset Berhasil! Seluruh sitaan dicabut dan kendali penuh perseroan ${comp.name} (${comp.symbol}) diserahkan kepada Anda sebagai Pemenang Gugatan tanpa dipungut denda!`
          : `🎉 Penebusan Sukses! Status perseroan ${comp.name} resmi dipulihkan dan seluruh kewajiban amar sidang serta utang bank lunas.`,
        newBalance: newBal,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
