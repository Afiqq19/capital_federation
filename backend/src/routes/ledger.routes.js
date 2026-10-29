const express = require('express');
const { query } = require('../db');

function createLedgerRouter() {
  const router = express.Router();

  // GET /api/ledger/user/:userId - Ambil riwayat mutasi arus kas user & ringkasan finansial
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { accountType, companyId, direction, category, limit = 50, offset = 0 } = req.query;

      const user = await query.get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

      // Ambil daftar ID perusahaan yang dimiliki user (PT Utama & Anak Perusahaan)
      const ownedCompanies = await query.all('SELECT id, name, symbol FROM companies WHERE owner_id = ?', [userId]);
      const ownedCompanyIds = ownedCompanies.map(c => c.id);

      let sql = 'SELECT * FROM cash_flow_ledger WHERE ';
      const params = [];

      // Filter berdasarkan jenis rekening (PERSONAL vs COMPANY)
      if (accountType === 'PERSONAL') {
        sql += 'user_id = ? AND account_type = "PERSONAL" ';
        params.push(userId);
      } else if (accountType === 'COMPANY') {
        if (companyId) {
          sql += 'company_id = ? AND account_type = "COMPANY" ';
          params.push(companyId);
        } else if (ownedCompanyIds.length > 0) {
          const placeholders = ownedCompanyIds.map(() => '?').join(',');
          sql += `account_type = "COMPANY" AND (user_id = ? OR company_id IN (${placeholders})) `;
          params.push(userId, ...ownedCompanyIds);
        } else {
          sql += 'user_id = ? AND account_type = "COMPANY" ';
          params.push(userId);
        }
      } else {
        // Gabungan semua arus kas terkait user
        if (ownedCompanyIds.length > 0) {
          const placeholders = ownedCompanyIds.map(() => '?').join(',');
          sql += `(user_id = ? OR company_id IN (${placeholders})) `;
          params.push(userId, ...ownedCompanyIds);
        } else {
          sql += 'user_id = ? ';
          params.push(userId);
        }
      }

      if (direction && (direction === 'INCOME' || direction === 'EXPENSE')) {
        sql += 'AND direction = ? ';
        params.push(direction);
      }

      if (category) {
        sql += 'AND category = ? ';
        params.push(category);
      }

      // Hitung ringkasan statistik (Total Uang Masuk, Total Uang Keluar)
      const summaryRows = await query.all(
        `SELECT direction, SUM(amount_ib) as total_amount, COUNT(*) as count 
         FROM (${sql}) AS filtered 
         GROUP BY direction`,
        params
      );

      let totalIncome = 0;
      let totalExpense = 0;
      let countIncome = 0;
      let countExpense = 0;

      for (const row of summaryRows) {
        if (row.direction === 'INCOME') {
          totalIncome = row.total_amount || 0;
          countIncome = row.count || 0;
        } else if (row.direction === 'EXPENSE') {
          totalExpense = row.total_amount || 0;
          countExpense = row.count || 0;
        }
      }

      // Ambil data mutasi dengan pagination
      sql += 'ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit) || 50, parseInt(offset) || 0);

      const items = await query.all(sql, params);

      res.json({
        success: true,
        summary: {
          total_income: totalIncome,
          total_expense: totalExpense,
          net_cash_flow: totalIncome - totalExpense,
          count_income: countIncome,
          count_expense: countExpense,
          total_records: countIncome + countExpense,
          personal_balance: user.balance_ib || 0,
          primary_company_balance: user.company_balance_ib || 0
        },
        companies: ownedCompanies,
        ledger: items
      });
    } catch (err) {
      console.error('Error fetching cash flow ledger:', err);
      res.status(500).json({ error: 'Gagal mengambil data buku kas' });
    }
  });

  // GET /api/ledger/company/:companyId - Ambil riwayat buku kas brankas perusahaan spesifik
  router.get('/company/:companyId', async (req, res) => {
    try {
      const { companyId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const company = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
      if (!company) return res.status(404).json({ error: 'Perusahaan tidak ditemukan' });

      const items = await query.all(
        `SELECT * FROM cash_flow_ledger 
         WHERE company_id = ? AND account_type = 'COMPANY'
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [companyId, parseInt(limit) || 50, parseInt(offset) || 0]
      );

      const summaryRows = await query.all(
        `SELECT direction, SUM(amount_ib) as total_amount, COUNT(*) as count 
         FROM cash_flow_ledger 
         WHERE company_id = ? AND account_type = 'COMPANY'
         GROUP BY direction`,
        [companyId]
      );

      let totalIncome = 0;
      let totalExpense = 0;

      for (const row of summaryRows) {
        if (row.direction === 'INCOME') totalIncome = row.total_amount || 0;
        if (row.direction === 'EXPENSE') totalExpense = row.total_amount || 0;
      }

      res.json({
        success: true,
        company: {
          id: company.id,
          name: company.name,
          symbol: company.symbol,
          company_balance_ib: company.company_balance_ib || 0,
          status: company.status
        },
        summary: {
          total_income: totalIncome,
          total_expense: totalExpense,
          net_cash_flow: totalIncome - totalExpense
        },
        ledger: items
      });
    } catch (err) {
      console.error('Error fetching company ledger:', err);
      res.status(500).json({ error: 'Gagal mengambil buku kas perusahaan' });
    }
  });

  return router;
}

module.exports = createLedgerRouter;
