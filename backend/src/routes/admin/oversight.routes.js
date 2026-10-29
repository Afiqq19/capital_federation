/**
 * Admin — Pengawasan Bursa (UMA & Suspensi)
 *  GET  /api/admin/oversight            → config, daftar UMA, daftar suspensi, log audit
 *  POST /api/admin/uma/flag             → tandai UMA manual      { companyId, reason }
 *  POST /api/admin/uma/clear            → cabut UMA              { companyId }
 *  POST /api/admin/suspension/apply     → suspensi / perpanjang  { companyId, until, reason }
 *  POST /api/admin/suspension/lift      → cabut suspensi         { companyId }
 */
module.exports = function registerOversightRoutes(app, { query, surveillance }) {
  const run = (handler) => async (req, res) => {
    try {
      const result = await handler(req.body || {});
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };

  app.get('/api/admin/oversight', async (req, res) => {
    try {
      const baseSelect = `
        SELECT c.id, c.symbol, c.name, c.sector, c.is_bot, c.is_ipo, c.status,
               c.current_price, c.prev_close, c.base_price,
               c.uma_flag, c.uma_direction, c.uma_reason, c.uma_source, c.uma_at,
               c.suspended_at, c.suspend_until, c.suspend_reason,
               u.username AS owner_username
        FROM companies c
        LEFT JOIN users u ON c.owner_id = u.id`;

      const [config, umaList, suspensionList, log] = await Promise.all([
        surveillance.getConfig(),
        query.all(`${baseSelect} WHERE c.uma_flag = 1 ORDER BY c.uma_at DESC`),
        query.all(`${baseSelect} WHERE c.status = 'SUSPENDED' ORDER BY c.suspend_until ASC`),
        query.all('SELECT * FROM market_oversight_log ORDER BY created_at DESC LIMIT 60'),
      ]);

      res.json({ config, umaList, suspensionList, log });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/uma/flag', run(async ({ companyId, reason, direction }) => {
    const r = await surveillance.flagUma(companyId, { reason, direction, source: 'MANUAL' });
    const dirLabel = r.direction === 'UP' ? 'Lonjakan Kenaikan' : 'Penurunan Anjlok';
    return { message: `Saham ${r.symbol} ditandai UMA (${dirLabel}). Perdagangan tetap berjalan.` };
  }));

  app.post('/api/admin/uma/clear', run(async ({ companyId }) => {
    const r = await surveillance.clearUma(companyId, { source: 'MANUAL' });
    return { message: `Penandaan UMA ${r.symbol} dicabut.` };
  }));

  app.post('/api/admin/suspension/apply', run(async ({ companyId, until, reason }) => {
    const r = await surveillance.suspend(companyId, { until, reason, source: 'ADMIN' });
    return { message: `Saham ${r.symbol} disuspensi sampai ${new Date(r.until).toLocaleString('id-ID')}.`, until: r.until };
  }));

  app.post('/api/admin/suspension/lift', run(async ({ companyId }) => {
    const r = await surveillance.lift(companyId, { source: 'ADMIN' });
    return { message: `Suspensi ${r.symbol} dicabut. Saham diperdagangkan kembali.` };
  }));
};
