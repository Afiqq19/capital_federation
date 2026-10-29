const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');

module.exports = function(io) {
  // 0. Daftar Kandidat Konglomerat untuk Transaksi P2P
  router.get('/candidates', async (req, res) => {
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

  // 1. Buat Penawaran Jual Saham (P2P atau Listing Global)
  router.post('/create', async (req, res) => {
    try {
      const {
        sellerUserId,
        companyId,
        buyerUserId,
        percentage,
        pricePerShare,
        allowPartial = 1
      } = req.body;
      const dealType = req.body.dealType || req.body.targetType || 'P2P';

      const pct = parseFloat(percentage);
      const price = parseFloat(pricePerShare);
      if (!pct || pct <= 0 || pct > 90) {
        return res.status(400).json({ error: 'Persentase saham harus antara 1% - 90%' });
      }
      if (!price || price <= 0) {
        return res.status(400).json({ error: 'Harga saham per lembar tidak valid' });
      }

      const seller = await query.get('SELECT * FROM users WHERE id = ?', [sellerUserId]);
      if (!seller) return res.status(404).json({ error: 'Penjual tidak ditemukan' });

      // Verifikasi emiten & kepemilikan saham
      let comp = null;
      let totalShares = 10000000;
      let currentFounderPct = 100.0;

      if (companyId === 'primary') {
        comp = await query.get('SELECT * FROM companies WHERE owner_id = ? AND is_bot = 0', [sellerUserId]);
        currentFounderPct = Math.max(0, 100.0 - (seller.founder_shares_sold || 0) - (seller.is_ipo ? 30.0 : 0.0));
      } else {
        comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
        if (comp) {
          totalShares = comp.total_shares || 10000000;
          const port = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [sellerUserId, comp.id]);
          currentFounderPct = port ? ((port.lots_owned * 100.0) / totalShares) * 100.0 : 51.0;
        }
      }

      if (!comp) return res.status(404).json({ error: 'Emiten tidak ditemukan' });

      if (pct > currentFounderPct) {
        return res.status(400).json({
          error: `Persentase penawaran (${pct}%) melebihi kepemilikan Anda saat ini (${currentFounderPct.toFixed(1)}%)`
        });
      }

      let buyerName = 'Pasar Terbuka Federasi';
      if (dealType === 'P2P' && buyerUserId) {
        const buyer = await query.get('SELECT * FROM users WHERE id = ?', [buyerUserId]);
        if (!buyer) return res.status(404).json({ error: 'Pihak pembeli tidak ditemukan' });
        buyerName = `${buyer.username} (${buyer.pt_name || 'Korporasi Swasta'})`;
      }

      const totalSharesOffered = Math.round(totalShares * (pct / 100.0));
      const grossAmount = Math.round(totalSharesOffered * price);
      const dealId = uuidv4();
      const dealNumber = `DEAL/IPMC/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

      await query.run(
        `INSERT INTO private_deals (
          id, deal_number, seller_user_id, seller_name, buyer_user_id, buyer_name,
          company_id, company_name, company_symbol, total_shares_offered, percentage_offered,
          percentage_remaining, price_per_share, gross_amount, deal_type, allow_partial,
          status, seller_signed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dealId, dealNumber, sellerUserId, `${seller.username} (${seller.pt_name || 'Pendiri'})`,
          dealType === 'P2P' ? buyerUserId : null, buyerName,
          comp.id, comp.name, comp.symbol, totalSharesOffered, pct,
          pct, price, grossAmount, dealType, allowPartial ? 1 : 0,
          dealType === 'P2P' ? 'PENDING_BUYER_SIGNATURE' : 'ACTIVE_GLOBAL',
          new Date().toISOString()
        ]
      );

      // Siarkan notifikasi jika P2P ke pembeli
      if (dealType === 'P2P' && buyerUserId) {
        io.emit(`user:deal_offer:${buyerUserId}`, {
          dealId,
          dealNumber,
          sellerName: seller.username,
          companyName: comp.name,
          percentage: pct,
          grossAmount
        });
      }

      // Siarkan breaking news jika transaksi listing besar
      if (grossAmount >= 500000000) {
        const newsItem = {
          id: uuidv4(),
          title: `📜 PENAWARAN BLOK SAHAM: ${seller.username} Melepas ${pct}% ${comp.symbol}!`,
          content: `Paket divestasi saham ${pct}% emiten ${comp.name} senilai IB ${grossAmount.toLocaleString('id-ID')} resmi didaftarkan ke Pasar Negosiasi Federasi.`,
          affected_sector: comp.sector,
          sentiment: 'NEUTRAL',
          published_at: new Date().toISOString()
        };
        await query.run(
          'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
          [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
        );
        io.emit('market:news_broadcast', newsItem);
      }

      res.json({
        success: true,
        dealId,
        dealNumber,
        message: dealType === 'P2P' 
          ? `Draft Akta Perjanjian #${dealNumber} berhasil dibuat dan dikirim ke ${buyerName}! Menunggu tanda tangan pembeli.`
          : `Paket Penawaran Saham #${dealNumber} berhasil tayang di Katalog Pasar Global!`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Ambil Katalog Penawaran Global
  router.get('/global', async (req, res) => {
    try {
      const deals = await query.all(`
        SELECT d.*, c.current_price, c.sector
        FROM private_deals d
        LEFT JOIN companies c ON d.company_id = c.id
        WHERE d.deal_type = 'GLOBAL' AND d.status = 'ACTIVE_GLOBAL' AND d.percentage_remaining > 0
        ORDER BY d.created_at DESC
      `);
      res.json(deals || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Ambil Tawaran P2P Masuk ke User
  router.get('/inbox/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const deals = await query.all(`
        SELECT d.*, c.sector
        FROM private_deals d
        LEFT JOIN companies c ON d.company_id = c.id
        WHERE d.buyer_user_id = ? AND d.status = 'PENDING_BUYER_SIGNATURE'
        ORDER BY d.created_at DESC
      `, [userId]);
      res.json(deals || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Pembeli Tanda Tangan & Bayar (Mendukung Pembelian Parsial!)
  router.post('/sign-and-pay', async (req, res) => {
    try {
      const { dealId, buyerUserId } = req.body;
      const requestedPercentage = req.body.requestedPercentage || req.body.customPercentage;
      const deal = await query.get('SELECT * FROM private_deals WHERE id = ?', [dealId]);
      if (!deal) return res.status(404).json({ error: 'Kesepakatan tidak ditemukan' });

      if (deal.status !== 'PENDING_BUYER_SIGNATURE' && deal.status !== 'ACTIVE_GLOBAL') {
        return res.status(400).json({ error: 'Status penawaran ini sudah tidak aktif / selesai' });
      }

      const buyer = await query.get('SELECT * FROM users WHERE id = ?', [buyerUserId]);
      if (!buyer) return res.status(404).json({ error: 'Data pembeli tidak valid' });

      const seller = await query.get('SELECT * FROM users WHERE id = ?', [deal.seller_user_id]);
      if (!seller) return res.status(404).json({ error: 'Data penjual tidak ditemukan' });

      // Hitung persentase yang dibeli (bisa sebagian / parsial)
      let pctToBuy = parseFloat(requestedPercentage) || deal.percentage_remaining;
      if (pctToBuy <= 0 || pctToBuy > deal.percentage_remaining) {
        return res.status(400).json({
          error: `Porsi pembelian (${pctToBuy}%) melebihi sisa saham yang ditawarkan (${deal.percentage_remaining.toFixed(1)}%)`
        });
      }

      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [deal.company_id]);
      const totalShares = comp ? (comp.total_shares || 10000000) : 10000000;
      const sharesTransferred = Math.round(totalShares * (pctToBuy / 100.0));
      const lotsTransferred = Math.max(1, Math.round(sharesTransferred / 100));
      const totalPrice = Math.round(sharesTransferred * deal.price_per_share);
      const taxSetting = await query.get("SELECT value FROM central_bank_settings WHERE key = 'trading_fee_pct'");
      const stampSetting = await query.get("SELECT value FROM central_bank_settings WHERE key = 'stamp_duty_fee_ib'");
      const tradingTaxRate = taxSetting && !isNaN(parseFloat(taxSetting.value)) ? (parseFloat(taxSetting.value) / 100.0) : 0.0015;
      const meteraiFee = stampSetting && !isNaN(parseFloat(stampSetting.value)) ? parseFloat(stampSetting.value) : 10000.0;
      const feeTax = Math.round(totalPrice * tradingTaxRate);
      const totalBuyerDeduction = totalPrice + feeTax + meteraiFee;

      if ((buyer.balance_ib || 0) < totalBuyerDeduction) {
        return res.status(400).json({
          error: `Saldo Kas Pribadi Anda (IB ${(buyer.balance_ib || 0).toLocaleString('id-ID')}) tidak mencukupi untuk pembelian IB ${totalBuyerDeduction.toLocaleString('id-ID')} (termasuk pajak & meterai).`
        });
      }

      // TRANSAKSI ATOMIK EKSEKUSI PEMINDAHAN HAK SAHAM & PEMBAYARAN
      await query.run('BEGIN TRANSACTION');
      try {
        // 1. Tarik kas pembeli
        await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [totalBuyerDeduction, buyerUserId]);

        // 2. Setor uang bersih ke kas pribadi penjual
        await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [totalPrice, seller.id]);

        // 3. Potong persentase pendiri penjual
        await query.run('UPDATE users SET founder_shares_sold = COALESCE(founder_shares_sold, 0) + ? WHERE id = ?', [pctToBuy, seller.id]);
        if (comp) {
          await query.run('UPDATE companies SET founder_shares_sold = COALESCE(founder_shares_sold, 0) + ? WHERE id = ?', [pctToBuy, comp.id]);
        }

        // 4. Tambah portofolio saham ke pembeli
        const existingPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [buyerUserId, comp.id]);
        if (existingPort) {
          await query.run('UPDATE portfolios SET lots_owned = lots_owned + ? WHERE id = ?', [lotsTransferred, existingPort.id]);
        } else {
          await query.run(
            'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), buyerUserId, comp.id, lotsTransferred, deal.price_per_share]
          );
        }

        // 5. Kurangi sisa penawaran di deal
        const newRemaining = Math.max(0, deal.percentage_remaining - pctToBuy);
        const newStatus = newRemaining <= 0.05 ? 'COMPLETED' : deal.status;
        await query.run(
          `UPDATE private_deals 
           SET percentage_remaining = ?, status = ?, buyer_signed_at = COALESCE(buyer_signed_at, ?)
           WHERE id = ?`,
          [newRemaining, newStatus, new Date().toISOString(), deal.id]
        );

        // 6. Terbitkan Akta Resmi Perjanjian Jual Beli Saham (Deed)
        const deedId = uuidv4();
        const deedNumber = `AKTA/PNAF/${new Date().getFullYear()}/${Math.floor(10000 + Math.random() * 90000)}`;
        await query.run(
          `INSERT INTO deal_deeds (
            id, deed_number, deal_id, seller_user_id, seller_name, buyer_user_id, buyer_name,
            company_id, company_name, company_symbol, percentage_transferred, shares_transferred,
            price_per_share, total_price_ib, meterai_status, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            deedId, deedNumber, deal.id, seller.id, `${seller.username} (${seller.pt_name || 'Pendiri'})`,
            buyer.id, `${buyer.username} (${buyer.pt_name || 'Investor'})`,
            comp.id, comp.name, comp.symbol, pctToBuy, sharesTransferred,
            deal.price_per_share, totalPrice, `LUNAS_IB_${Math.round(meteraiFee)}`, 'ACTIVE'
          ]
        );

        // 7. Catat Pajak & Bea Meterai ke Kas Negara (State Treasury)
        await query.run(
          'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), 'TRANSACTION_TAX', `Pajak Transaksi Jual-Beli Saham ${(tradingTaxRate * 100).toFixed(2)}% Akta #${deedNumber}`, feeTax, 'INCOME', deedNumber, `Dipungut dari pembeli ${buyer.username}`]
        );
        await query.run(
          'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [uuidv4(), 'METERAI_FEE', `Bea Meterai Digital Korporasi Akta #${deedNumber}`, meteraiFee, 'INCOME', deedNumber, `Meterai Digital Lunas (IB ${meteraiFee.toLocaleString('id-ID')})`]
        );

        await query.run('COMMIT');

        // Emit update treasury ke Web Admin & Mobile
        if (io) {
          io.emit('treasury:updated');
        }

        // Siarkan Breaking News ke seluruh bursa
        const newsItem = {
          id: uuidv4(),
          title: `📜 AKTA JUAL-BELI SAHAM SAH: ${buyer.username} Mengakuisisi ${pctToBuy.toFixed(1)}% ${comp.symbol}!`,
          content: `Peralihan ${pctToBuy.toFixed(1)}% saham ${comp.name} dari ${seller.username} ke ${buyer.username} resmi disahkan Notariat PNAF senilai IB ${totalPrice.toLocaleString('id-ID')} (Akta No: ${deedNumber}).`,
          affected_sector: comp.sector,
          sentiment: 'BULLISH',
          published_at: new Date().toISOString()
        };
        await query.run(
          'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
          [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
        );
        io.emit('market:news_broadcast', newsItem);

        res.json({
          success: true,
          deedNumber,
          pctTransferred: pctToBuy,
          totalPrice,
          remainingOfferedPct: newRemaining,
          message: `🎉 Akta Notaris #${deedNumber} Sah Ditandatangani! ${pctToBuy.toFixed(1)}% Saham resmi beralih ke portofolio Anda.`
        });
      } catch (e) {
        await query.run('ROLLBACK');
        throw e;
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Tolak Tawaran P2P
  router.post('/reject', async (req, res) => {
    try {
      const { dealId, userId, reason } = req.body;
      const deal = await query.get('SELECT * FROM private_deals WHERE id = ?', [dealId]);
      if (!deal) return res.status(404).json({ error: 'Kesepakatan tidak ditemukan' });

      await query.run('UPDATE private_deals SET status = "CANCELLED" WHERE id = ?', [dealId]);
      res.json({ success: true, message: 'Tawaran berhasil ditolak / dibatalkan.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Ambil Brankas Akta Tersimpan Milik User
  router.get('/deeds/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const deeds = await query.all(`
        SELECT * FROM deal_deeds
        WHERE seller_user_id = ? OR buyer_user_id = ?
        ORDER BY created_at DESC
      `, [userId, userId]);
      res.json(deeds || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Ambil Seluruh Akta untuk Web Admin Deed Registry
  router.get('/all-deeds', async (req, res) => {
    try {
      const deeds = await query.all('SELECT * FROM deal_deeds ORDER BY created_at DESC');
      res.json(deeds || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Gugat Wanprestasi ke PNAF dari Akta
  router.post('/dispute-to-pnaf', async (req, res) => {
    try {
      const { deedId, plaintiffUserId, disputeReason } = req.body;
      const deed = await query.get('SELECT * FROM deal_deeds WHERE id = ?', [deedId]);
      if (!deed) return res.status(404).json({ error: 'Akta perjanjian tidak ditemukan' });

      const plaintiff = await query.get('SELECT * FROM users WHERE id = ?', [plaintiffUserId]);
      if (!plaintiff) return res.status(404).json({ error: 'Data penggugat tidak valid' });

      // Cek biaya registrasi panitera IB 250.000
      if ((plaintiff.balance_ib || 0) < 250000) {
        return res.status(400).json({ error: 'Kas Pribadi Anda tidak cukup untuk biaya panitera IB 250.000' });
      }

      await query.run('UPDATE users SET balance_ib = balance_ib - 250000 WHERE id = ?', [plaintiffUserId]);

      // Catat ke kas negara
      await query.run(
        'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [uuidv4(), 'PNAF_FILING_FEE', `Biaya Pendaftaran Gugatan Wanprestasi Akta #${deed.deed_number}`, 250000, 'INCOME', deed.deed_number, `Diajukan oleh ${plaintiff.username}`]
      );

      // Hitung tuntutan ganti rugi penalti 20% nilai akta
      const penaltyAmount = Math.round(deed.total_price_ib * 0.20);
      const isPlaintiffSeller = plaintiffUserId === deed.seller_user_id;
      const defendantName = isPlaintiffSeller ? deed.buyer_name : deed.seller_name;
      const defendantUserId = isPlaintiffSeller ? deed.buyer_user_id : deed.seller_user_id;

      const caseId = uuidv4();
      const caseNumber = `0${Math.floor(10 + Math.random() * 90)}/Pdt.Sus-Wanprestasi/${new Date().getFullYear()}/PNAF`;

      await query.run(
        `INSERT INTO court_cases (
          id, case_number, case_type, title, plaintiff_name, defendant_name,
          defendant_user_id, claim_amount_ib, court_hearing_date, status, verdict_notes,
          plaintiff_user_id, hearing_time, room_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          caseId, caseNumber, 'DISPUTE', `Gugatan Wanprestasi & Pelanggaran Klausul Akta #${deed.deed_number}`,
          `${plaintiff.username} (${plaintiff.pt_name || 'Penggugat'})`, defendantName,
          defendantUserId, penaltyAmount, 'Hari Ini, 10:00 WIB', 'IN_TRIAL',
          `Penggugat menuntut denda penalti wanprestasi 20% (IB ${penaltyAmount.toLocaleString('id-ID')}) atas pembatalan sepihak akta.`,
          plaintiffUserId, '10:00 WIB', 'WAITING_PRESENCE'
        ]
      );

      // Update status akta
      await query.run('UPDATE deal_deeds SET status = "BREACHED_WANPRESTASI" WHERE id = ?', [deedId]);

      // Berita Breaking News
      const newsItem = {
        id: uuidv4(),
        title: `🚨 GUGATAN WANPRESTASI PNAF: ${plaintiff.username} Menggugat ${defendantName}!`,
        content: `Perkara No. ${caseNumber} resmi terdaftar. Penggugat menuntut sita ganti rugi penalti wanprestasi IB ${penaltyAmount.toLocaleString('id-ID')} atas Akta #${deed.deed_number}.`,
        affected_sector: 'Semua Sektor',
        sentiment: 'BEARISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );
      io.emit('market:news_broadcast', newsItem);

      res.json({
        success: true,
        caseId,
        caseNumber,
        penaltyAmount,
        message: `⚖️ Gugatan Wanprestasi #${caseNumber} Resmi Didaftarkan ke PNAF Federasi! Tuntutan Penalti: IB ${penaltyAmount.toLocaleString('id-ID')}`
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
