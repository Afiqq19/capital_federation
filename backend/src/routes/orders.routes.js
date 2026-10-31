const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, recordCashFlow } = require('../db');

function createOrdersRouter(io, simulationEngine) {
  const router = express.Router();

  // POST /api/trade-orders/limit-order - Pasang antrean beli (Bid) atau antrean jual (Offer)
  router.post('/limit-order', async (req, res) => {
    try {
      const { userId, companyId, orderType, price, lots } = req.body;
      const numLots = parseInt(lots);
      const numPrice = parseInt(price);

      if (!userId || !companyId || !orderType || !numLots || numLots <= 0 || !numPrice || numPrice <= 0) {
        return res.status(400).json({ error: 'Parameter limit order tidak valid' });
      }

      if (orderType !== 'BUY' && orderType !== 'SELL') {
        return res.status(400).json({ error: 'Tipe order harus BUY atau SELL' });
      }

      const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });
      if (user.is_banned) return res.status(403).json({ error: 'Akun dibekukan' });

      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      if (!comp) return res.status(404).json({ error: 'Emiten tidak ditemukan' });

      // Sinkronkan harga SQLite jika ada pembaruan pending sebelum memasang order
      if (simulationEngine && typeof simulationEngine.flushPendingPrices === 'function') {
        await simulationEngine.flushPendingPrices();
      }

      if (comp.is_seized === 1 || comp.status === 'SUSPENDED') {
        return res.status(400).json({ error: `⛔ Saham ${comp.symbol} sedang disuspen/disita. Tidak dapat memasang antrean order!` });
      }

      const feePct = user.is_blue_chip ? 0.0005 : 0.0015;
      const orderId = uuidv4();

      if (orderType === 'BUY') {
        const totalShares = comp.total_shares || 10000000;
        const regQuotaShares = Math.min(totalShares, Math.max(Math.floor(totalShares * 0.49), comp.circulating_shares || 0));
        const maxRegularLots = Math.max(1, Math.floor(regQuotaShares / 100));
        const regQuotaPct = ((regQuotaShares / totalShares) * 100).toFixed(0);
        const existingPort = await query.get('SELECT lots_owned FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, companyId]);
        const openBuyRow = await query.get(
          "SELECT COALESCE(SUM(COALESCE(lots, target_lots, 0) - COALESCE(filled_lots, 0)), 0) as pending_lots FROM market_orders WHERE user_id = ? AND company_id = ? AND (order_type = 'BUY' OR type = 'BUY') AND status IN ('OPEN', 'PARTIAL')",
          [userId, companyId]
        );
        const currentTotalLots = (existingPort?.lots_owned || 0) + (openBuyRow?.pending_lots || 0);
        if (currentTotalLots + numLots > maxRegularLots) {
          const remainingLots = Math.max(0, maxRegularLots - currentTotalLots);
          return res.status(400).json({
            error: remainingLots > 0
              ? `Melebihi Sisa Kuota Pasar Reguler! Kuota gabungan Publik & Institusi ${comp.symbol} adalah ${maxRegularLots.toLocaleString('id-ID')} Lot (${regQuotaPct}%). Sisa yang dapat diantre beli: ${remainingLots.toLocaleString('id-ID')} Lot.`
              : `Kuota Maksimum Pasar Reguler (${regQuotaPct}% = ${maxRegularLots.toLocaleString('id-ID')} Lot) Tercapai! Lanjutkan pengambilalihan mayoritas melalui Akuisisi M&A / Pasar Negosiasi P2P di Bursa Aset.`
          });
        }

        const grossAmount = numLots * 100 * numPrice;
        const fee = Math.round(grossAmount * feePct);
        const totalEscrow = grossAmount + fee;

        if (user.balance_ib < totalEscrow) {
          return res.status(400).json({
            error: `Saldo Kas Pribadi tidak mencukupi untuk mengantre beli. Butuh IB ${totalEscrow.toLocaleString('id-ID')}`
          });
        }

        // Kunci dana ke dalam antrean orderbook (Escrow)
        await query.run('UPDATE users SET balance_ib = balance_ib - ? WHERE id = ?', [totalEscrow, userId]);
        const updatedUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [userId]);

        await query.run(
          `INSERT INTO market_orders (id, user_id, company_id, type, order_type, price_per_share, price, target_lots, lots, filled_lots, status)
           VALUES (?, ?, ?, 'BUY', 'BUY', ?, ?, ?, ?, 0, 'OPEN')`,
          [orderId, userId, companyId, numPrice, numPrice, numLots, numLots]
        );

        await recordCashFlow({
          userId,
          companyId,
          accountType: 'PERSONAL',
          category: 'ORDER_ESCROW',
          title: `Antre Beli (Bid) ${numLots} Lot ${comp.symbol} @ IB ${numPrice.toLocaleString('id-ID')}`,
          amountIb: totalEscrow,
          direction: 'EXPENSE',
          balanceAfter: updatedUser.balance_ib,
          notes: `Dana dikunci dalam antrean limit order bursa CFX menunggu ada penjual cocok.`
        });

        if (simulationEngine && typeof simulationEngine.notifyNewOrder === 'function') {
          simulationEngine.notifyNewOrder();
        }

        if (io) {
          io.emit('order:placed', {
            orderId,
            userId,
            username: user.username,
            symbol: comp.symbol,
            type: 'BUY',
            price: numPrice,
            lots: numLots
          });
        }

        return res.json({
          success: true,
          message: `Antrean Beli (Bid) ${numLots} Lot ${comp.symbol} berhasil dipasang di harga IB ${numPrice.toLocaleString('id-ID')}. Menunggu eksekusi bursa.`,
          orderId,
          newBalance: updatedUser.balance_ib
        });
      } else {
        // SELL ORDER
        const portfolio = await query.get(
          'SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?',
          [userId, companyId]
        );

        if (!portfolio || portfolio.lots_owned < numLots) {
          return res.status(400).json({
            error: `Jumlah lot yang dimiliki tidak cukup untuk dipasang antre jual. Tersedia: ${portfolio ? portfolio.lots_owned : 0} Lot.`
          });
        }

        // Kunci lot saham dari portofolio agar tidak dapat diperjualbelikan ganda
        await query.run('UPDATE portfolios SET lots_owned = lots_owned - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [numLots, portfolio.id]);

        await query.run(
          `INSERT INTO market_orders (id, user_id, company_id, type, order_type, price_per_share, price, target_lots, lots, filled_lots, status)
           VALUES (?, ?, ?, 'SELL', 'SELL', ?, ?, ?, ?, 0, 'OPEN')`,
          [orderId, userId, companyId, numPrice, numPrice, numLots, numLots]
        );

        if (simulationEngine && typeof simulationEngine.notifyNewOrder === 'function') {
          simulationEngine.notifyNewOrder();
        }

        if (io) {
          io.emit('order:placed', {
            orderId,
            userId,
            username: user.username,
            symbol: comp.symbol,
            type: 'SELL',
            price: numPrice,
            lots: numLots
          });
        }

        return res.json({
          success: true,
          message: `Antrean Jual (Offer) ${numLots} Lot ${comp.symbol} berhasil dipasang di harga IB ${numPrice.toLocaleString('id-ID')}. Menunggu pembeli yang cocok di bursa.`,
          orderId
        });
      }
    } catch (err) {
      console.error('Error creating limit order:', err);
      res.status(500).json({ error: 'Gagal memasang limit order' });
    }
  });

  // GET /api/trade-orders/my/:userId - Ambil semua antrean order milik user
  router.get('/my/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const orders = await query.all(
        `SELECT o.*, c.symbol, c.name as company_name, c.current_price
         FROM market_orders o
         JOIN companies c ON o.company_id = c.id
         WHERE o.user_id = ?
         ORDER BY 
           CASE WHEN o.status IN ('OPEN', 'PARTIAL') THEN 0 ELSE 1 END,
           o.created_at DESC LIMIT 50`,
        [userId]
      );
      res.json({ success: true, orders });
    } catch (err) {
      console.error('Error fetching user orders:', err);
      res.status(500).json({ error: 'Gagal mengambil antrean order' });
    }
  });

  // POST /api/trade-orders/cancel-order - Batalkan antrean order & kembalikan dana/lot
  router.post('/cancel-order', async (req, res) => {
    try {
      const { userId, orderId } = req.body;
      const order = await query.get('SELECT * FROM market_orders WHERE id = ? AND user_id = ?', [orderId, userId]);
      if (!order) return res.status(404).json({ error: 'Antrean order tidak ditemukan' });

      if (order.status !== 'OPEN' && order.status !== 'PARTIAL') {
        return res.status(400).json({ error: `Order tidak dapat dibatalkan karena berstatus ${order.status}` });
      }

      const orderLots = order.lots || order.target_lots || 0;
      const orderPrice = order.price || order.price_per_share || 0;
      const orderTypeVal = order.order_type || order.type || 'BUY';
      const unfilledLots = orderLots - (order.filled_lots || 0);
      if (unfilledLots <= 0) {
        return res.status(400).json({ error: 'Order sudah selesai tereksekusi seluruhnya' });
      }

      const comp = await query.get('SELECT * FROM companies WHERE id = ?', [order.company_id]);
      const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);

      if (orderTypeVal === 'BUY') {
        const feePct = user.is_blue_chip ? 0.0005 : 0.0015;
        const refundGross = unfilledLots * 100 * orderPrice;
        const refundFee = Math.round(refundGross * feePct);
        const totalRefund = refundGross + refundFee;

        await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [totalRefund, userId]);
        const updatedUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [userId]);

        await recordCashFlow({
          userId,
          companyId: order.company_id,
          accountType: 'PERSONAL',
          category: 'ORDER_REFUND',
          title: `Pengembalian Dana Batal Antre Beli (${comp ? comp.symbol : 'SAHAM'})`,
          amountIb: totalRefund,
          direction: 'INCOME',
          balanceAfter: updatedUser.balance_ib,
          notes: `Batal antre beli ${unfilledLots} Lot @ IB ${orderPrice.toLocaleString('id-ID')}. Dana escrow dikembalikan utuh.`
        });
      } else {
        // Refund lots back to portfolio
        const port = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [userId, order.company_id]);
        if (port) {
          await query.run('UPDATE portfolios SET lots_owned = lots_owned + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [unfilledLots, port.id]);
        } else {
          await query.run(
            'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), userId, order.company_id, unfilledLots, orderPrice]
          );
        }
      }

      await query.run('UPDATE market_orders SET status = "CANCELLED", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [orderId]);

      if (simulationEngine && typeof simulationEngine.notifyNewOrder === 'function') {
        simulationEngine.notifyNewOrder();
      }

      if (io) {
        io.emit('order:cancelled', { orderId, userId, symbol: comp ? comp.symbol : '' });
      }

      res.json({
        success: true,
        message: `Antrean order ${orderTypeVal} sebanyak ${unfilledLots} Lot berhasil dibatalkan. Dana/lot telah dikembalikan.`
      });
    } catch (err) {
      console.error('Error cancelling order:', err);
      res.status(500).json({ error: 'Gagal membatalkan antrean order' });
    }
  });

  // GET /api/trade-orders/active-summary/:companyId/:userId - Ringkasan antrean aktif user per harga (untuk penanda orderbook)
  router.get('/active-summary/:companyId/:userId', async (req, res) => {
    try {
      const { companyId, userId } = req.params;
      const orders = await query.all(
        `SELECT id, type, order_type, price, price_per_share, lots, target_lots, filled_lots, (COALESCE(lots, target_lots, 0) - COALESCE(filled_lots, 0)) as remaining_lots, created_at
         FROM market_orders
         WHERE company_id = ? AND user_id = ? AND status IN ('OPEN', 'PARTIAL')`,
        [companyId, userId]
      );

      const bids = {};
      const offers = {};
      let totalMyBidLots = 0;
      let totalMyOfferLots = 0;

      for (const o of (orders || [])) {
        const orderType = o.order_type || o.type || 'BUY';
        const p = Math.round(Number(o.price || o.price_per_share || 0));
        const remLots = Math.max(0, Number(o.remaining_lots || 0));
        if (remLots <= 0) continue;

        if (orderType === 'BUY') {
          bids[p] = (bids[p] || 0) + remLots;
          totalMyBidLots += remLots;
        } else {
          offers[p] = (offers[p] || 0) + remLots;
          totalMyOfferLots += remLots;
        }
      }

      res.json({
        success: true,
        companyId,
        userId,
        bids,
        offers,
        totalMyBidLots,
        totalMyOfferLots,
        orders: orders || []
      });
    } catch (err) {
      console.error('Error fetching active order summary:', err);
      res.status(500).json({ error: 'Gagal mengambil ringkasan antrean user' });
    }
  });

  return router;
}

module.exports = createOrdersRouter;
