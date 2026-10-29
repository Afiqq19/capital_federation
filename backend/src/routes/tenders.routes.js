const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, recordCashFlow } = require('../db');

module.exports = function(io) {
  // 1. Ambil Katalog Seluruh Tender Proyek Nasional
  router.get('/list', async (req, res) => {
    try {
      const { userId } = req.query;
      let querySql = `
        SELECT t.*, 
               (SELECT COUNT(*) FROM tender_bids b WHERE b.tender_id = t.id) as total_bids
        FROM government_tenders t
        ORDER BY CASE t.status WHEN 'OPEN' THEN 1 WHEN 'EVALUATION' THEN 2 ELSE 3 END, t.created_at DESC
      `;
      let params = [];
      if (userId) {
        querySql = `
          SELECT t.*, 
                 (SELECT COUNT(*) FROM tender_bids b WHERE b.tender_id = t.id) as total_bids,
                 (SELECT b.id FROM tender_bids b WHERE b.tender_id = t.id AND b.user_id = ? LIMIT 1) as my_bid_id,
                 (SELECT b.company_name FROM tender_bids b WHERE b.tender_id = t.id AND b.user_id = ? LIMIT 1) as my_bid_company,
                 (SELECT b.bid_score FROM tender_bids b WHERE b.tender_id = t.id AND b.user_id = ? LIMIT 1) as my_bid_score,
                 (SELECT b.bid_pitch FROM tender_bids b WHERE b.tender_id = t.id AND b.user_id = ? LIMIT 1) as my_bid_pitch,
                 (SELECT b.status FROM tender_bids b WHERE b.tender_id = t.id AND b.user_id = ? LIMIT 1) as my_bid_status
          FROM government_tenders t
          ORDER BY CASE t.status WHEN 'OPEN' THEN 1 WHEN 'EVALUATION' THEN 2 ELSE 3 END, t.created_at DESC
        `;
        params = [userId, userId, userId, userId, userId];
      }
      const tenders = await query.all(querySql, params);
      res.json(tenders || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Ambil Detail Tender Beserta Seluruh Proposal Lamaran
  router.get('/:tenderId', async (req, res) => {
    try {
      const { tenderId } = req.params;
      const tender = await query.get('SELECT * FROM government_tenders WHERE id = ?', [tenderId]);
      if (!tender) return res.status(404).json({ error: 'Tender tidak ditemukan' });

      const bids = await query.all(`
        SELECT b.*, u.username as owner_username, c.symbol as company_symbol, c.fundamental_score
        FROM tender_bids b
        JOIN users u ON b.user_id = u.id
        LEFT JOIN companies c ON b.company_id = c.id
        WHERE b.tender_id = ?
        ORDER BY b.bid_score DESC, b.created_at ASC
      `, [tenderId]);

      res.json({
        ...tender,
        bids: bids || []
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. PT Pemain Mengajukan Lamaran Proposal Tender (Bid)
  router.post('/bid', async (req, res) => {
    try {
      const { tenderId, userId, companyId, bidPitch } = req.body;
      if (!tenderId || !userId) {
        return res.status(400).json({ error: 'Tender ID dan User ID wajib disertakan' });
      }

      const tender = await query.get('SELECT * FROM government_tenders WHERE id = ?', [tenderId]);
      if (!tender) return res.status(404).json({ error: 'Tender proyek tidak ditemukan' });
      if (tender.status !== 'OPEN') {
        return res.status(400).json({ error: `Pengajuan tender telah ditutup (Status: ${tender.status})` });
      }

      const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'Data user tidak ditemukan' });

      // Ambil data PT (baik PT utama user atau anak perusahaan yang dipilih)
      let comp = null;
      if (companyId && companyId !== 'primary') {
        comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      }
      if (!comp && user.has_pt) {
        comp = await query.get('SELECT * FROM companies WHERE owner_id = ? OR name = ? LIMIT 1', [userId, user.pt_name]);
      }

      // Validasi Status Sitaan: PT yang disita TIDAK boleh mengikuti tender
      if (comp && (comp.is_seized === 1 || comp.status === 'SEIZED')) {
        return res.status(400).json({
          error: `Perseroan "${comp.name}" sedang berstatus DISITA oleh Negara/Pengadilan. PT yang disita dilarang keras mengikuti lelang tender proyek pemerintah!`
        });
      }

      // Validasi Kesesuaian Sektor Industri
      const compSector = comp ? (comp.sector || 'Teknologi') : (user.sector || 'Teknologi');
      const normalizeSector = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
      const tenderSecNorm = normalizeSector(tender.sector);
      const compSecNorm = normalizeSector(compSector);

      const isSectorMatched = 
        tenderSecNorm === 'semua' || 
        tenderSecNorm === 'umum' || 
        compSecNorm === tenderSecNorm ||
        compSecNorm.includes(tenderSecNorm) ||
        tenderSecNorm.includes(compSecNorm);

      if (!isSectorMatched) {
        return res.status(400).json({
          error: `Perseroan Anda (${comp ? comp.name : user.pt_name}) terdaftar di sektor "${compSector}". Proyek tender ini mewajibkan perseroan di sektor "${tender.sector}".`
        });
      }

      // Validasi Kebutuhan Minimum Kas PT
      const minCap = parseFloat(tender.min_cap_requirement_ib || 25000000.0);
      const compBalance = comp ? (comp.company_balance_ib || 0.0) : (user.company_balance_ib || 0.0);
      if (compBalance < minCap) {
        return res.status(400).json({
          error: `Kas Perseroan belum memenuhi syarat modal kas proyek (Dibutuhkan: IB ${minCap.toLocaleString('id-ID')}, Kas PT: IB ${compBalance.toLocaleString('id-ID')}).`
        });
      }

      const ptLevel = Math.max(user.pt_level || 1, (comp && comp.pt_level) || 1);
      const rdLevel = Math.max(user.rd_level || 1, (comp && comp.rd_level) || 1);
      const capacityLevel = Math.max(user.capacity_level || 1, (comp && comp.capacity_level) || 1);
      const staffCount = capacityLevel * 5; // Estimasi staf

      // Validasi Kualifikasi Minimum (Hanya jika admin menentukan level > 1)
      const requiredPtLevel = parseInt(tender.min_pt_level || 1, 10);
      const requiredRdLevel = parseInt(tender.min_rd_level || 1, 10);

      if (requiredPtLevel > 1 && ptLevel < requiredPtLevel) {
        return res.status(400).json({
          error: `Kualifikasi tidak memenuhi syarat. Tender ini mewajibkan Perseroan minimum Level ${requiredPtLevel} (Level Anda saat ini: ${ptLevel}).`
        });
      }
      if (requiredRdLevel > 1 && rdLevel < requiredRdLevel) {
        return res.status(400).json({
          error: `Tingkat R&D Perseroan belum memadai. Dibutuhkan Riset R&D minimum Level ${requiredRdLevel} (Level Anda: ${rdLevel}).`
        });
      }

      // Cek apakah PT ini sudah pernah submit bid untuk tender ini
      const existingBid = await query.get(
        'SELECT id FROM tender_bids WHERE tender_id = ? AND user_id = ?',
        [tenderId, userId]
      );
      if (existingBid) {
        return res.status(400).json({ error: 'Anda sudah pernah mengajukan proposal untuk proyek tender ini.' });
      }

      // Hitung Skor Kualifikasi Otomatis (Score 0 - 100)
      const fundamentalScore = comp ? (comp.fundamental_score || 70.0) : 70.0;
      const calculatedScore = Math.min(
        99.5,
        Math.round(((ptLevel * 12) + (rdLevel * 10) + (capacityLevel * 6) + (fundamentalScore * 0.4)) * 10) / 10
      );

      const bidId = uuidv4();
      const compName = comp ? comp.name : (user.pt_name || `PT. ${user.username} Niaga`);
      const targetCompId = comp ? comp.id : (user.id);

      await query.run(
        `INSERT INTO tender_bids (id, tender_id, company_id, user_id, company_name, pt_level, rd_level, capacity_staff, bid_pitch, bid_score, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')`,
        [bidId, tenderId, targetCompId, userId, compName, ptLevel, rdLevel, staffCount, bidPitch || 'Proposal Strategis Pelaksanaan Proyek Nasional', calculatedScore]
      );

      if (io) {
        io.emit('tender:bid_submitted', {
          tenderId,
          bidId,
          companyName: compName,
          bidScore: calculatedScore
        });
      }

      res.json({
        success: true,
        message: `Proposal tender berhasil diajukan! Skor kualifikasi teknis perseroan Anda: ${calculatedScore}/100. Keputusan pemenang akan ditetapkan oleh Panitia Pengadaan Negara.`,
        bidId,
        bidScore: calculatedScore
      });
    } catch (err) {
      console.error('Submit tender bid error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Web Admin: Buka Tender Proyek Baru dari Kas Negara
  router.post('/admin/create', async (req, res) => {
    try {
      const {
        tenderCode, title, sector, description, contractValueIb,
        minPtLevel, minRdLevel, minCapacityStaff, minCapRequirementIb, deadlineDays
      } = req.body;
      if (!title || !sector || !contractValueIb) {
        return res.status(400).json({ error: 'Judul, Sektor, dan Nilai Kontrak wajib diisi' });
      }

      const id = uuidv4();
      const code = (tenderCode || `TDR/${sector.substring(0, 4).toUpperCase()}/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`).trim();
      const value = parseFloat(contractValueIb);
      const days = parseInt(deadlineDays || 3, 10);
      const deadline = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await query.run(
        `INSERT INTO government_tenders (
          id, tender_code, title, sector, description, contract_value_ib,
          min_pt_level, min_rd_level, min_capacity_staff, min_cap_requirement_ib,
          status, deadline_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
        [
          id, code, title, sector,
          description || `Pengadaan Proyek Strategis Nasional untuk Sektor ${sector}`,
          value,
          parseInt(minPtLevel || 2, 10),
          parseInt(minRdLevel || 2, 10),
          parseInt(minCapacityStaff || 10, 10),
          parseFloat(minCapRequirementIb || 25000000.0),
          deadline
        ]
      );

      // Siarkan Breaking News ke seluruh bursa
      const newsItem = {
        id: uuidv4(),
        title: `🏗️ PENGUMUMAN TENDER NASIONAL: Proyek Senilai IB ${value.toLocaleString('id-ID')} Dibuka!`,
        content: `Kementerian Pengadaan dan Investasi Negara resmi membuka tender lelang proyek ${title} (Kode: ${code}). Seluruh perseroan sektor ${sector} dipersilakan mengajukan proposal.`,
        affected_sector: sector,
        sentiment: 'BULLISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );

      if (io) {
        io.emit('tender:announced', { id, code, title, sector, contractValueIb: value, deadline });
        io.emit('market:news_broadcast', newsItem);
      }

      res.json({
        success: true,
        message: `Tender Proyek Nasional #${code} berhasil diterbitkan ke publik!`,
        tender: { id, code, title, sector, contractValueIb: value, deadline }
      });
    } catch (err) {
      console.error('Create tender error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Web Admin: Tetapkan Pemenang Kontrak Tender & Cairkan Dana Kas Negara
  router.post('/admin/award', async (req, res) => {
    try {
      const { tenderId, bidId } = req.body;
      if (!tenderId || !bidId) {
        return res.status(400).json({ error: 'Tender ID dan Bid ID pemenang wajib disertakan' });
      }

      const tender = await query.get('SELECT * FROM government_tenders WHERE id = ?', [tenderId]);
      if (!tender) return res.status(404).json({ error: 'Tender tidak ditemukan' });
      if (tender.status === 'AWARDED' || tender.status === 'COMPLETED') {
        return res.status(400).json({ error: 'Tender ini sudah memiliki pemenang yang ditetapkan' });
      }

      const bid = await query.get('SELECT * FROM tender_bids WHERE id = ? AND tender_id = ?', [bidId, tenderId]);
      if (!bid) return res.status(404).json({ error: 'Proposal bid pemenang tidak ditemukan' });

      const contractValue = tender.contract_value_ib;

      // Eksekusi Pemenang: Cairkan Dana Kontrak ke Kas PT Pemenang & Catat Kas Negara
      await query.run('BEGIN TRANSACTION');
      try {
        // 1. Update status proposal
        await query.run('UPDATE tender_bids SET status = "REJECTED" WHERE tender_id = ? AND id != ?', [tenderId, bidId]);
        await query.run('UPDATE tender_bids SET status = "ACCEPTED" WHERE id = ?', [bidId]);

        // 2. Update status tender
        await query.run(
          `UPDATE government_tenders 
           SET status = "AWARDED", winner_company_id = ?, winner_user_id = ?, winner_company_name = ?
           WHERE id = ?`,
          [bid.company_id, bid.user_id, bid.company_name, tenderId]
        );

        // 3. Masukkan uang kontrak ke Kas Perusahaan (company_balance_ib)
        await query.run(
          'UPDATE users SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?',
          [contractValue, bid.user_id]
        );

        // 4. Catat arus kas perseroan
        await recordCashFlow({
          userId: bid.user_id,
          companyId: bid.company_id,
          accountType: 'COMPANY',
          category: 'GOVERNMENT_TENDER_AWARD',
          title: `Pencairan Kontrak Mega-Proyek Tender ${tender.tender_code}`,
          amountIb: contractValue,
          direction: 'INCOME',
          notes: `Pemenang Kontrak Resmi: ${tender.title}`
        });

        // 5. Catat pengeluaran dari Brankas Kas Negara (State Treasury)
        await query.run(
          `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
           VALUES (?, 'TENDER_DISBURSEMENT', ?, ?, 'EXPENSE', ?, ?)`,
          [
            uuidv4(),
            `Pencairan Pembayaran Mega-Tender Proyek ${tender.tender_code}`,
            contractValue,
            tender.tender_code,
            `Diberikan kepada pemenang lelang: ${bid.company_name} (${tender.title})`
          ]
        );

        // 6. Naikkan fundamental score PT pemenang sebesar +5.0 poin
        if (bid.company_id) {
          await query.run(
            'UPDATE companies SET fundamental_score = MIN(99.0, COALESCE(fundamental_score, 70) + 5.0) WHERE id = ?',
            [bid.company_id]
          );
        }

        await query.run('COMMIT');

        // Siarkan Breaking News Kemenangan Tender ke seluruh pasar
        const newsItem = {
          id: uuidv4(),
          title: `🏆 PEMENANG TENDER DIUMUMKAN: ${bid.company_name} Raih Kontrak IB ${contractValue.toLocaleString('id-ID')}!`,
          content: `Panitia Pengadaan Negara resmi menetapkan ${bid.company_name} sebagai kontraktor utama proyek ${tender.title} senilai IB ${contractValue.toLocaleString('id-ID')}. Fundamental perseroan diproyeksikan melonjak kuat!`,
          affected_sector: tender.sector,
          sentiment: 'BULLISH',
          published_at: new Date().toISOString()
        };
        await query.run(
          'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
          [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
        );

        if (io) {
          io.emit('tender:awarded', {
            tenderId,
            tenderCode: tender.tender_code,
            title: tender.title,
            winnerCompanyName: bid.company_name,
            winnerUserId: bid.user_id,
            contractValueIb: contractValue
          });
          io.emit('treasury:updated');
          io.emit('market:news_broadcast', newsItem);
        }

        res.json({
          success: true,
          message: `Selamat! Kontrak proyek #${tender.tender_code} senilai IB ${contractValue.toLocaleString('id-ID')} resmi diberikan kepada ${bid.company_name}. Dana telah cair langsung ke rekening Kas PT.`,
          tenderCode: tender.tender_code,
          winnerCompanyName: bid.company_name,
          contractValueIb: contractValue
        });
      } catch (awardErr) {
        await query.run('ROLLBACK');
        throw awardErr;
      }
    } catch (err) {
      console.error('Award tender error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Web Admin: Update / Edit Tender
  router.put('/admin/:tenderId', async (req, res) => {
    try {
      const { tenderId } = req.params;
      const {
        title, sector, description, contractValueIb,
        minPtLevel, minRdLevel, minCapacityStaff, minCapRequirementIb,
        status, deadlineDays
      } = req.body;

      const tender = await query.get('SELECT * FROM government_tenders WHERE id = ?', [tenderId]);
      if (!tender) return res.status(404).json({ error: 'Tender tidak ditemukan' });

      let deadline = tender.deadline_at;
      if (deadlineDays) {
        deadline = new Date(Date.now() + parseInt(deadlineDays, 10) * 24 * 60 * 60 * 1000).toISOString();
      }

      await query.run(
        `UPDATE government_tenders
         SET title = COALESCE(?, title),
             sector = COALESCE(?, sector),
             description = COALESCE(?, description),
             contract_value_ib = COALESCE(?, contract_value_ib),
             min_pt_level = COALESCE(?, min_pt_level),
             min_rd_level = COALESCE(?, min_rd_level),
             min_capacity_staff = COALESCE(?, min_capacity_staff),
             min_cap_requirement_ib = COALESCE(?, min_cap_requirement_ib),
             status = COALESCE(?, status),
             deadline_at = COALESCE(?, deadline_at)
         WHERE id = ?`,
        [
          title || null,
          sector || null,
          description || null,
          contractValueIb ? parseFloat(contractValueIb) : null,
          minPtLevel ? parseInt(minPtLevel, 10) : null,
          minRdLevel ? parseInt(minRdLevel, 10) : null,
          minCapacityStaff ? parseInt(minCapacityStaff, 10) : null,
          minCapRequirementIb ? parseFloat(minCapRequirementIb) : null,
          status || null,
          deadline,
          tenderId
        ]
      );

      if (io) {
        io.emit('tender:updated', { tenderId });
      }

      res.json({ success: true, message: `Paket Tender #${tender.tender_code} berhasil diperbarui!` });
    } catch (err) {
      console.error('Update tender error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Web Admin: Hapus Tender
  router.delete('/admin/:tenderId', async (req, res) => {
    try {
      const { tenderId } = req.params;
      const tender = await query.get('SELECT * FROM government_tenders WHERE id = ?', [tenderId]);
      if (!tender) return res.status(404).json({ error: 'Tender tidak ditemukan' });

      await query.run('DELETE FROM tender_bids WHERE tender_id = ?', [tenderId]);
      await query.run('DELETE FROM government_tenders WHERE id = ?', [tenderId]);

      if (io) {
        io.emit('tender:deleted', { tenderId });
      }

      res.json({ success: true, message: `Paket Tender #${tender.tender_code} berhasil dihapus!` });
    } catch (err) {
      console.error('Delete tender error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
