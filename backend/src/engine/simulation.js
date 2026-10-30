const { v4: uuidv4 } = require('uuid');
const { query, recordCashFlow } = require('../db');
const { BOT_ROSTER } = require('../botData');

class MarketSimulationEngine {
  constructor(io) {
    this.io = io;
    this.timer = null;
    this.dividendTimer = null;
    this.companyRevenueTimer = null;
    this.tickCount = 0;

    // Composite Index (IPMC / IHSG) State
    this.ipmcBase = 7350.00;
    this.ipmcPoints = 7385.40;
    this.ipmcOpen = 7350.00;
    this.ipmcHigh = 7412.80;
    this.ipmcLow = 7338.20;
    this.ipmcChangePts = 35.40;
    this.ipmcChangePct = 0.48;

    // Intraday Statistics
    this.totalLotsTraded = 1845200;
    this.totalTurnoverIb = 42850000000; // 42.85 Miliar IB
    this.tradeFrequency = 98450;
    this.foreignBuyIb = 4580000000;   // 4.58 Miliar IB
    this.foreignSellIb = 3210000000;  // 3.21 Miliar IB
    this.foreignNetIb = 1370000000;   // +1.37 Miliar IB

    this.upCount = 52;
    this.flatCount = 12;
    this.downCount = 37;

    // Running Trades real-time buffer
    this.runningTrades = [];

    // Intraday History for the IHSG/IPMC chart
    this.ipmcHistory = this._generateInitialIpmcHistory();

    // Cache of individual stock target drifts
    this.stockTrends = new Map();
  }

  _generateInitialIpmcHistory(targetPoints = 7385.40, openPoints = 7350.00) {
    const history = [];
    const pointsCount = 36;
    const startTime = new Date();
    startTime.setHours(9, 0, 0, 0);

    for (let i = 0; i < pointsCount; i++) {
      const stepTime = new Date(startTime.getTime() + i * 11 * 60 * 1000); // 11-minute steps
      const hh = String(stepTime.getHours()).padStart(2, '0');
      const mm = String(stepTime.getMinutes()).padStart(2, '0');
      
      const t = i / (pointsCount - 1);
      // Hermite smooth interpolation between open and target
      const smoothT = t * t * (3 - 2 * t);
      const trend = openPoints + (targetPoints - openPoints) * smoothT;
      const wave = Math.sin(t * Math.PI * 4.2) * 18.0;
      const jitter = (Math.sin(i * 13.7) * 6.5);
      const curr = parseFloat((trend + wave + jitter).toFixed(2));
      
      history.push({
        time: `${hh}:${mm}`,
        points: i === pointsCount - 1 ? targetPoints : curr,
      });
    }

    return history;
  }

  async start() {
    console.log('🚀 Starting Realistic Capital Federation (CFX) Market & Index Simulation Engine...');
    await this.ensureDiverseMarketDistribution();

    // Initialize initial tick to calculate accurate composite index
    await this.tick();
    this.ipmcHistory = this._generateInitialIpmcHistory(this.ipmcPoints, this.ipmcOpen);
    this.ipmcHigh = Math.max(...this.ipmcHistory.map(p => p.points), this.ipmcPoints);
    this.ipmcLow = Math.min(...this.ipmcHistory.map(p => p.points), this.ipmcPoints);

    // Initialize real running trades from DB
    await this.initRunningTrades();

    this.timer = setInterval(() => this.tick(), 4000); // 4-second ticker
    this.dividendTimer = setInterval(() => this.distributeDividends(), 1800000); // Dividends every 30 mins
    await this.updateRevenueInterval();
    // Eksekusi siklus pertama segera setelah engine aktif (3 detik) agar pemain langsung melihat dinamika arus kas
    setTimeout(() => this.generateCompanyRevenue(), 3000);
  }

  async updateRevenueInterval() {
    try {
      const row = await query.get("SELECT value FROM central_bank_settings WHERE key = 'cash_flow_interval_minutes'");
      const minutes = row && parseInt(row.value) > 0 ? parseInt(row.value) : 25; // Default 25 menit
      const intervalMs = minutes * 60 * 1000;
      
      if (this.companyRevenueTimer) {
        clearInterval(this.companyRevenueTimer);
      }
      this.companyRevenueIntervalMinutes = minutes;
      this.companyRevenueTimer = setInterval(() => this.generateCompanyRevenue(), intervalMs);
      console.log(`⏱️ Arus Kas Perusahaan diset berjalan setiap ${minutes} Menit (${intervalMs} ms)`);
    } catch (e) {
      console.error('Error updating revenue interval:', e.message);
    }
  }

  async initRunningTrades() {
    try {
      const dbTrades = await query.all(`
        SELECT t.id, t.type, t.lots, t.price_per_share as price, t.created_at,
               c.symbol, u.username
        FROM transactions t
        JOIN companies c ON t.company_id = c.id
        JOIN users u ON t.user_id = u.id
        WHERE t.type IN ('BUY', 'SELL')
        ORDER BY t.created_at DESC LIMIT 30
      `);

      if (dbTrades && dbTrades.length > 0) {
        this.runningTrades = dbTrades.map(t => {
          const d = new Date(t.created_at);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          const ss = String(d.getSeconds()).padStart(2, '0');
          return {
            id: t.id,
            time: `${hh}:${mm}:${ss}`,
            symbol: t.symbol,
            price: t.price,
            lots: t.lots,
            type: t.type,
            username: t.username,
            isUser: true,
            timestamp: t.created_at,
          };
        });
      }
    } catch (e) {
      console.error('Error initializing running trades from DB:', e);
    }
  }

  recordTrade(tradeItem) {
    this.runningTrades.unshift(tradeItem);
    if (this.runningTrades.length > 150) {
      // Find oldest non-user trade to pop, preserving user trades
      let removeIdx = -1;
      for (let i = this.runningTrades.length - 1; i >= 0; i--) {
        if (!this.runningTrades[i].isUser) {
          removeIdx = i;
          break;
        }
      }
      if (removeIdx !== -1) {
        this.runningTrades.splice(removeIdx, 1);
      } else {
        this.runningTrades.pop();
      }
    }
    this.io.emit('market:running_trade', tradeItem);
  }

  getRunningTrades() {
    return this.runningTrades;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.dividendTimer) clearInterval(this.dividendTimer);
    if (this.companyRevenueTimer) clearInterval(this.companyRevenueTimer);
  }

  // Ensure every company has a unique, distinct percentage change (no uniform +80% sync!)
  async ensureDiverseMarketDistribution() {
    try {
      const companies = await query.all("SELECT * FROM companies WHERE (listing_status = 'LISTED' OR (listing_status IS NULL AND is_bot = 1)) AND (listing_status != 'PRE_IPO' AND listing_status != 'UNLISTED')");
      if (!companies || companies.length === 0) return;

      // Check if market is stuck in uniform +80% state
      const count80 = companies.filter(c => {
        const ref = c.prev_close > 0 ? c.prev_close : c.base_price;
        const pct = ((c.current_price - ref) / ref) * 100;
        return pct >= 75.0;
      }).length;

      const needsPriceInit = companies.some(c => !c.prev_close || c.prev_close <= 0 || !c.current_price || c.current_price <= 0);

      if (count80 > 8 || needsPriceInit || this.stockTrends.size === 0) {
        const shouldResetDbPrices = count80 > 8 || needsPriceInit;
        if (shouldResetDbPrices) {
          console.log(`⚡ Recalibrating ${companies.length} stocks to authentic, diverse market distribution...`);
        } else {
          console.log(`📈 Restoring live market trends for ${companies.length} stocks without resetting prices...`);
        }
        
        // Sort stably by symbol
        const sorted = [...companies].sort((a, b) => a.symbol.localeCompare(b.symbol));

        for (let i = 0; i < sorted.length; i++) {
          const comp = sorted[i];
          const base = comp.base_price > 0 ? comp.base_price : 5000;
          let targetPct = 0.0;

          if (comp.status === 'ARA') {
            // BEI ARA Day-1 IPO: 2x normal limit (70%, 50%, 40%)
            const araPct = base <= 200 ? 70.0 : (base <= 5000 ? 50.0 : 40.0);
            targetPct = araPct;
          } else if (comp.status === 'CRITICAL') {
            // Crisis stocks: -6% to -17%
            targetPct = -6.5 - ((i % 8) * 1.3) - (Math.random() * 0.8);
          } else if (i < 8) {
            // Top Gainers: +9.5% to +21.4%
            targetPct = 9.5 + (i * 1.6) + (Math.random() * 0.9);
          } else if (i < 28) {
            // Strong Gainers: +3.5% to +8.8%
            targetPct = 3.5 + ((i % 10) * 0.5) + (Math.random() * 0.6);
          } else if (i < 58) {
            // Sideways / Mild: -1.8% to +2.5%
            targetPct = -1.2 + ((i % 10) * 0.35) + (Math.random() * 0.5);
          } else if (i < 85) {
            // Mild Losers: -2.0% to -6.8%
            targetPct = -2.0 - ((i % 10) * 0.45) - (Math.random() * 0.6);
          } else {
            // Deep Losers: -7.0% to -13.5%
            targetPct = -7.0 - ((i % 10) * 0.65) - (Math.random() * 0.7);
          }

          targetPct = parseFloat(targetPct.toFixed(2));
          this.stockTrends.set(comp.id, targetPct);

          if (shouldResetDbPrices || !comp.prev_close || comp.prev_close <= 0) {
            const prevClose = base;
            const newPrice = Math.max(50, Math.round(prevClose * (1 + targetPct / 100)));
            const highSpread = Math.max(20, Math.round(newPrice * 0.015));
            const lowSpread = Math.max(20, Math.round(newPrice * 0.015));
            const dHigh = comp.status === 'ARA' ? newPrice : newPrice + highSpread;
            const dLow = comp.status === 'ARA' ? prevClose : Math.max(50, newPrice - lowSpread);

            await query.run(
              'UPDATE companies SET prev_close = ?, current_price = ?, daily_high = ?, daily_low = ? WHERE id = ?',
              [prevClose, newPrice, dHigh, dLow, comp.id]
            );
          }
        }
        console.log('✅ Market state ready: Live stock prices and trends preserved.');
      }
    } catch (err) {
      console.error('Market recalibration error:', err);
    }
  }

  async tick() {
    this.tickCount++;
    try {
      const activeEvents = await query.all('SELECT * FROM macro_events WHERE active = 1');
      const recentNews = await query.all('SELECT * FROM news ORDER BY published_at DESC LIMIT 3');

      const interventionSetting = await query.get(
        "SELECT value FROM central_bank_settings WHERE key = 'bot_auto_intervention'"
      );
      const isAutoIntervention = interventionSetting?.value === 'true';

      const companies = await query.all("SELECT * FROM companies WHERE (listing_status = 'LISTED' OR (listing_status IS NULL AND is_bot = 1)) AND (listing_status != 'PRE_IPO' AND listing_status != 'UNLISTED')");
      const updatedList = [];
      const now = new Date().toISOString();

      let totalCapCurrent = 0;
      let totalCapPrev = 0;
      let up = 0;
      let flat = 0;
      let down = 0;

      for (let i = 0; i < companies.length; i++) {
        const comp = companies[i];
        const refPrice = comp.prev_close > 0 ? comp.prev_close : comp.base_price;
        const shares = comp.circulating_shares || 3000000;

        // Individual stochastic walk with natural mean-reversion
        const baseTrend = this.stockTrends.get(comp.id) || 0.0;
        const currentChangePct = ((comp.current_price - refPrice) / refPrice) * 100;
        
        // Micro fluctuation: between -0.4% and +0.4%
        const volatility = comp.current_price < 1000 ? 0.006 : (comp.current_price < 5000 ? 0.004 : 0.003);
        let tickDeltaPct = (Math.random() - 0.50) * volatility;

        // Mean reversion pull towards each stock's unique target trend (prevents infinite runaways)
        const diffFromTrend = (currentChangePct - baseTrend);
        tickDeltaPct -= (diffFromTrend * 0.001);

        // Bandar vs Ritel dynamic market moves (Bandar Akumulasi vs Bandar Guyur / Profit Taking)
        const randBandar = Math.random();
        if (randBandar < 0.04) {
          // Bandar Guyur / Dump: Sharp sell of -1.5% to -3.5%
          tickDeltaPct -= (0.015 + Math.random() * 0.02);
        } else if (randBandar < 0.08) {
          // Bandar Pom-Pom / Akumulasi: Buy push +1.5% to +3.5%
          tickDeltaPct += (0.015 + Math.random() * 0.02);
        }

        // Retail Panic Selling vs Bullish FOMO
        if (currentChangePct < -4.5 && currentChangePct > -34.5 && baseTrend < 0) {
          tickDeltaPct -= (0.0015 + Math.random() * 0.002);
        } else if (baseTrend > 5.0 || currentChangePct > 3.0) {
          // Bullish Momentum / FOMO Accumulation (Mendorong harga naik menuju ARA +25% s/d +35%)
          tickDeltaPct += (0.002 + Math.random() * 0.0025);
        }

        // Health modifier
        if (comp.status === 'CRITICAL') {
          tickDeltaPct -= 0.0025;
        }

        // Active Event bias (e.g. Resesi, Perang, Pandemi, Krisis Minyak)
        for (const ev of activeEvents) {
          if (ev.affected_sector === 'ALL' || ev.affected_sector === comp.sector) {
            const drag = (ev.price_impact_pct / 100) * 0.025;
            tickDeltaPct += drag;
          }
        }

        // News bias
        for (const nw of recentNews) {
          if (nw.affected_sector === 'ALL' || nw.affected_sector === comp.sector) {
            if (nw.sentiment === 'BULLISH') tickDeltaPct += 0.002;
            if (nw.sentiment === 'BEARISH') tickDeltaPct -= 0.002;
          }
        }

        // Auto Rejection Limits: -35% (ARB Simetris) to +25% / +35% (ARA)
        const isLockedAra = comp.status === 'ARA';
        const normalAraPct = refPrice <= 200 ? 0.35 : (refPrice <= 5000 ? 0.25 : 0.20);
        const araLimitPct = isLockedAra ? (refPrice <= 200 ? 0.70 : (refPrice <= 5000 ? 0.50 : 0.40)) : normalAraPct;
        
        const minAllowed = Math.max(50, Math.round(refPrice * 0.65)); // ARB Simetris -35%
        const maxAllowed = Math.round(refPrice * (1 + araLimitPct)); // ARA ceiling

        let newPrice = isLockedAra ? maxAllowed : Math.round(comp.current_price * (1 + tickDeltaPct));
        newPrice = Math.max(minAllowed, Math.min(maxAllowed, newPrice));
        if (comp.status === 'SUSPENDED') {
          newPrice = comp.current_price;
        }

        // Bot Intervention Algorithm if drop > 35%
        if (isAutoIntervention && (refPrice - newPrice) / refPrice > 0.35) {
          newPrice += Math.round(refPrice * 0.03);
        }

        const priceChangePct = parseFloat((((newPrice - refPrice) / refPrice) * 100).toFixed(2));
        const dailyHigh = Math.max(comp.daily_high || newPrice, newPrice);
        const dailyLow = Math.min(comp.daily_low || newPrice, newPrice);

        // Update database
        await query.run(
          'UPDATE companies SET current_price = ?, daily_high = ?, daily_low = ? WHERE id = ?',
          [newPrice, dailyHigh, dailyLow, comp.id]
        );

        // Breadth counters
        if (priceChangePct > 0.1) up++;
        else if (priceChangePct < -0.1) down++;
        else flat++;

        totalCapCurrent += (newPrice * shares);
        totalCapPrev += (refPrice * shares);

        // Dynamic 5-level Orderbook generation with fluctuating depth
        const tickSize = newPrice >= 5000 ? 25 : (newPrice >= 2000 ? 10 : 5);
        const bids = [];
        const offers = [];
        let totalBidLots = 0;
        let totalOfferLots = 0;
        const isSuspended = comp.status === 'SUSPENDED';
        const isCritical = comp.status === 'CRITICAL';

        if (isSuspended) {
          totalBidLots = 0;
          totalOfferLots = 0;
        } else {
          for (let j = 1; j <= 5; j++) {
            const bidPrice = Math.max(50, newPrice - (j - 1) * tickSize);
            const offerPrice = newPrice + j * tickSize;
            
            const baseLot = 350 + (j * 180) + Math.floor(Math.random() * 250);
            const bidLots = isCritical ? Math.round(baseLot * 0.55) : Math.round(baseLot * 1.15);
            const offerLots = isCritical ? Math.round(baseLot * 1.45) : Math.round(baseLot * 0.95);

            totalBidLots += bidLots;
            totalOfferLots += offerLots;

            bids.push({ price: bidPrice, lots: bidLots, freq: Math.floor(bidLots / 120) + 3 });
            offers.push({ price: offerPrice, lots: offerLots, freq: Math.floor(offerLots / 120) + 3 });
          }
        }

        const totalDepth = totalBidLots + totalOfferLots;
        const buyPressurePct = totalDepth > 0 ? Math.round((totalBidLots / totalDepth) * 100) : 100;
        const sellPressurePct = 100 - buyPressurePct;

        const liveOrderbook = {
          companyId: comp.id,
          symbol: comp.symbol,
          bids,
          offers,
          totalBidLots,
          totalOfferLots,
          buyPressurePct,
          sellPressurePct
        };

        // Record history tick every 4 cycles
        if (this.tickCount % 4 === 0) {
          const open = comp.current_price;
          const close = newPrice;
          const high = Math.max(open, close) + Math.round(Math.random() * (open * 0.002));
          const low = Math.min(open, close) - Math.round(Math.random() * (open * 0.002));
          const vol = Math.floor(Math.random() * 3000) + 300;

          await query.run(
            `INSERT INTO price_history (id, company_id, price, open, close, high, low, volume, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [uuidv4(), comp.id, close, open, close, high, low, vol, now]
          );
        }

        updatedList.push({
          id: comp.id,
          symbol: comp.symbol,
          name: comp.name,
          sector: comp.sector,
          status: comp.status,
          current_price: newPrice,
          base_price: comp.base_price,
          prev_close: refPrice,
          daily_high: dailyHigh,
          daily_low: dailyLow,
          price_change_pct: priceChangePct,
          fundamental_score: comp.fundamental_score,
          dividend_rate: comp.dividend_rate,
          is_bot: comp.is_bot,
          orderbook: liveOrderbook
        });
      }

      // Update IPMC Index Calculations
      this.upCount = up;
      this.flatCount = flat;
      this.downCount = down;

      if (totalCapPrev > 0) {
        const marketCapChangePct = (totalCapCurrent - totalCapPrev) / totalCapPrev;
        this.ipmcPoints = parseFloat((this.ipmcBase * (1 + marketCapChangePct)).toFixed(2));
        this.ipmcChangePts = parseFloat((this.ipmcPoints - this.ipmcBase).toFixed(2));
        this.ipmcChangePct = parseFloat((marketCapChangePct * 100).toFixed(2));
        this.ipmcHigh = Math.max(this.ipmcHigh, this.ipmcPoints);
        this.ipmcLow = Math.min(this.ipmcLow, this.ipmcPoints);
      }

      // Fluctuating live market volume & foreign flow
      this.totalLotsTraded += Math.floor(Math.random() * 1500) + 200;
      this.totalTurnoverIb += Math.floor(Math.random() * 180000000) + 20000000;
      this.tradeFrequency += Math.floor(Math.random() * 45) + 5;
      
      const foreignFlowDelta = (Math.random() - 0.46) * 15000000;
      if (foreignFlowDelta >= 0) {
        this.foreignBuyIb += Math.round(foreignFlowDelta);
      } else {
        this.foreignSellIb += Math.round(Math.abs(foreignFlowDelta));
      }
      this.foreignNetIb = this.foreignBuyIb - this.foreignSellIb;

      // Update IPMC History buffer every 2 ticks
      if (this.tickCount % 2 === 0) {
        const nowDate = new Date();
        const hh = String(nowDate.getHours()).padStart(2, '0');
        const mm = String(nowDate.getMinutes()).padStart(2, '0');
        this.ipmcHistory.push({
          time: `${hh}:${mm}`,
          points: this.ipmcPoints,
        });
        if (this.ipmcHistory.length > 50) {
          this.ipmcHistory.shift();
        }
      }

      // Broadcast Market Ticker & Market Overview
      const overview = this.getMarketOverview();
      this.io.emit('market:ticker', updatedList);
      this.io.emit('market:overview', overview);

      // Generate 1-2 real-time market trades for Running Trade tape
      const tradeableList = updatedList.filter(c => c.status !== 'SUSPENDED');
      if (tradeableList.length > 0) {
        const tradesCount = Math.floor(Math.random() * 2) + 1;
        const nowObj = new Date();
        const hh = String(nowObj.getHours()).padStart(2, '0');
        const mm = String(nowObj.getMinutes()).padStart(2, '0');
        const ss = String(nowObj.getSeconds()).padStart(2, '0');
        const timeStr = `${hh}:${mm}:${ss}`;

        for (let t = 0; t < tradesCount; t++) {
          const randComp = tradeableList[Math.floor(Math.random() * tradeableList.length)];
          const isBuy = Math.random() > 0.45;
          const lotSize = Math.floor(Math.random() * 250) + 15;
          const randomBot = BOT_ROSTER[Math.floor(Math.random() * BOT_ROSTER.length)];
          const bgTrade = {
            id: uuidv4(),
            time: timeStr,
            symbol: randComp.symbol,
            price: randComp.current_price,
            lots: lotSize,
            type: isBuy ? 'BUY' : 'SELL',
            username: randomBot ? randomBot.username : (isBuy ? 'Konsorsium Reksa Dana' : 'Ritel Publik'),
            isUser: false,
            timestamp: nowObj.toISOString(),
          };
          this.recordTrade(bgTrade);
          this.io.emit('trade:executed', bgTrade);
        }
      }

      // Cocokkan Antrean Limit Order (Order Matching Engine)
      await this.processMarketOrders();

      // Simulasi Penyerapan Kuota Lot E-IPO Bertahap oleh Ritel
      if (this.tickCount % 5 === 0) {
        await this.simulateIpoAbsorption();
      }

    } catch (err) {
      console.error('Market Simulation Tick Error:', err);
    }
  }

  // Engine Pencocokan Antrean Limit Order Beli (Bid) & Jual (Offer)
  async processMarketOrders() {
    try {
      const openOrders = await query.all(`
        SELECT o.*, c.symbol, c.current_price, c.status as company_status, u.username, u.balance_ib, u.is_blue_chip
        FROM market_orders o
        JOIN companies c ON o.company_id = c.id
        JOIN users u ON o.user_id = u.id
        WHERE o.status IN ('OPEN', 'PARTIAL') AND c.status != 'SUSPENDED'
        ORDER BY o.created_at ASC
      `);

      if (!openOrders || openOrders.length === 0) return;

      for (const order of openOrders) {
        const orderLots = order.lots || order.target_lots || 0;
        const orderPrice = order.price || order.price_per_share || 0;
        const orderTypeVal = order.order_type || order.type || 'BUY';
        const remainingLots = orderLots - (order.filled_lots || 0);
        if (remainingLots <= 0) continue;

        const isBuy = orderTypeVal === 'BUY';
        const curPrice = order.current_price;

        // BUY cocok jika harga pasar saat ini <= batas harga antre beli
        // SELL cocok jika harga pasar saat ini >= batas harga antre jual
        const canMatch = isBuy ? (curPrice <= orderPrice) : (curPrice >= orderPrice);
        if (!canMatch) continue;

        // Eksekusi parsial bertahap (10 s/d 50 lot atau sekaligus jika order kecil)
        const fillAmount = remainingLots <= 25 ? remainingLots : Math.min(remainingLots, Math.floor(Math.random() * 50) + 15);
        const newFilledLots = (order.filled_lots || 0) + fillAmount;
        const isFullyFilled = newFilledLots >= orderLots;
        const newStatus = isFullyFilled ? 'FILLED' : 'PARTIAL';

        const execPrice = curPrice;
        const fillShares = fillAmount * 100;
        const feePct = order.is_blue_chip ? 0.0005 : 0.0015;

        if (isBuy) {
          // Masukkan lot yang berhasil terbeli ke portofolio
          const existingPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [order.user_id, order.company_id]);
          if (existingPort) {
            const totalOldShares = existingPort.lots_owned * 100;
            const totalNewShares = totalOldShares + fillShares;
            const newAvg = ((totalOldShares * existingPort.avg_buy_price) + (fillShares * execPrice)) / totalNewShares;
            await query.run('UPDATE portfolios SET lots_owned = lots_owned + ?, avg_buy_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [fillAmount, newAvg, existingPort.id]);
          } else {
            await query.run(
              'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
              [uuidv4(), order.user_id, order.company_id, fillAmount, execPrice]
            );
          }

          // Jika harga beli riil lebih murah dari batas bid order, kembalikan selisih dana (refund kelebihan escrow)
          if (orderPrice > execPrice) {
            const surplusPerShare = orderPrice - execPrice;
            const refundIb = Math.round(fillShares * surplusPerShare * (1 + feePct));
            if (refundIb > 0) {
              await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [refundIb, order.user_id]);
              const refUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [order.user_id]);
              await recordCashFlow({
                userId: order.user_id,
                companyId: order.company_id,
                accountType: 'PERSONAL',
                category: 'ORDER_SURPLUS_REFUND',
                title: `Kelebihan Dana Antre Beli ${order.symbol}`,
                amountIb: refundIb,
                direction: 'INCOME',
                balanceAfter: refUser ? refUser.balance_ib : 0,
                notes: `Eksekusi antrean pada harga lebih menguntungkan (Bid IB ${orderPrice} -> Match IB ${execPrice})`
              });
            }
          }

          const gross = fillShares * execPrice;
          const fee = Math.round(gross * feePct);
          const transId = uuidv4();
          await query.run(
            `INSERT INTO transactions (id, user_id, company_id, type, lots, price_per_share, total_amount, fee, status)
             VALUES (?, ?, ?, 'BUY', ?, ?, ?, ?, 'COMPLETED')`,
            [transId, order.user_id, order.company_id, fillAmount, execPrice, gross + fee, fee]
          );

          const postUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [order.user_id]);
          await recordCashFlow({
            userId: order.user_id,
            companyId: order.company_id,
            accountType: 'PERSONAL',
            category: 'STOCK_BUY',
            title: `Match Antre Beli ${order.symbol} (${fillAmount} Lot)`,
            amountIb: gross + fee,
            direction: 'EXPENSE',
            balanceAfter: postUser ? postUser.balance_ib : 0,
            notes: `Antrean Beli (Bid) tereksekusi pada harga IB ${execPrice.toLocaleString('id-ID')} (${newStatus})`
          });
        } else {
          // Antrean Jual Cocok: Cairkan hasil penjualan ke saldo Kas Pribadi
          const gross = fillShares * execPrice;
          const fee = Math.round(gross * feePct);
          const netProceeds = gross - fee;

          await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [netProceeds, order.user_id]);
          const postUser = await query.get('SELECT balance_ib FROM users WHERE id = ?', [order.user_id]);

          const transId = uuidv4();
          await query.run(
            `INSERT INTO transactions (id, user_id, company_id, type, lots, price_per_share, total_amount, fee, status)
             VALUES (?, ?, ?, 'SELL', ?, ?, ?, ?, 'COMPLETED')`,
            [transId, order.user_id, order.company_id, fillAmount, execPrice, netProceeds, fee]
          );

          await recordCashFlow({
            userId: order.user_id,
            companyId: order.company_id,
            accountType: 'PERSONAL',
            category: 'STOCK_SELL',
            title: `Match Antre Jual ${order.symbol} (${fillAmount} Lot)`,
            amountIb: netProceeds,
            direction: 'INCOME',
            balanceAfter: postUser ? postUser.balance_ib : 0,
            notes: `Antrean Jual (Offer) tereksekusi pada harga IB ${execPrice.toLocaleString('id-ID')} (${newStatus})`
          });
        }

        // Perbarui kuota dan status order di database
        await query.run(
          'UPDATE market_orders SET filled_lots = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [newFilledLots, newStatus, order.id]
        );

        // Siarkan transaksi ke pita Running Trade bursa
        const nowM = new Date();
        const hhM = String(nowM.getHours()).padStart(2, '0');
        const mmM = String(nowM.getMinutes()).padStart(2, '0');
        const ssM = String(nowM.getSeconds()).padStart(2, '0');
        this.recordTrade({
          id: uuidv4(),
          time: `${hhM}:${mmM}:${ssM}`,
          symbol: order.symbol,
          price: execPrice,
          lots: fillAmount,
          type: isBuy ? 'BUY' : 'SELL',
          username: order.username,
          isUser: true,
          timestamp: nowM.toISOString()
        });

        this.io.emit('order:matched', {
          orderId: order.id,
          userId: order.user_id,
          symbol: order.symbol,
          type: orderTypeVal,
          filledLots: fillAmount,
          totalFilled: newFilledLots,
          status: newStatus,
          price: execPrice
        });
      }
    } catch (orderErr) {
      console.error('Error processing market limit orders:', orderErr);
    }
  }

  // Simulasi Penyerapan Lot IPO Bertahap oleh Ritel Bursa
  async simulateIpoAbsorption() {
    try {
      const activeIpos = await query.all(
        "SELECT * FROM ipo_offerings WHERE status IN ('BOOKBUILDING', 'OFFERING')"
      );
      for (const ipo of activeIpos) {
        const targetTotalLots = Math.max(1, Math.floor(ipo.total_offering_shares / 100));
        const currentOrdered = ipo.ordered_lots || 0;
        
        // Simulasikan penyerapan hingga 85% - 105% kuota
        if (currentOrdered < targetTotalLots * 0.95) {
          const incremental = Math.floor(Math.random() * 350) + 50;
          const newOrdered = Math.min(targetTotalLots, currentOrdered + incremental);
          await query.run('UPDATE ipo_offerings SET ordered_lots = ? WHERE id = ?', [newOrdered, ipo.id]);
          this.io.emit('ipo:ordered', { ipoId: ipo.id, symbol: ipo.symbol, orderedLots: newOrdered });
        }
      }
    } catch (err) {
      console.error('Error simulating IPO absorption:', err);
    }
  }

  getMarketOverview() {
    return {
      indexName: 'IHSG / IPMC',
      code: 'IPMC',
      points: this.ipmcPoints,
      changePts: this.ipmcChangePts,
      changePct: this.ipmcChangePct,
      open: this.ipmcOpen,
      high: this.ipmcHigh,
      low: this.ipmcLow,
      prevClose: this.ipmcBase,
      history: this.ipmcHistory,
      stats: {
        foreignBuyIb: this.foreignBuyIb,
        foreignSellIb: this.foreignSellIb,
        foreignNetIb: this.foreignNetIb,
        totalLotsTraded: this.totalLotsTraded,
        totalTurnoverIb: this.totalTurnoverIb,
        tradeFrequency: this.tradeFrequency,
      },
      breadth: {
        up: this.upCount,
        flat: this.flatCount,
        down: this.downCount
      }
    };
  }

  // Generate passive business revenue and deduct salaries for PT owners (Configurable Interval)
  async generateCompanyRevenue() {
    try {
      let taxRatePct = 10.0;
      let baseOps = 3000000;
      let salaryPerHead = 100000;
      let bankruptcyLimit = -50000000;
      try {
        const settingsRows = await query.all("SELECT key, value FROM central_bank_settings WHERE key IN ('corporate_tax_rate_pct', 'base_operational_cost_ib', 'employee_salary_per_head_ib', 'bankruptcy_limit_ib')");
        for (const s of (settingsRows || [])) {
          if (s.key === 'corporate_tax_rate_pct' && !isNaN(parseFloat(s.value))) taxRatePct = parseFloat(s.value);
          if (s.key === 'base_operational_cost_ib' && !isNaN(parseFloat(s.value))) baseOps = parseFloat(s.value);
          if (s.key === 'employee_salary_per_head_ib' && !isNaN(parseFloat(s.value))) salaryPerHead = parseFloat(s.value);
          if (s.key === 'bankruptcy_limit_ib' && !isNaN(parseFloat(s.value))) {
            const val = parseFloat(s.value);
            bankruptcyLimit = val > 0 ? -val : val; // Pastikan negatif
          }
        }
      } catch (_) {}
      const taxMultiplier = taxRatePct / 100.0;
      const intervalDesc = `${this.companyRevenueIntervalMinutes || 25} Menit`;
      const BANKRUPTCY_LIMIT = bankruptcyLimit;

      // Cek Subsidi Sektoral Aktif (Pilar 2)
      let activeSubsidiesMap = new Map();
      try {
        const activeSubs = await query.all('SELECT sector, effective_tax_rate_pct, operational_grant_ib FROM sector_subsidies WHERE is_active = 1');
        for (const sub of (activeSubs || [])) {
          if (sub.sector) activeSubsidiesMap.set(sub.sector.toLowerCase(), sub);
        }
      } catch (_) {}

      const processedCompanyIds = new Set();
      const ptOwners = await query.all('SELECT * FROM users WHERE has_pt = 1 AND is_banned = 0');
      for (const u of ptOwners) {
        // Cek apakah PT Utama user sedang disita negara/PNAF atau BANGKRUT (PAILIT)
        const primaryComp = await query.get('SELECT id, is_seized, status, name, symbol, sector FROM companies WHERE owner_id = ? AND is_bot = 0', [u.id]);
        if (primaryComp) {
          processedCompanyIds.add(primaryComp.id);
          if (primaryComp.is_seized === 1 || primaryComp.status === 'BANKRUPT') {
            continue; // Operasional & beban gaji dibekukan total oleh sitaan negara atau kepailitan!
          }
        }

        // Cek apakah ada subsidi sektoral untuk PT ini
        const compSector = (primaryComp?.sector || u.sector || '').toLowerCase();
        let currentTaxRate = taxMultiplier;
        let currentTaxPct = taxRatePct;
        let grantDeduction = 0;
        if (activeSubsidiesMap.has(compSector)) {
          const sub = activeSubsidiesMap.get(compSector);
          currentTaxPct = sub.effective_tax_rate_pct || 5.0;
          currentTaxRate = currentTaxPct / 100.0;
          grantDeduction = sub.operational_grant_ib || 0;
        }

        // Beban operasional dasar & gaji karyawan
        const staffSalaries = (u.employees_count || 0) * salaryPerHead;
        const ceoSalary = u.ceo_level > 0 ? 1500000 : 0;
        const cfoSalary = u.cfo_level > 0 ? 1000000 : 0;
        const cmoSalary = u.cmo_level > 0 ? 1000000 : 0;

        let totalExpenses = baseOps + staffSalaries + ceoSalary + cfoSalary + cmoSalary;
        if (u.cfo_level > 0) {
          totalExpenses = Math.round(totalExpenses * 0.75);
        }
        totalExpenses = Math.max(0, totalExpenses - grantDeduction);

        // Omzet bisnis progresif (R&D, Merek, SDM, Skala PT)
        let grossRev = (u.pt_level * 250000) + 
                       ((u.rd_level || 1) * 450000) + 
                       ((u.marketing_level || 1) * 300000) + 
                       ((u.capacity_level || 1) * 200000) + 
                       ((u.employees_count || 0) * 150000);

        if (u.ceo_level > 0) grossRev *= 1.30;
        if (u.cmo_level > 0) grossRev *= 1.35;

        const multiplier = (u.fundamental_score / 100);
        const totalGross = Math.round(grossRev * multiplier);

        // Laba/Rugi Bersih: jika baru berdiri (R&D & marketing rendah), bisa mengalami rugi awal / fase bakar modal
        const netRev = totalGross - totalExpenses;

        if (netRev > 0) {
          const corporateTax = Math.round(netRev * currentTaxRate); // PPh Badan disesuaikan dengan subsidi / regulasi
          const netAfterTax = netRev - corporateTax;

          // Setor PPh Badan ke Kas Negara Federasi
          await query.run(
            'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), 'CORPORATE_TAX', `Penerimaan PPh Badan (${currentTaxPct}%) - ${u.pt_name || 'PT Utama'}`, corporateTax, 'INCOME', u.id, `Setoran PPh Badan ${currentTaxPct}% atas laba operasional periode ${intervalDesc}`]
          );
          this.io.emit('treasury:updated');

          await query.run(
            'UPDATE users SET company_balance_ib = company_balance_ib + ? WHERE id = ?',
            [netAfterTax, u.id]
          );
          if (primaryComp) {
            await query.run('UPDATE companies SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?', [netAfterTax, primaryComp.id]);
          }

          const updatedUser = await query.get('SELECT company_balance_ib FROM users WHERE id = ?', [u.id]);

          await recordCashFlow({
            userId: u.id,
            companyId: primaryComp?.id || null,
            accountType: 'COMPANY',
            category: 'REVENUE',
            title: `Laba Bersih Omzet Operasional PT (Siklus ${intervalDesc})`,
            amountIb: netAfterTax,
            direction: 'INCOME',
            balanceAfter: updatedUser.company_balance_ib,
            notes: `Omzet Kotor: +IB ${totalGross.toLocaleString('id-ID')} | Beban Ops: -IB ${totalExpenses.toLocaleString('id-ID')}`
          });
          await recordCashFlow({
            userId: u.id,
            companyId: primaryComp?.id || null,
            accountType: 'COMPANY',
            category: 'TAX',
            title: `Setoran PPh Badan (${taxRatePct}% Kas Negara)`,
            amountIb: corporateTax,
            direction: 'EXPENSE',
            balanceAfter: updatedUser.company_balance_ib,
            notes: `Setoran Pajak Penghasilan Badan ${taxRatePct}% atas laba operasional`
          });

          this.io.to(u.id).emit('company:revenue', {
            amount: netAfterTax,
            grossRevenue: totalGross,
            expenses: totalExpenses,
            tax: corporateTax,
            netRevenue: netAfterTax,
            newCompanyBalance: updatedUser.company_balance_ib,
          });
          this.io.emit('user:balance_updated', { userId: u.id, companyBalance: updatedUser.company_balance_ib });
        } else if (netRev < 0) {
          // Fase Defisit / Bakar Modal (Biaya operasional & gaji melebihi omzet)
          const currentBal = u.company_balance_ib || 0;
          const candidateBal = currentBal + netRev;

          if (candidateBal <= BANKRUPTCY_LIMIT) {
            // Perseroan RESMI BANGKRUT & DITUTUP (PAILIT)!
            const finalBal = BANKRUPTCY_LIMIT;
            await query.run('UPDATE users SET company_balance_ib = ? WHERE id = ?', [finalBal, u.id]);
            if (primaryComp) {
              await query.run(`
                UPDATE companies 
                SET company_balance_ib = ?, 
                    status = 'BANKRUPT', 
                    is_seized = 1, 
                    seized_by = 'Pengadilan Niaga Federasi (PNAF) & BCF',
                    seize_reason = 'PAILIT: Defisit kas operasional telah menembus batas maksimal ' || ? || '. Perseroan resmi dinyatakan bangkrut dan dibekukan.',
                    seized_at = datetime('now')
                WHERE id = ?
              `, [finalBal, BANKRUPTCY_LIMIT, primaryComp.id]);
            }

            const ptTitle = u.pt_name ? `PT ${u.pt_name}` : 'Perseroan';
            await query.run(`
              INSERT INTO news (id, title, content, affected_sector, sentiment, impact_multiplier, published_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              uuidv4(),
              `⚖️ KEBANGKRUTAN: ${ptTitle} Resmi Dinyatakan Pailit & Ditutup Operasionalnya!`,
              `Kepaniteraan Pengadilan Niaga dan Bank Sentral resmi membekukan dan menutup operasional ${ptTitle} setelah akumulasi defisit kas mencapai batas insolvensi maksimum -IB 50.000.000. Pemilik diwajibkan menyuntikkan modal talangan (bailout) pribadi atau mengajukan pinjaman likuiditas bank sentral untuk merehabilitasi perseroan.`,
              u.sector || 'GENERAL',
              'NEGATIVE',
              0.5
            ]);

            this.io.to(u.id).emit('company:revenue', {
              amount: netRev,
              grossRevenue: totalGross,
              expenses: totalExpenses,
              tax: 0,
              netRevenue: netRev,
              newCompanyBalance: finalBal,
              isBankrupt: true,
              message: '🚨 PERINGATAN INSOLVENSI: Perseroan Anda resmi dinyatakan Bangkrut & Ditutup karena defisit kas mencapai -IB 50.000.000! Segera lakukan suntik modal penyelamatan atau ajukan pinjaman bank.'
            });

            this.io.emit('user:balance_updated', { userId: u.id, companyBalance: finalBal });
          } else {
            // Masih dalam masa toleransi defisit (-50 Juta < saldo < 0)
            await query.run('UPDATE users SET company_balance_ib = ? WHERE id = ?', [candidateBal, u.id]);
            if (primaryComp) {
              await query.run('UPDATE companies SET company_balance_ib = ? WHERE id = ?', [candidateBal, primaryComp.id]);
            }

            await recordCashFlow({
              userId: u.id,
              companyId: primaryComp?.id || null,
              accountType: 'COMPANY',
              category: 'OPERATIONAL_EXPENSE',
              title: `Defisit Beban Operasional & Gaji Tim (Siklus ${intervalDesc})`,
              amountIb: Math.abs(netRev),
              direction: 'EXPENSE',
              balanceAfter: candidateBal,
              notes: `Beban operasional & gaji tim melampaui omzet rintisan`
            });

            this.io.to(u.id).emit('company:revenue', {
              amount: netRev,
              grossRevenue: totalGross,
              expenses: totalExpenses,
              tax: 0,
              netRevenue: netRev,
              newCompanyBalance: candidateBal,
              isDeficitWarning: candidateBal < 0,
              deficitRemaining: Math.abs(BANKRUPTCY_LIMIT - candidateBal),
            });

            this.io.emit('user:balance_updated', { userId: u.id, companyBalance: candidateBal });
          }
        }
      }

      // Seluruh Unit Anak Perusahaan & Konglomerasi Pemain (termasuk hasil akuisisi seperti TECH04)
      const subComps = await query.all(`
        SELECT c.* 
        FROM companies c 
        WHERE c.owner_id IS NOT NULL 
          AND (c.is_seized = 0 OR c.is_seized IS NULL)
          AND (c.status IS NULL OR c.status != 'BANKRUPT')
      `);
      for (const sc of subComps) {
        if (processedCompanyIds.has(sc.id)) continue;
        processedCompanyIds.add(sc.id);

        const staffSalaries = (sc.employees_count || 10) * salaryPerHead;
        const ceoSalary = (sc.ceo_level || 0) > 0 ? 1500000 : 0;
        const cfoSalary = (sc.cfo_level || 0) > 0 ? 1000000 : 0;
        const cmoSalary = (sc.cmo_level || 0) > 0 ? 1000000 : 0;
        let expenses = baseOps + staffSalaries + ceoSalary + cfoSalary + cmoSalary;
        if ((sc.cfo_level || 0) > 0) expenses = Math.round(expenses * 0.75);

        const ptLvl = sc.pt_level || sc.operational_level || 1;
        const rdLvl = sc.rd_level || 1;
        const mktLvl = sc.marketing_level || 1;
        const capLvl = sc.capacity_level || 1;
        const empCount = sc.employees_count || 10;

        let gross = (ptLvl * 250000) + (rdLvl * 450000) + (mktLvl * 300000) + (capLvl * 200000) + (empCount * 150000);
        if ((sc.ceo_level || 0) > 0) gross *= 1.30;
        if ((sc.cmo_level || 0) > 0) gross *= 1.35;
        const totalGross = Math.round(gross * ((sc.fundamental_score || 80) / 100));

        const net = totalGross - expenses;
        if (net > 0) {
          const corporateTax = Math.round(net * taxMultiplier); // PPh Badan dinamis
          const netAfterTax = net - corporateTax;

          await query.run(
            'INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [uuidv4(), 'CORPORATE_TAX', `Penerimaan PPh Badan (${taxRatePct}%) - ${sc.name}`, corporateTax, 'INCOME', sc.id, `Setoran PPh Badan ${taxRatePct}% anak perusahaan periode ${intervalDesc}`]
          );
          this.io.emit('treasury:updated');

          await query.run('UPDATE companies SET company_balance_ib = COALESCE(company_balance_ib, 0) + ? WHERE id = ?', [netAfterTax, sc.id]);
          const updatedBal = (sc.company_balance_ib || 0) + netAfterTax;

          await recordCashFlow({
            userId: sc.owner_id,
            companyId: sc.id,
            accountType: 'COMPANY',
            category: 'REVENUE',
            title: `Laba Bersih Omzet ${sc.name} (Siklus ${intervalDesc})`,
            amountIb: netAfterTax,
            direction: 'INCOME',
            balanceAfter: updatedBal,
            notes: `Omzet Kotor: +IB ${totalGross.toLocaleString('id-ID')} | Beban: -IB ${expenses.toLocaleString('id-ID')}`
          });
          await recordCashFlow({
            userId: sc.owner_id,
            companyId: sc.id,
            accountType: 'COMPANY',
            category: 'TAX',
            title: `Setoran PPh Badan ${taxRatePct}% - ${sc.name}`,
            amountIb: corporateTax,
            direction: 'EXPENSE',
            balanceAfter: updatedBal,
            notes: `Setoran Pajak Penghasilan Badan ${taxRatePct}% ke Kas Negara`
          });

          this.io.emit('user:balance_updated', { userId: sc.owner_id, companyId: sc.id, companyBalance: updatedBal });
          this.io.to(sc.owner_id).emit('company:revenue', {
            companyId: sc.id,
            companyName: sc.name,
            amount: netAfterTax,
            grossRevenue: totalGross,
            expenses: expenses,
            tax: corporateTax,
            netRevenue: netAfterTax,
            newCompanyBalance: updatedBal,
            isSub: true,
          });
        } else if (net < 0) {
          const currentBal = sc.company_balance_ib || 0;
          const candidateBal = currentBal + net;

          if (candidateBal <= BANKRUPTCY_LIMIT) {
            await query.run(`
              UPDATE companies 
              SET company_balance_ib = ?, 
                  status = 'BANKRUPT', 
                  is_seized = 1, 
                  seized_by = 'Pengadilan Niaga Federasi (PNAF) & BCF',
                  seize_reason = 'PAILIT: Defisit kas operasional telah menembus batas maksimal ' || ? || '. Perusahaan resmi dinyatakan bangkrut dan dibekukan.',
                  seized_at = datetime('now')
              WHERE id = ?
            `, [BANKRUPTCY_LIMIT, BANKRUPTCY_LIMIT, sc.id]);

            await query.run(`
              INSERT INTO news (id, title, content, affected_sector, sentiment, impact_multiplier, published_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              uuidv4(),
              `⚖️ KEBANGKRUTAN PERUSAHAAN: ${sc.name} Dinyatakan Pailit!`,
              `Perusahaan ${sc.name} resmi dibekukan operasionalnya akibat defisit kas melampaui batas toleransi insolvensi -IB 50.000.000. Pemilik diwajibkan menyuntikkan modal talangan (bailout) pribadi atau mengajukan pinjaman bank untuk memulihkan kepailitan.`,
              sc.sector || 'GENERAL',
              'NEGATIVE',
              0.6
            ]);

            this.io.to(sc.owner_id).emit('company:revenue', {
              companyId: sc.id,
              companyName: sc.name,
              amount: net,
              grossRevenue: totalGross,
              expenses: expenses,
              tax: 0,
              netRevenue: net,
              newCompanyBalance: BANKRUPTCY_LIMIT,
              isBankrupt: true,
              isSub: true,
              message: `🚨 PERINGATAN INSOLVENSI: Perusahaan ${sc.name} resmi dinyatakan Bangkrut & Ditutup karena defisit kas mencapai -IB 50.000.000! Segera lakukan suntik modal penyelamatan atau pinjam bank.`
            });
            this.io.emit('user:balance_updated', { userId: sc.owner_id, companyId: sc.id, companyBalance: BANKRUPTCY_LIMIT });
          } else {
            await query.run('UPDATE companies SET company_balance_ib = ? WHERE id = ?', [candidateBal, sc.id]);

            await recordCashFlow({
              userId: sc.owner_id,
              companyId: sc.id,
              accountType: 'COMPANY',
              category: 'OPERATIONAL_EXPENSE',
              title: `Defisit Beban Operasional & Gaji ${sc.name} (Siklus ${intervalDesc})`,
              amountIb: Math.abs(net),
              direction: 'EXPENSE',
              balanceAfter: candidateBal,
              notes: `Beban operasional anak perusahaan melampaui omzet penjualan`
            });

            this.io.to(sc.owner_id).emit('company:revenue', {
              companyId: sc.id,
              companyName: sc.name,
              amount: net,
              grossRevenue: totalGross,
              expenses: expenses,
              tax: 0,
              netRevenue: net,
              newCompanyBalance: candidateBal,
              isDeficitWarning: candidateBal < 0,
              deficitRemaining: Math.abs(BANKRUPTCY_LIMIT - candidateBal),
              isSub: true,
            });
            this.io.emit('user:balance_updated', { userId: sc.owner_id, companyId: sc.id, companyBalance: candidateBal });
          }
        }
      }

      // PILAR 1: Pembayaran Kupon Bunga Obligasi Negara Berkala
      try {
        await this.distributeBondCoupons();
      } catch (bondErr) {
        console.error('Error distributing bond coupons:', bondErr);
      }
    } catch (err) {
      console.error('Company revenue error:', err);
    }
  }

  // Payout Kupon Bunga Pemegang Obligasi Negara (Pilar 1)
  async distributeBondCoupons() {
    try {
      const activeHoldings = await query.all(`
        SELECT h.*, b.bond_code, b.title, u.username, u.balance_ib
        FROM user_bond_holdings h
        JOIN sovereign_bonds b ON h.bond_id = b.id
        JOIN users u ON h.user_id = u.id
        WHERE h.status = 'ACTIVE' AND b.status IN ('OPEN', 'SOLD_OUT')
      `);

      if (!activeHoldings || activeHoldings.length === 0) return;

      const intervalMinutes = this.companyRevenueIntervalMinutes || 25;
      for (const h of activeHoldings) {
        // Kupon per siklus proporsional (annual yield dibagi 365 siklus perputaran)
        const annualYield = h.total_investment_ib * (h.coupon_rate_pct / 100.0);
        const couponPayout = Math.max(1000, Math.round((annualYield / 365) * (intervalMinutes / 25)));
        if (couponPayout <= 0) continue;

        await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [couponPayout, h.user_id]);
        await query.run(
          'UPDATE user_bond_holdings SET total_coupon_earned_ib = COALESCE(total_coupon_earned_ib, 0) + ?, last_coupon_paid_at = CURRENT_TIMESTAMP WHERE id = ?',
          [couponPayout, h.id]
        );

        // Catat pengeluaran kupon dari Brankas Kas Negara (State Treasury)
        await query.run(
          `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
           VALUES (?, 'BOND_COUPON', ?, ?, 'EXPENSE', ?, ?)`,
          [
            uuidv4(),
            `Pembayaran Kupon Obligasi ${h.bond_code} ke ${h.username}`,
            couponPayout,
            h.bond_code,
            `Kupon berkala ${h.coupon_rate_pct}% p.a. untuk ${h.units_owned} unit (${h.bond_code})`
          ]
        );

        this.io.emit('bonds:coupon_paid', {
          userId: h.user_id,
          bondCode: h.bond_code,
          couponPayout,
          holdingId: h.id
        });
        this.io.emit('user:balance_updated', {
          userId: h.user_id,
          balance: (h.balance_ib || 0) + couponPayout
        });
      }
      this.io.emit('treasury:updated');
    } catch (err) {
      console.error('Distribute bond coupons error:', err);
    }
  }

  // Distribute dividends into players' PERSONAL balance every 30 minutes (Lewati emiten disita)
  async distributeDividends() {
    try {
      const healthyCompanies = await query.all(
        "SELECT * FROM companies WHERE status = 'HEALTHY' AND (is_seized = 0 OR is_seized IS NULL) AND dividend_rate > 0"
      );

      for (const comp of healthyCompanies) {
        const portfolios = await query.all(
          'SELECT p.*, u.balance_ib, u.username FROM portfolios p JOIN users u ON p.user_id = u.id WHERE p.company_id = ? AND p.lots_owned > 0',
          [comp.id]
        );

        for (const port of portfolios) {
          const sharesOwned = port.lots_owned * 100;
          const dividendPerShare = (comp.current_price * comp.dividend_rate * 0.10);
          const totalDividend = Math.round(sharesOwned * dividendPerShare);

          if (totalDividend > 0) {
            await query.run(
              'UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?',
              [totalDividend, port.user_id]
            );

            await query.run(
              `INSERT INTO transactions (id, user_id, company_id, type, lots, price_per_share, total_amount, fee, status)
               VALUES (?, ?, ?, 'DIVIDEND', ?, ?, ?, 0, 'COMPLETED')`,
              [uuidv4(), port.user_id, comp.id, port.lots_owned, dividendPerShare, totalDividend]
            );

            await recordCashFlow({
              userId: port.user_id,
              companyId: comp.id,
              accountType: 'PERSONAL',
              category: 'DIVIDEND_INCOME',
              title: `Dividen Tunai Saham ${comp.symbol}`,
              amountIb: totalDividend,
              direction: 'INCOME',
              balanceAfter: (port.balance_ib || 0) + totalDividend,
              notes: `Dividen tunai dari kepemilikan ${port.lots_owned.toLocaleString('id-ID')} Lot saham ${comp.name}`
            });

            this.io.to(port.user_id).emit('user:dividend', {
              symbol: comp.symbol,
              name: comp.name,
              amount: totalDividend,
            });
          }
        }
      }
    } catch (err) {
      console.error('Dividend distribution error:', err);
    }
  }

  // Apply Instant Macro Economic Shock (Recession, Oil Crisis, Pandemic, War)
  async applyMacroShock(affectedSector, priceImpactPct) {
    try {
      console.log(`🚨 Applying Instant Macro Shock: Sector [${affectedSector}], Impact [${priceImpactPct}%]`);
      const companies = await query.all('SELECT * FROM companies');
      const updatedList = [];
      const impactRatio = parseFloat(priceImpactPct) / 100.0;

      for (const comp of companies) {
        if (affectedSector === 'ALL' || affectedSector === comp.sector) {
          const refPrice = comp.prev_close > 0 ? comp.prev_close : comp.base_price;
          // Apply shock with individual variation (75% to 125% of impact)
          const variation = 0.75 + Math.random() * 0.5;
          const compImpact = impactRatio * variation;

          // Limits: ARB -18% floor and ARA ceiling
          const minAllowed = Math.max(50, Math.round(refPrice * 0.82));
          const maxAllowed = Math.round(refPrice * 1.35);

          let newPrice = Math.round(comp.current_price * (1 + compImpact));
          newPrice = Math.max(minAllowed, Math.min(maxAllowed, newPrice));

          if (comp.status !== 'SUSPENDED') {
            const dailyHigh = Math.max(comp.daily_high || newPrice, newPrice);
            const dailyLow = Math.min(comp.daily_low || newPrice, newPrice);
            const changePct = parseFloat((((newPrice - refPrice) / refPrice) * 100).toFixed(2));

            // Shift baseline trend in memory so prices stay in shock zone
            this.stockTrends.set(comp.id, changePct);

            await query.run(
              'UPDATE companies SET current_price = ?, daily_high = ?, daily_low = ? WHERE id = ?',
              [newPrice, dailyHigh, dailyLow, comp.id]
            );

            updatedList.push({
              id: comp.id,
              symbol: comp.symbol,
              name: comp.name,
              sector: comp.sector,
              price: newPrice,
              changePct,
              status: changePct <= -14.5 ? 'ARB' : (changePct >= 24.5 ? 'ARA' : comp.status)
            });
          }
        }
      }

      // Adjust IPMC Composite Index points
      this.ipmcPoints = parseFloat((this.ipmcPoints * (1 + impactRatio * 0.65)).toFixed(2));
      this.ipmcChangePts = parseFloat((this.ipmcPoints - this.ipmcOpen).toFixed(2));
      this.ipmcChangePct = parseFloat(((this.ipmcChangePts / this.ipmcOpen) * 100).toFixed(2));
      this.ipmcLow = Math.min(this.ipmcLow, this.ipmcPoints);
      this.ipmcHigh = Math.max(this.ipmcHigh, this.ipmcPoints);

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      this.ipmcHistory.push({ time: `${hh}:${mm}`, points: this.ipmcPoints });
      if (this.ipmcHistory.length > 40) this.ipmcHistory.shift();

      this.io.emit('market:macro_shock', {
        affectedSector,
        priceImpactPct,
        ipmcPoints: this.ipmcPoints,
        ipmcChangePct: this.ipmcChangePct,
        companies: updatedList
      });

      this.io.emit('market:ticker', updatedList);
      this.io.emit('market:overview', this.getMarketOverview());
      console.log(`✅ Macro Shock applied to ${updatedList.length} companies. IPMC Index: ${this.ipmcPoints} (${this.ipmcChangePct}%)`);
    } catch (err) {
      console.error('Error applying macro shock:', err);
    }
  }
}

module.exports = MarketSimulationEngine;
