const { v4: uuidv4 } = require('uuid');
const { query, recordCashFlow } = require('../db');

const BOT_JUDGE_NAME = 'Prof. Dr. Bagas Daniswara, S.H., M.H. (Ketua Majelis Hakim PNAF)';
const BOT_CLERK_NAME = 'R. Arya Wicaksana, S.H. (Panitera Sidang Niaga PNAF)';
const AUTO_JUDGE_SETTING_KEY = 'court_bot_auto_judge';

// Rehabilitasi total emiten setelah banding/rekonvensi dikabulkan:
// cabut sita/pembekuan/UMA/suspensi, hapus denda & defisit kas negatif, dan buka kembali operasional.
async function rehabilitateCompanyAfterAppeal(io, companyId, ownerId, caseNumber) {
  if (!companyId) return null;
  const comp = await query.get('SELECT * FROM companies WHERE id = ?', [companyId]);
  if (!comp) return null;
  if (ownerId && comp.owner_id && comp.owner_id !== ownerId) return null; // Jangan pernah merehabilitasi milik orang lain

  const owner = comp.owner_id ? await query.get('SELECT * FROM users WHERE id = ?', [comp.owner_id]) : null;
  const isPrimary = Boolean(
    owner && ((owner.pt_symbol && owner.pt_symbol === comp.symbol) || (owner.pt_name && owner.pt_name === comp.name))
  );

  const compBal = Number(comp.company_balance_ib || 0);
  const ownerCompBal = owner ? Number(owner.company_balance_ib || 0) : 0;
  const deficitComp = compBal < 0 ? Math.abs(compBal) : 0;
  const deficitOwner = isPrimary && ownerCompBal < 0 ? Math.abs(ownerCompBal) : 0;
  const clearedDeficitIb = Math.max(deficitComp, deficitOwner);

  await query.run(
    `UPDATE companies
     SET uma_flag = 0, uma_reason = NULL, suspended_at = NULL, suspend_until = NULL, suspend_reason = NULL,
         is_seized = 0, is_auction_ready = 0, seize_reason = NULL, seized_at = NULL, seized_by = NULL, seizure_deadline = NULL,
         status = 'HEALTHY',
         company_balance_ib = CASE WHEN COALESCE(company_balance_ib, 0) < 0 THEN 0 ELSE company_balance_ib END
     WHERE id = ?`,
    [comp.id]
  );
  if (isPrimary && ownerCompBal < 0) {
    await query.run('UPDATE users SET company_balance_ib = 0 WHERE id = ?', [owner.id]);
  }

  if (owner) {
    try {
      await recordCashFlow({
        userId: owner.id,
        companyId: comp.id,
        accountType: 'COMPANY',
        category: 'COURT_VERDICT',
        title: `Rehabilitasi Putusan Banding PNAF (${caseNumber || '-'})`,
        amountIb: clearedDeficitIb,
        direction: 'INCOME',
        balanceAfter: Math.max(0, compBal),
        notes: clearedDeficitIb > 0
          ? `Banding dikabulkan: denda/defisit IB ${clearedDeficitIb.toLocaleString('id-ID')} dihapus & sita dicabut.`
          : 'Banding dikabulkan: sita & pembekuan dicabut.',
      });
    } catch (_) {}
  }

  if (io) {
    io.emit('company:seized_status', { companyId: comp.id, isSeized: false, reason: 'Rehabilitasi Putusan Banding PNAF' });
    io.emit('company:status_changed', { companyId: comp.id, status: 'HEALTHY' });
    if (owner) {
      io.emit('user:balance_updated', {
        userId: owner.id,
        companyId: comp.id,
        companyBalance: Math.max(0, isPrimary ? ownerCompBal : compBal),
        company_balance_ib: Math.max(0, isPrimary ? ownerCompBal : compBal),
      });
      io.emit('user:portfolio_updated', { userId: owner.id });
    }
  }
  return { companyName: comp.name, clearedDeficitIb };
}

function getWibParts(date = new Date()) {
  const wibMs = date.getTime() + 7 * 3600 * 1000;
  const wib = new Date(wibMs);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = String(wib.getUTCDate()).padStart(2, '0');
  const month = months[wib.getUTCMonth()];
  const year = wib.getUTCFullYear();
  const hh = String(wib.getUTCHours()).padStart(2, '0');
  const mm = String(wib.getUTCMinutes()).padStart(2, '0');
  return {
    dateStr: `${day} ${month} ${year}`,
    timeStr: `${hh}:${mm} WIB`,
    fullStr: `${day} ${month} ${year}, ${hh}:${mm} WIB`,
  };
}

function extractDeedNumberFromTitle(title) {
  if (!title || typeof title !== 'string') return null;
  const match = title.match(/#([A-Z0-9\/._-]+)/i);
  return match ? match[1] : null;
}

function normalizeStatus(status) {
  if (!status) return 'IN_TRIAL';
  const s = String(status).toUpperCase().trim();
  if (s === 'APPROVED' || s === 'DIKABULKAN' || s === 'WON' || s === 'VERDICT_WON') {
    return 'VERDICT_APPROVED';
  }
  if (s === 'DISMISSED' || s === 'REJECTED' || s === 'CLOSED_REJECTED') {
    return 'VERDICT_REJECTED';
  }
  return s;
}

function formatCourtMessage(m) {
  if (!m) return null;
  const role = m.sender_role || m.role || 'PENGGUGAT';
  return {
    ...m,
    id: m.id,
    case_id: m.case_id,
    caseId: m.case_id,
    sender_name: m.sender_name || m.senderName || 'Peserta Sidang',
    senderName: m.sender_name || m.senderName || 'Peserta Sidang',
    sender_role: role,
    senderRole: role,
    role,
    sender_user_id: m.sender_user_id || m.senderUserId || null,
    senderUserId: m.sender_user_id || m.senderUserId || null,
    message: m.message || '',
    created_at: m.created_at || new Date().toISOString(),
    createdAt: m.created_at || new Date().toISOString(),
  };
}

function formatCourtCase(c, messages = undefined) {
  if (!c) return null;
  const normalizedStatus = normalizeStatus(c.status);
  const isDecided = normalizedStatus !== 'IN_TRIAL';
  const inferredVerdictType =
    c.verdict_type ||
    (normalizedStatus === 'VERDICT_APPROVED'
      ? 'APPROVED_PLAINTIFF_WIN'
      : normalizedStatus === 'VERDICT_PAILIT'
      ? 'VERSTEK_PLAINTIFF_WIN'
      : normalizedStatus === 'VERDICT_PKPU'
      ? 'SETTLED_MEDIATION'
      : normalizedStatus === 'VERDICT_REJECTED'
      ? 'GUGUR_DISMISSED'
      : null);

  const deedNumber = c.deed_number || extractDeedNumberFromTitle(c.title);

  const result = {
    ...c,
    status: normalizedStatus,
    verdict_type: inferredVerdictType,
    room_status: isDecided ? 'VERDICT_DELIVERED' : (c.room_status || 'WAITING_PRESENCE'),
    deed_number: deedNumber || null,
    // CamelCase & Nested Structures for Mobile APK Full Compatibility
    caseNumber: c.case_number,
    caseType: c.case_type || 'DISPUTE',
    plaintiffName: c.plaintiff_name || 'Penggugat',
    plaintiffUserId: c.plaintiff_user_id || null,
    plaintiffCompanyId: c.plaintiff_company_id || null,
    defendantName: c.defendant_name || 'Tergugat',
    defendantUserId: c.defendant_user_id || null,
    defendantCompanyId: c.defendant_company_id || null,
    claimAmountIb: Number(c.claim_amount_ib || 0),
    courtHearingDate: c.court_hearing_date || 'Hari Ini',
    hearingTime: c.hearing_time || '10:00 WIB',
    courtRoomName: c.court_room_name || 'Ruang Sidang Utama Kartika PNAF',
    targetAssetDescription: c.target_asset_description || null,
    verdictNotes: c.verdict_notes || '',
    verdictType: inferredVerdictType,
    verdictAwardedAmount: Number(c.verdict_awarded_amount || 0),
    roomStatus: isDecided ? 'VERDICT_DELIVERED' : (c.room_status || 'WAITING_PRESENCE'),
    plaintiffPresent: c.plaintiff_present === 1,
    defendantPresent: c.defendant_present === 1,
    summonsSent: c.summons_sent === 1,
    closedAt: c.closed_at || null,
    createdAt: c.created_at || '',
    decidedBy: c.decided_by || null,
    botStage: Number(c.bot_stage || 0),
    deedId: c.deed_id || null,
    deedNumber: deedNumber || null,
    lawyerName: c.lawyer_name || null,
    lawyerFeeIb: Number(c.lawyer_fee_ib || 0),
    isConservatoirBeslag: c.is_conservatoir_beslag === 1,
    beslagAmountIb: Number(c.beslag_amount_ib || 0),
    isDecided,
    plaintiff: {
      id: c.plaintiff_user_id || '',
      name: c.plaintiff_name || 'Penggugat',
      present: c.plaintiff_present === 1,
    },
    defendant: {
      id: c.defendant_user_id || '',
      name: c.defendant_name || 'Tergugat',
      present: c.defendant_present === 1,
    },
  };

  if (messages !== undefined) {
    result.messages = (messages || []).map(formatCourtMessage);
  }
  return result;
}

async function isAutoJudgeEnabled() {
  try {
    const row = await query.get(
      'SELECT value FROM central_bank_settings WHERE key = ?',
      [AUTO_JUDGE_SETTING_KEY]
    );
    if (!row) {
      await query.run(
        'INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES (?, ?)',
        [AUTO_JUDGE_SETTING_KEY, 'true']
      );
      return true;
    }
    return String(row.value).toLowerCase() === 'true' || String(row.value) === '1';
  } catch (_) {
    return true;
  }
}

async function setAutoJudgeEnabled(enabled) {
  const val = enabled ? 'true' : 'false';
  await query.run(
    'INSERT OR REPLACE INTO central_bank_settings (key, value) VALUES (?, ?)',
    [AUTO_JUDGE_SETTING_KEY, val]
  );
  return enabled;
}

async function getAutoJudgeStatusPayload() {
  const enabled = await isAutoJudgeEnabled();
  const inTrialRow = await query.get("SELECT COUNT(*) as count FROM court_cases WHERE status = 'IN_TRIAL'");
  const botDecidedRow = await query.get("SELECT COUNT(*) as count FROM court_cases WHERE decided_by = 'BOT_JUDGE'");
  const totalDecidedRow = await query.get("SELECT COUNT(*) as count FROM court_cases WHERE status != 'IN_TRIAL'");
  return {
    enabled,
    mode: enabled ? 'AUTO_BOT' : 'MANUAL_ADMIN',
    judgeName: BOT_JUDGE_NAME,
    clerkName: BOT_CLERK_NAME,
    activeInTrialCount: inTrialRow?.count || 0,
    totalDecidedByBot: botDecidedRow?.count || 0,
    totalDecided: totalDecidedRow?.count || 0,
    cycleSeconds: 15,
  };
}

async function resolveLinkedDeed(courtCase) {
  if (!courtCase) return null;
  if (courtCase.deed_id) {
    const byId = await query.get('SELECT * FROM deal_deeds WHERE id = ?', [courtCase.deed_id]);
    if (byId) return byId;
  }
  const deedNum = courtCase.deed_number || extractDeedNumberFromTitle(courtCase.title);
  if (deedNum) {
    const byNum = await query.get('SELECT * FROM deal_deeds WHERE deed_number = ?', [deedNum]);
    if (byNum) return byNum;
  }
  return null;
}

async function appendCourtChat(io, { caseId, senderName, senderRole, senderUserId = null, message }) {
  const msgId = uuidv4();
  const nowIso = new Date().toISOString();
  await query.run(
    'INSERT INTO court_chat_messages (id, case_id, sender_name, sender_role, sender_user_id, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [msgId, caseId, senderName, senderRole, senderUserId, message, nowIso]
  );
  const formatted = formatCourtMessage({
    id: msgId,
    case_id: caseId,
    sender_name: senderName,
    sender_role: senderRole,
    sender_user_id: senderUserId,
    message,
    created_at: nowIso,
  });
  if (io) {
    io.emit(`court:new_message:${caseId}`, formatted);
  }
  return formatted;
}

async function dispatchInboxNotification(io, { userId, senderName, category, title, message, referenceId }) {
  if (!userId) return;
  try {
    const id = uuidv4();
    const nowIso = new Date().toISOString();
    await query.run(
      `INSERT INTO user_inbox (id, user_id, sender_name, category, title, message, reference_id, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, userId, senderName || 'Majelis Hakim Arbitrase PNAF', category || 'COURT', title, message, referenceId || null, nowIso]
    );
    if (io) {
      io.to(userId).emit('user:new_inbox', {
        id,
        senderName: senderName || 'Majelis Hakim Arbitrase PNAF',
        category: category || 'COURT',
        title,
        message,
        referenceId,
        created_at: nowIso,
      });
      io.emit('user:inbox_updated', { userId });
    }
  } catch (err) {
    console.error('Error dispatching inbox notification:', err);
  }
}

/**
 * Memperbarui jam terbang dan catatan kemenangan advokat secara dinamis.
 * Kemenangan meningkatkan reputasi dan menaikkan tarif jasa secara otomatis!
 */
async function recordLawyerCaseOutcome(lawyerName, didWin) {
  if (!lawyerName) return;
  try {
    let lawyerId = null;
    if (lawyerName.includes('Sagala')) lawyerId = 'lawyer-sagala';
    else if (lawyerName.includes('Bintang')) lawyerId = 'lawyer-bintang';
    else if (lawyerName.includes('Azzahra')) lawyerId = 'lawyer-azzahra';

    if (lawyerId) {
      const row = await query.get('SELECT * FROM lawyer_profiles WHERE id = ?', [lawyerId]);
      if (row) {
        const newHandled = (row.cases_handled || 0) + 1;
        const newWon = (row.cases_won || 0) + (didWin ? 1 : 0);
        const newWinRate = Math.round((newWon / newHandled) * 1000) / 10;
        // Jam terbang & kemenangan menaikkan prestige fee secara dinamis (+1.5% per kemenangan)
        const prestigeFactor = Math.min(3.0, 1 + (newWon * 0.015));
        const newCurrentFee = Math.round((row.base_fee_ib || 50000000) * prestigeFactor);
        const newRetainer7d = Math.round((row.retainer_fee_7d_ib || 150000000) * prestigeFactor);
        const newRetainer30d = Math.round((row.retainer_fee_30d_ib || 500000000) * prestigeFactor);

        await query.run(
          `UPDATE lawyer_profiles 
           SET cases_handled = ?, cases_won = ?, win_rate = ?, current_fee_ib = ?, retainer_fee_7d_ib = ?, retainer_fee_30d_ib = ?
           WHERE id = ?`,
          [newHandled, newWon, newWinRate, newCurrentFee, newRetainer7d, newRetainer30d, lawyerId]
        );
        console.log(`⚖️ [Dynamic Lawyer] ${row.name} outcome: Win=${didWin}, Total=${newWon}/${newHandled} (${newWinRate}%), Fee=IB ${newCurrentFee.toLocaleString('id-ID')}`);
      }
    }
  } catch (err) {
    console.error('Error updating lawyer outcome:', err);
  }
}

/**
 * Satu pintu eksekusi Ketuk Palu Putusan Pengadilan Niaga Federasi (PNAF)
 * Dipakai oleh:
 *  - Web Admin (/api/court/verdict & /api/court/room/verdict)
 *  - Mobile APK Admin/Hakim (/api/court/room/verdict & /api/court/verdict)
 *  - Majelis Hakim Bot Otomatis PNAF (CourtJudgeBotService)
 */
async function executeCourtVerdict(
  io,
  {
    caseId,
    verdictStatus,
    verdictType,
    verdictNotes,
    customAwardedAmount = undefined,
    decidedBy = 'ADMIN_MANUAL',
    broadcastNews = true,
  }
) {
  const c = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
  if (!c) {
    throw new Error('Perkara tidak ditemukan');
  }

  // Opsi membuka kembali perkara ke IN_TRIAL oleh Admin
  if (verdictStatus === 'IN_TRIAL') {
    const reopenNotes = verdictNotes || 'Perkara dibuka kembali untuk pemeriksaan lanjutan oleh Majelis Hakim PNAF.';
    await query.run(
      `UPDATE court_cases
       SET status = 'IN_TRIAL',
           verdict_notes = ?,
           verdict_type = NULL,
           room_status = 'IN_SESSION',
           closed_at = NULL,
           bot_stage = 1
       WHERE id = ?`,
      [reopenNotes, caseId]
    );
    await appendCourtChat(io, {
      caseId,
      senderName: BOT_CLERK_NAME,
      senderRole: 'PANITERA',
      message: `🔄 SIDANG DIBUKA KEMBALI: ${reopenNotes}`,
    });
    const reopened = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
    const formattedReopened = formatCourtCase(reopened);
    if (io) {
      io.emit('court:verdict', formattedReopened);
      io.emit('court:case_updated', formattedReopened);
    }
    return {
      success: true,
      case: formattedReopened,
      verdictStatus: 'IN_TRIAL',
      verdictType: null,
      awardedAmount: 0,
      notes: reopenNotes,
    };
  }

  // Tentukan finalStatus & finalType secara konsisten
  let finalStatus = verdictStatus ? normalizeStatus(verdictStatus) : null;
  let finalType = verdictType || null;
  let courtShortfallIb = 0;

  if (!finalStatus && finalType) {
    if (finalType === 'APPROVED_PLAINTIFF_WIN') {
      finalStatus = 'VERDICT_APPROVED';
    } else if (finalType === 'VERSTEK_PLAINTIFF_WIN') {
      finalStatus = c.case_type === 'BANKRUPTCY' ? 'VERDICT_PAILIT' : 'VERDICT_APPROVED';
    } else if (finalType === 'SETTLED_MEDIATION') {
      finalStatus = 'VERDICT_PKPU';
    } else if (finalType === 'VERDICT_PAILIT') {
      finalStatus = 'VERDICT_PAILIT';
    } else {
      finalStatus = 'VERDICT_REJECTED';
    }
  }

  if (!finalStatus) {
    // Evaluasi kehadiran jika tidak dikirim keduanya
    if (c.plaintiff_present === 1 && c.defendant_present === 0) {
      finalStatus = 'VERDICT_APPROVED';
      finalType = 'VERSTEK_PLAINTIFF_WIN';
    } else if (c.plaintiff_present === 0 && c.defendant_present === 1) {
      finalStatus = 'VERDICT_REJECTED';
      finalType = 'GUGUR_DISMISSED';
    } else {
      finalStatus = 'VERDICT_APPROVED';
      finalType = 'APPROVED_PLAINTIFF_WIN';
    }
  }

  if (!finalType) {
    if (finalStatus === 'VERDICT_APPROVED') finalType = 'APPROVED_PLAINTIFF_WIN';
    else if (finalStatus === 'VERDICT_PAILIT') finalType = 'VERSTEK_PLAINTIFF_WIN';
    else if (finalStatus === 'VERDICT_PKPU') finalType = 'SETTLED_MEDIATION';
    else finalType = 'GUGUR_DISMISSED';
  }

  const rawClaim = Math.max(0, Number(c.claim_amount_ib || 0));
  const linkedDeed = await resolveLinkedDeed(c);

  // Hitung nilai kompensasi / pencairan yang sah
  let awardedAmount = 0;
  if (customAwardedAmount !== undefined && customAwardedAmount !== null) {
    awardedAmount = Math.max(0, Math.round(Number(customAwardedAmount) || 0));
  } else if (finalStatus === 'VERDICT_APPROVED' || finalStatus === 'VERDICT_PAILIT') {
    if (c.case_type === 'BANKRUPTCY' && /BCF|Bank Sentral|PKPU|Restrukturisasi/i.test(`${c.defendant_name} ${c.title}`) && c.plaintiff_user_id) {
      // Permohonan PKPU / restrukturisasi utang oleh debitur: efeknya moratorium pinjaman, bukan pencairan uang tunai gratis
      awardedAmount = 0;
    } else {
      // Sesuai tuntutan di persidangan secara penuh tanpa pembatasan yang mengecilkan tuntutan sidang
      awardedAmount = Math.round(rawClaim);
    }
  } else if (finalStatus === 'VERDICT_PKPU') {
    if (c.case_type === 'BANKRUPTCY' && /BCF|Bank Sentral|PKPU|Restrukturisasi/i.test(`${c.defendant_name} ${c.title}`) && c.plaintiff_user_id) {
      awardedAmount = 0;
    } else {
      awardedAmount = Math.round(rawClaim * 0.5);
    }
  } else {
    awardedAmount = 0;
  }

  // Susun diktum amar putusan resmi apabila catatan masih default/kosong
  const isDefaultFilingNote =
    !verdictNotes ||
    /^Penggugat menuntut/i.test(verdictNotes.trim()) ||
    /^Berkas perkara telah diterima/i.test(verdictNotes.trim()) ||
    /^Permohonan gugatan resmi/i.test(verdictNotes.trim());

  const judgeLabel = decidedBy === 'BOT_JUDGE' ? `Majelis Hakim Arbitrase PNAF (${BOT_JUDGE_NAME})` : 'Majelis Hakim Agung PNAF';
  let finalNotes = verdictNotes && !isDefaultFilingNote ? verdictNotes.trim() : '';

  if (!finalNotes) {
    if (finalStatus === 'VERDICT_APPROVED') {
      finalNotes =
        awardedAmount > 0
          ? `✅ AMAR PUTUSAN DIKABULKAN (APPROVED): ${judgeLabel} mengabulkan gugatan Penggugat (${c.plaintiff_name}) terhadap Tergugat (${c.defendant_name}). Memerintahkan eksekusi pencairan ganti rugi sebesar IB ${awardedAmount.toLocaleString('id-ID')} ke Kas Pribadi Penggugat.`
          : `✅ AMAR PUTUSAN DIKABULKAN (APPROVED): ${judgeLabel} mengabulkan permohonan hukum Penggugat (${c.plaintiff_name}) secara sah dan berkekuatan hukum tetap (inkrah).`;
    } else if (finalStatus === 'VERDICT_PKPU') {
      finalNotes =
        awardedAmount > 0
          ? `🤝 PUTUSAN MEDIASI & PKPU DISETUJUI: ${judgeLabel} menetapkan perdamaian restrukturisasi perkara antara ${c.plaintiff_name} dan ${c.defendant_name} dengan pencairan kompensasi sebesar IB ${awardedAmount.toLocaleString('id-ID')}.`
          : `🤝 PUTUSAN PKPU DISETUJUI: ${judgeLabel} mengabulkan moratorium penundaan kewajiban pembayaran utang (PKPU) dan restrukturisasi tenor kredit Penggugat.`;
    } else if (finalStatus === 'VERDICT_PAILIT') {
      finalNotes =
        awardedAmount > 0
          ? `🔨 VONIS PAILIT & SITA EKSEKUSI: ${judgeLabel} menjatuhkan putusan pailit/verstek terhadap ${c.defendant_name} dan mengeksekusi klaim sebesar IB ${awardedAmount.toLocaleString('id-ID')} untuk ${c.plaintiff_name}.`
          : `🔨 VONIS PAILIT & SITA JAMINAN: ${judgeLabel} menyatakan Tergugat (${c.defendant_name}) dalam keadaan pailit dan memerintahkan Kurator PNAF mengeksekusi aset jaminan.`;
    } else {
      finalNotes = `❌ PUTUSAN DITOLAK / GUGUR: ${judgeLabel} menolak/menggugurkan gugatan Perkara No. ${c.case_number} setelah memeriksa fakta hukum persidangan.`;
    }
  }

  // Eksekusi pencairan finansial HANYA jika belum pernah dicairkan sebelumnya
  const previouslyAwarded = Number(c.verdict_awarded_amount || 0);
  const alreadyDelivered = c.room_status === 'VERDICT_DELIVERED' && previouslyAwarded > 0;

  let plaintiffId = c.plaintiff_user_id;
  if (!plaintiffId && c.plaintiff_company_id) {
    const matchedComp = await query.get('SELECT owner_id FROM companies WHERE id = ?', [c.plaintiff_company_id]);
    if (matchedComp && matchedComp.owner_id) {
      plaintiffId = matchedComp.owner_id;
      await query.run('UPDATE court_cases SET plaintiff_user_id = ? WHERE id = ?', [plaintiffId, caseId]);
    }
  }
  if (!plaintiffId && c.plaintiff_name) {
    const atMatch = c.plaintiff_name.match(/@([a-zA-Z0-9_]+)/);
    if (atMatch) {
      const u = await query.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [atMatch[1]]);
      if (u) {
        plaintiffId = u.id;
        await query.run('UPDATE court_cases SET plaintiff_user_id = ? WHERE id = ?', [plaintiffId, caseId]);
      }
    }
    if (!plaintiffId) {
      const rawUsername = c.plaintiff_name.split('(')[0].trim();
      const matchedPl = await query.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [rawUsername]);
      if (matchedPl) {
        plaintiffId = matchedPl.id;
        await query.run('UPDATE court_cases SET plaintiff_user_id = ? WHERE id = ?', [plaintiffId, caseId]);
      }
    }
    if (!plaintiffId) {
      const cleanName = c.plaintiff_name.replace(/PT\.|\(.*\)|@/gi, '').trim();
      const comp = await query.get(
        'SELECT id, owner_id FROM companies WHERE LOWER(symbol) = LOWER(?) OR LOWER(name) LIKE LOWER(?) LIMIT 1',
        [cleanName, `%${cleanName}%`]
      );
      if (comp && comp.owner_id) {
        plaintiffId = comp.owner_id;
        await query.run('UPDATE court_cases SET plaintiff_user_id = ?, plaintiff_company_id = ? WHERE id = ?', [plaintiffId, comp.id, caseId]);
      }
    }
  }

  // SANKSI PENCEMARAN NAMA BAIK (REKONVENSI) JIKA GUGATAN DITOLAK
  if (finalStatus === 'VERDICT_REJECTED' && !alreadyDelivered) {
    const rawClaim = Number(c.claim_amount_ib || c.claimed_amount || 0);
    let defamationFine = Math.round(rawClaim * 0.10);
    if (defamationFine < 10000000) defamationFine = 10000000; // Min IB 10 Juta
    if (defamationFine > 100000000) defamationFine = 100000000; // Max IB 100 Juta

    finalNotes = `❌ PUTUSAN DITOLAK & SANKSI PENCEMARAN NAMA BAIK: ${judgeLabel} menolak seluruh gugatan Perkara No. ${c.case_number}. Tergugat (${c.defendant_name}) dinyatakan TIDAK BERSALAH dan nama baiknya dipulihkan. Menghukum Penggugat (${c.plaintiff_name}) membayar denda pencemaran nama baik sebesar IB ${defamationFine.toLocaleString('id-ID')} kepada Tergugat.`;

    if (plaintiffId && c.defendant_user_id && plaintiffId !== c.defendant_user_id && !['admin-001', 'bank-central-bcf'].includes(plaintiffId)) {
      const plUser = await query.get('SELECT id, balance_ib, company_balance_ib, username FROM users WHERE id = ?', [plaintiffId]);
      const defUser = await query.get('SELECT id, balance_ib, username FROM users WHERE id = ?', [c.defendant_user_id]);

      if (plUser && defUser) {
        let plBal = Number(plUser.balance_ib || 0);
        let plCompBal = Number(plUser.company_balance_ib || 0);
        let deductPersonal = Math.min(plBal, defamationFine);
        // Denda tidak boleh menyeret kas PT ke zona defisit/bangkrut: hanya dipotong sebatas kas PT yang positif
        let deductComp = Math.min(Math.max(0, plCompBal), defamationFine - deductPersonal);
        let newPlBal = Math.max(0, plBal - deductPersonal);
        let newPlCompBal = plCompBal - deductComp;

        await query.run('UPDATE users SET balance_ib = ?, company_balance_ib = ? WHERE id = ?', [newPlBal, newPlCompBal, plUser.id]);
        if (deductComp > 0) {
          await query.run(
            `UPDATE companies SET company_balance_ib = company_balance_ib - ?
             WHERE id = (SELECT c.id FROM companies c JOIN users u ON u.id = c.owner_id
                         WHERE c.owner_id = ? ORDER BY (c.symbol = u.pt_symbol OR c.name = u.pt_name) DESC LIMIT 1)`,
            [deductComp, plUser.id]
          );
        }

        const newDefBal = Number(defUser.balance_ib || 0) + defamationFine;
        await query.run('UPDATE users SET balance_ib = ? WHERE id = ?', [newDefBal, defUser.id]);

        await recordCashFlow({
          userId: plUser.id,
          accountType: 'PERSONAL',
          category: 'COURT_FINE',
          title: `Denda Pencemaran Nama Baik PNAF (${c.case_number})`,
          amountIb: defamationFine,
          direction: 'EXPENSE',
          balanceAfter: newPlBal,
          notes: `Gugatan terhadap ${c.defendant_name} tidak terbukti. Kewajiban ganti rugi reputasi.`,
        });

        await recordCashFlow({
          userId: defUser.id,
          accountType: 'PERSONAL',
          category: 'COURT_VERDICT',
          title: `Kompensasi Pemulihan Nama Baik PNAF (${c.case_number})`,
          amountIb: defamationFine,
          direction: 'INCOME',
          balanceAfter: newDefBal,
          notes: `Ganti rugi pencemaran nama baik dari ${c.plaintiff_name} setelah gugatan ditolak.`,
        });

        await dispatchInboxNotification(io, {
          userId: plUser.id,
          senderName: 'Majelis Hakim Arbitrase PNAF',
          category: 'COURT',
          title: `⚖️ Gugatan Ditolak: Denda Pencemaran Nama Baik (${c.case_number})`,
          message: `Majelis Hakim PNAF menolak seluruh gugatan Anda terhadap ${c.defendant_name} karena tidak memiliki bukti hukum sah. Anda dijatuhi sanksi ganti rugi pencemaran nama baik sebesar IB ${defamationFine.toLocaleString('id-ID')} yang telah didebit dan diserahkan kepada Tergugat.`,
          referenceId: caseId,
        });

        await dispatchInboxNotification(io, {
          userId: defUser.id,
          senderName: 'Majelis Hakim Arbitrase PNAF',
          category: 'COURT',
          title: `🛡️ Gugatan Ditolak: Nama Baik Dipulihkan (${c.case_number})`,
          message: `Kabar baik! Majelis Hakim PNAF menolak gugatan ${c.plaintiff_name} terhadap Anda. Nama baik Anda dipulihkan dan kompensasi ganti rugi pencemaran nama baik sebesar IB ${defamationFine.toLocaleString('id-ID')} telah disetorkan ke saldo Anda!`,
          referenceId: caseId,
        });

        if (io) {
          io.emit('user:balance_updated', { userId: plUser.id, newBalance: newPlBal });
          io.emit('user:balance_updated', { userId: defUser.id, newBalance: newDefBal });
        }
      }
    }

    // Jika belum terkirim pesan notifikasi (misal karena denda tidak berlaku / non-pemain):
    const alreadyNotified = await query.get('SELECT 1 FROM user_inbox WHERE reference_id = ? LIMIT 1', [caseId]);
    if (!alreadyNotified) {
      if (plaintiffId) {
        await dispatchInboxNotification(io, {
          userId: plaintiffId,
          senderName: 'Majelis Hakim Arbitrase PNAF',
          category: 'COURT',
          title: `⚖️ Putusan Sidang: Gugatan Ditolak (${c.case_number})`,
          message: `Majelis Hakim PNAF memutuskan MENOLAK seluruh gugatan Anda terhadap ${c.defendant_name}. Amar Putusan: ${finalNotes}`,
          referenceId: caseId,
        });
      }
      if (c.defendant_user_id) {
        await dispatchInboxNotification(io, {
          userId: c.defendant_user_id,
          senderName: 'Majelis Hakim Arbitrase PNAF',
          category: 'COURT',
          title: `🛡️ Putusan Sidang: Gugatan Lawan Ditolak (${c.case_number})`,
          message: `Kabar baik! Majelis Hakim PNAF menolak seluruh gugatan yang diajukan oleh ${c.plaintiff_name}. Perseroan dan rekening Anda dinyatakan bebas dari segala tuntutan perkara ini.`,
          referenceId: caseId,
        });
      }
    }
  }

  // NOTIFIKASI RESTUKTURISASI / PERDAMAIAN PKPU
  if (finalStatus === 'VERDICT_PKPU' && !alreadyDelivered) {
    if (plaintiffId) {
      await dispatchInboxNotification(io, {
        userId: plaintiffId,
        senderName: 'Majelis Hakim Arbitrase PNAF',
        category: 'COURT',
        title: `🤝 Putusan PKPU & Perdamaian Disahkan (${c.case_number})`,
        message: `Majelis Hakim PNAF telah mengesahkan permohonan perdamaian/moratorium PKPU antara Anda dan ${c.defendant_name}. Amar Putusan: ${finalNotes}`,
        referenceId: caseId,
      });
    }
    if (c.defendant_user_id) {
      await dispatchInboxNotification(io, {
        userId: c.defendant_user_id,
        senderName: 'Majelis Hakim Arbitrase PNAF',
        category: 'COURT',
        title: `🤝 Putusan PKPU & Moratorium Utang Disahkan (${c.case_number})`,
        message: `Majelis Hakim PNAF telah mengesahkan moratorium restrukturisasi utang PKPU perseroan Anda. Kewajiban utang disesuaikan dengan amar putusan pengadilan.`,
        referenceId: caseId,
      });
    }
  }

  if (!alreadyDelivered && awardedAmount > 0) {
    if (plaintiffId) {
      const plUser = await query.get('SELECT id, balance_ib, username FROM users WHERE id = ?', [plaintiffId]);
      if (plUser) {
        const newPlBalance = (Number(plUser.balance_ib) || 0) + awardedAmount;
        await query.run('UPDATE users SET balance_ib = ? WHERE id = ?', [newPlBalance, plUser.id]);
        await recordCashFlow({
          userId: plUser.id,
          accountType: 'PERSONAL',
          category: 'COURT_VERDICT',
          title: `Pencairan Putusan PNAF (${c.case_number})`,
          amountIb: awardedAmount,
          direction: 'INCOME',
          balanceAfter: newPlBalance,
          notes: finalNotes,
        });
        await dispatchInboxNotification(io, {
          userId: plUser.id,
          senderName: 'Majelis Hakim Arbitrase PNAF',
          category: 'COURT',
          title: `✅ Putusan Dikabulkan: Kompensasi IB ${awardedAmount.toLocaleString('id-ID')} (${c.case_number})`,
          message: `Majelis Hakim PNAF mengabulkan gugatan Anda terhadap ${c.defendant_name}. Dana ganti rugi sebesar IB ${awardedAmount.toLocaleString('id-ID')} telah disetorkan ke Kas Rekening Anda.`,
          referenceId: caseId,
        });
        if (io) {
          io.emit('user:balance_updated', { userId: plUser.id, newBalance: newPlBalance });
        }
      }
    } else {
      // Jika Penggugat adalah Bank Sentral / Kas Negara / Otoritas Publik: Setor ganti rugi ke Kas Negara!
      await query.run(
        `INSERT INTO state_treasury_ledger (id, source_type, title, amount_ib, direction, reference_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          'COURT_FINE',
          `Penerimaan Eksekusi Ganti Rugi Putusan PNAF (${c.case_number})`,
          awardedAmount,
          'INCOME',
          caseId,
          `Eksekusi putusan terhadap ${c.defendant_name}`
        ]
      );
      if (io) io.emit('treasury:updated');
    }

    courtShortfallIb = 0;
    if (c.defendant_user_id && c.defendant_user_id !== plaintiffId && !['admin-001', 'bank-central-bcf'].includes(c.defendant_user_id)) {
      const defUser = await query.get('SELECT id, balance_ib, company_balance_ib FROM users WHERE id = ?', [c.defendant_user_id]);
      if (defUser) {
        let remainingToDeduct = awardedAmount;

        // 1. Ambil dari Kas Perusahaan Tergugat terlebih dahulu hingga batas saldo kas tersedia
        let compBal = Number(defUser.company_balance_ib) || 0;
        let compDeduct = Math.min(Math.max(0, compBal), remainingToDeduct);
        const newDefComp = Math.max(0, compBal - compDeduct);
        remainingToDeduct -= compDeduct;

        // 2. Jika kas PT belum cukup, ambil dari Kas Pribadi Tergugat
        const personalBal = Number(defUser.balance_ib) || 0;
        let personalDeduct = Math.min(Math.max(0, personalBal), remainingToDeduct);
        const newDefPersonal = Math.max(0, personalBal - personalDeduct);
        remainingToDeduct -= personalDeduct;

        // Sisa kekurangan yang tidak dapat dibayar secara tunai (Shortfall)
        courtShortfallIb = remainingToDeduct;

        await query.run(
          'UPDATE users SET balance_ib = ?, company_balance_ib = ? WHERE id = ?',
          [newDefPersonal, newDefComp, defUser.id]
        );

        // Jika Tergugat memiliki baris di companies, sinkronkan juga kas PT-nya
        // Sinkronkan kas PT Utama saja (jangan menimpa saldo seluruh anak perusahaan milik Tergugat!)
        await query.run(
          `UPDATE companies SET company_balance_ib = ?
           WHERE id = (SELECT c.id FROM companies c JOIN users u ON u.id = c.owner_id
                       WHERE c.owner_id = ? ORDER BY (c.symbol = u.pt_symbol OR c.name = u.pt_name) DESC LIMIT 1)`,
          [newDefComp, defUser.id]
        );

        if (personalDeduct > 0) {
          await recordCashFlow({
            userId: defUser.id,
            accountType: 'PERSONAL',
            category: 'COURT_VERDICT',
            title: `Eksekusi Ganti Rugi Putusan PNAF (${c.case_number})`,
            amountIb: personalDeduct,
            direction: 'EXPENSE',
            balanceAfter: newDefPersonal,
            notes: finalNotes,
          });
        }
        if (compDeduct > 0) {
          await recordCashFlow({
            userId: defUser.id,
            accountType: 'COMPANY',
            category: 'COURT_VERDICT',
            title: `Penyitaan Kas Perseroan Putusan PNAF (${c.case_number})`,
            amountIb: compDeduct,
            direction: 'EXPENSE',
            balanceAfter: compBal,
            notes: `Sanksi putusan pengadilan niaga atas perkara ${c.case_number}`,
          });
        }

        await dispatchInboxNotification(io, {
          userId: defUser.id,
          senderName: 'Majelis Hakim Arbitrase PNAF',
          category: 'COURT',
          title: `🔨 Vonis Pengadilan PNAF (${c.case_number})`,
          message: `Majelis Hakim PNAF menjatuhkan putusan bersalah atas perkara ${c.case_number}. Dana ganti rugi sebesar IB ${awardedAmount.toLocaleString('id-ID')} telah dieksekusi dari kas Anda.`,
          referenceId: caseId,
        });

        if (io) {
          io.emit('user:balance_updated', { userId: defUser.id, newBalance: newDefPersonal });
        }
      }
    }
  }

  // PEMULIHAN KEPEMILIKAN SAHAM JIKA GUGATAN SENGKETA SAHAM / PENIPUAN DIKABULKAN
  const isStockDispute = /saham|penipuan|ambil alih|pengalihan|sengketa/i.test(`${c.title || ''} ${c.case_type || ''} ${c.notes || ''}`);
  if (finalStatus === 'VERDICT_APPROVED' && isStockDispute && plaintiffId && c.defendant_user_id && plaintiffId !== c.defendant_user_id) {
    try {
      let targetComp = null;
      if (c.defendant_company_id) {
        targetComp = await query.get('SELECT * FROM companies WHERE id = ?', [c.defendant_company_id]);
      }
      if (!targetComp) {
        targetComp = await query.get(
          `SELECT c.* FROM companies c
           INNER JOIN company_shareholders sh ON c.id = sh.company_id
           WHERE sh.user_id = ? AND (c.owner_id = ? OR EXISTS (SELECT 1 FROM company_shareholders sh2 WHERE sh2.company_id = c.id AND sh2.user_id = ?))
           LIMIT 1`,
          [c.defendant_user_id, plaintiffId, plaintiffId]
        );
      }
      if (!targetComp) {
        targetComp = await query.get('SELECT * FROM companies WHERE owner_id = ? LIMIT 1', [plaintiffId]);
      }

      if (targetComp) {
        const defSh = await query.get(
          'SELECT * FROM company_shareholders WHERE company_id = ? AND user_id = ?',
          [targetComp.id, c.defendant_user_id]
        );
        if (defSh && defSh.percentage > 0) {
          const pctMatch = (c.title || '').match(/(\d+(?:\.\d+)?)\s*%/);
          let pctToRecover = pctMatch ? parseFloat(pctMatch[1]) : 10.0;
          pctToRecover = Math.min(pctToRecover, defSh.percentage);

          const totalCompanyShares = Number(targetComp.total_shares) || 1000000;
          const sharesToRecover = Math.round((pctToRecover / 100) * totalCompanyShares);
          const lotsToRecover = Math.max(1, Math.floor(sharesToRecover / 100));

          const newDefPct = Math.max(0, parseFloat((defSh.percentage - pctToRecover).toFixed(1)));
          if (newDefPct <= 0.1) {
            await query.run('DELETE FROM company_shareholders WHERE id = ?', [defSh.id]);
          } else {
            await query.run(
              'UPDATE company_shareholders SET percentage = ?, shares_count = MAX(0, shares_count - ?) WHERE id = ?',
              [newDefPct, sharesToRecover, defSh.id]
            );
          }

          const plSh = await query.get(
            'SELECT * FROM company_shareholders WHERE company_id = ? AND user_id = ?',
            [targetComp.id, plaintiffId]
          );
          if (plSh) {
            const newPlPct = parseFloat((plSh.percentage + pctToRecover).toFixed(1));
            await query.run(
              'UPDATE company_shareholders SET percentage = ?, shares_count = shares_count + ? WHERE id = ?',
              [newPlPct, sharesToRecover, plSh.id]
            );
          } else {
            const plUser = await query.get('SELECT username FROM users WHERE id = ?', [plaintiffId]);
            await query.run(
              `INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id)
               VALUES (?, ?, ?, 'FOUNDER', ?, ?, ?)`,
              [uuidv4(), targetComp.id, `${plUser?.username || c.plaintiff_name} (Pendiri Terpulihkan)`, sharesToRecover, pctToRecover, plaintiffId]
            );
          }

          const defPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [c.defendant_user_id, targetComp.id]);
          if (defPort) {
            await query.run('UPDATE portfolios SET lots_owned = MAX(0, lots_owned - ?) WHERE id = ?', [lotsToRecover, defPort.id]);
          }
          const plPort = await query.get('SELECT * FROM portfolios WHERE user_id = ? AND company_id = ?', [plaintiffId, targetComp.id]);
          if (plPort) {
            await query.run('UPDATE portfolios SET lots_owned = lots_owned + ? WHERE id = ?', [lotsToRecover, plPort.id]);
          } else {
            await query.run(
              'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
              [uuidv4(), plaintiffId, targetComp.id, lotsToRecover, targetComp.current_price || 100]
            );
          }

          await dispatchInboxNotification(io, {
            userId: plaintiffId,
            senderName: 'Majelis Hakim Arbitrase PNAF',
            category: 'COURT',
            title: `📈 Pemulihan Saham Berhasil: ${pctToRecover}% ${targetComp.name}`,
            message: `Putusan inkrah Perkara No. ${c.case_number} membatalkan pengalihan sepihak oleh ${c.defendant_name}. Sebanyak ${pctToRecover}% saham (${sharesToRecover.toLocaleString('id-ID')} lbr / ${lotsToRecover} lot) resmi dikembalikan ke portofolio Anda!`,
            referenceId: caseId,
          });

          await dispatchInboxNotification(io, {
            userId: c.defendant_user_id,
            senderName: 'Majelis Hakim Arbitrase PNAF',
            category: 'COURT',
            title: `⚖️ Eksekusi Pengembalian Saham: ${pctToRecover}% ${targetComp.name}`,
            message: `Berdasarkan amar putusan Perkara No. ${c.case_number}, kepemilikan ${pctToRecover}% saham ${targetComp.name} Anda resmi dibatalkan dan dikembalikan kepada ${c.plaintiff_name}.`,
            referenceId: caseId,
          });

          finalNotes += ` [EKSEKUSI SAHAM: Memerintahkan pengembalian ${pctToRecover}% saham ${targetComp.name} (${targetComp.symbol}) dari Tergugat kepada Penggugat.]`;
        }
      }
    } catch (err) {
      console.error('Error in court stock recovery:', err);
    }
  }

  // SITA EKSEKUSI ASET & SAHAM PERUSAHAAN TERGUGAT JIKA TERBUKTI BERSALAH
  if (finalStatus === 'VERDICT_APPROVED' || finalStatus === 'VERDICT_PAILIT') {
    let targetComp = null;
    if (c.defendant_company_id) {
      targetComp = await query.get('SELECT * FROM companies WHERE id = ?', [c.defendant_company_id]);
    }
    if (!targetComp && c.defendant_user_id) {
      targetComp = await query.get(
        'SELECT * FROM companies WHERE owner_id = ? ORDER BY current_price DESC LIMIT 1',
        [c.defendant_user_id]
      );
    }
    if (!targetComp && c.defendant_name) {
      const cleanName = c.defendant_name.replace(/PT\.|\(.*\)|@/gi, '').trim();
      targetComp = await query.get(
        'SELECT * FROM companies WHERE LOWER(symbol) = LOWER(?) OR LOWER(name) LIKE LOWER(?) LIMIT 1',
        [cleanName, `%${cleanName}%`]
      );
    }

    // Deteksi apakah perkara menuntut pengalihan hak milik langsung kepada Penggugat
    const isTakeoverDemand = /ambil alih|hak milik|akuisisi|takeover|mencemarkan|fitnah|rekonvensi/i.test(
      `${c.target_asset_description || ''} ${c.notes || ''} ${c.title || ''}`
    );

    const hasShortfall = courtShortfallIb > 0;
    const shouldSeizeOrTransfer = (finalStatus === 'VERDICT_PAILIT') || hasShortfall || isTakeoverDemand;

    if (shouldSeizeOrTransfer && targetComp && plaintiffId && (isTakeoverDemand || hasShortfall) && targetComp.owner_id !== plaintiffId) {
      // === EKSEKUSI PENGALIHAN HAK MILIK SECARA LANGSUNG KEPADA PENGGUGAT ===
      const plUser = await query.get('SELECT id, username FROM users WHERE id = ?', [plaintiffId]);
      if (plUser) {
        const prevOwnerUsername = targetComp.owner_username || targetComp.founder_name || 'Tergugat';
        const prevOwnerId = targetComp.owner_id;
        const totalCompShares = Number(targetComp.total_shares) || 1000000000;
        const curPrice = Math.max(50, Number(targetComp.current_price || targetComp.base_price || 100));

        // Ambil kepemilikan saham Tergugat
        const defSh = prevOwnerId
          ? await query.get('SELECT * FROM company_shareholders WHERE company_id = ? AND user_id = ?', [targetComp.id, prevOwnerId])
          : null;
        const defHoldingPct = defSh ? Number(defSh.percentage || 100.0) : 100.0;
        const defSharesOwned = defSh ? Number(defSh.shares_count || Math.round((defHoldingPct / 100) * totalCompShares)) : Math.round((defHoldingPct / 100) * totalCompShares);
        const defSharesValueIb = defSharesOwned * curPrice;

        // KASUS 1: SITA SAHAM PROPORSIONAL (Jika nilai saham Tergugat cukup menutupi kekurangan kas)
        if (hasShortfall && courtShortfallIb < defSharesValueIb && !isTakeoverDemand) {
          let sharesToSeize = Math.ceil(courtShortfallIb / curPrice);
          sharesToSeize = Math.min(sharesToSeize, defSharesOwned);
          const lotsToSeize = Math.max(1, Math.floor(sharesToSeize / 100));
          const pctToSeize = parseFloat(((sharesToSeize / totalCompShares) * 100).toFixed(2));

          const remainingDefShares = Math.max(0, defSharesOwned - sharesToSeize);
          const remainingDefPct = parseFloat(Math.max(0, defHoldingPct - pctToSeize).toFixed(2));

          // 1. Kurangi saham Tergugat
          if (defSh) {
            await query.run(
              'UPDATE company_shareholders SET shares_count = ?, percentage = ? WHERE id = ?',
              [remainingDefShares, remainingDefPct, defSh.id]
            );
          }
          if (prevOwnerId) {
            await query.run(
              'UPDATE portfolios SET lots_owned = MAX(0, lots_owned - ?) WHERE user_id = ? AND company_id = ?',
              [lotsToSeize, prevOwnerId, targetComp.id]
            );
          }

          // 2. Tambahkan saham yang disita ke Penggugat
          const existingPlSh = await query.get(
            'SELECT id, shares_count, percentage FROM company_shareholders WHERE company_id = ? AND user_id = ?',
            [targetComp.id, plUser.id]
          );
          let newPlPct = pctToSeize;
          if (existingPlSh) {
            newPlPct = parseFloat((Number(existingPlSh.percentage) + pctToSeize).toFixed(2));
            await query.run(
              'UPDATE company_shareholders SET shares_count = shares_count + ?, percentage = ? WHERE id = ?',
              [sharesToSeize, newPlPct, existingPlSh.id]
            );
          } else {
            await query.run(
              `INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id) 
               VALUES (?, ?, ?, 'INVESTOR', ?, ?, ?)`,
              [uuidv4(), targetComp.id, `${plUser.username} (Eksekusi PNAF)`, sharesToSeize, pctToSeize, plUser.id]
            );
          }

          const plPort = await query.get('SELECT id, lots_owned FROM portfolios WHERE user_id = ? AND company_id = ?', [plUser.id, targetComp.id]);
          if (plPort) {
            await query.run('UPDATE portfolios SET lots_owned = lots_owned + ? WHERE id = ?', [lotsToSeize, plPort.id]);
          } else {
            await query.run(
              'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
              [uuidv4(), plUser.id, targetComp.id, lotsToSeize, curPrice]
            );
          }

          // 3. Status perseroan dipulihkan: Pengendali berganti jika porsi Penggugat lebih besar
          let newOwnerId = targetComp.owner_id;
          let newOwnerUsername = targetComp.owner_username;
          if (newPlPct > remainingDefPct) {
            newOwnerId = plUser.id;
            newOwnerUsername = plUser.username;
          }
          await query.run(
            `UPDATE companies 
             SET owner_id = ?, 
                 owner_username = ?, 
                 status = 'HEALTHY', 
                 is_seized = 0, 
                 is_auction_ready = 0,
                 seized_by = NULL,
                 seized_at = NULL,
                 seizure_deadline = NULL,
                 seize_reason = NULL
             WHERE id = ?`,
            [newOwnerId, newOwnerUsername, targetComp.id]
          );

          // 4. Kirim Notifikasi ke Kotak Pesan Penggugat & Tergugat
          await dispatchInboxNotification(io, {
            userId: plUser.id,
            senderName: 'Majelis Hakim Arbitrase PNAF',
            category: 'COURT',
            title: `⚖️ Sita Eksekusi Saham: Anda Menerima ${lotsToSeize.toLocaleString('id-ID')} Lot (${pctToSeize}%) Saham ${targetComp.name}`,
            message: `Amar Putusan No. ${c.case_number} telah dieksekusi! Karena kas tunai Tergugat (@${prevOwnerUsername}) hanya mencukupi sebagian ganti rugi, sisa kewajiban IB ${courtShortfallIb.toLocaleString('id-ID')} dieksekusi dari saham Tergugat sebanyak ${lotsToSeize.toLocaleString('id-ID')} Lot (${pctToSeize}%) dan diserahkan ke portofolio Anda!`,
            referenceId: caseId,
          });

          if (prevOwnerId) {
            await dispatchInboxNotification(io, {
              userId: prevOwnerId,
              senderName: 'Majelis Hakim Arbitrase PNAF',
              category: 'COURT',
              title: `⚖️ Eksekusi Sita Saham Perseroan (${targetComp.symbol})`,
              message: `Majelis Hakim PNAF mengeksekusi amar putusan No. ${c.case_number}. Karena sisa kekurangan denda IB ${courtShortfallIb.toLocaleString('id-ID')}, saham Anda pada ${targetComp.name} dipotong sebanyak ${lotsToSeize.toLocaleString('id-ID')} Lot (${pctToSeize}%) untuk melunasi kewajiban. Sisa ${Math.floor(remainingDefShares / 100).toLocaleString('id-ID')} Lot (${remainingDefPct}%) tetap menjadi hak milik Anda.`,
              referenceId: caseId,
            });
          }

          if (io) {
            io.emit('company:status_changed', { companyId: targetComp.id, status: 'HEALTHY', ownerId: newOwnerId, ownerUsername: newOwnerUsername });
            io.emit('company:seized_status', { companyId: targetComp.id, isSeized: false, reason: 'Pelunasan Eksekusi Sita Saham Proporsional' });
            io.emit('user:portfolio_updated', { userId: plUser.id });
            if (prevOwnerId) io.emit('user:portfolio_updated', { userId: prevOwnerId });
          }

          finalNotes += ` [SITA SAHAM PROPORSIONAL: Sisa kewajiban IB ${courtShortfallIb.toLocaleString('id-ID')} dilunasi lewat pemotongan ${lotsToSeize.toLocaleString('id-ID')} Lot (${pctToSeize}%) saham ${targetComp.name} (Porsi @${plUser.username}: ${newPlPct}%, Porsi @${prevOwnerUsername}: ${remainingDefPct}%).]`;
        } else {
          // KASUS 2: SITA PENUH 100% SAHAM TERGUGAT (Akibat tuntutan sita hak milik atau nilai seluruh saham Tergugat tidak mencukupi utang)
          await query.run(
            `UPDATE companies 
             SET owner_id = ?, 
                 owner_username = ?,
                 founder_name = ?, 
                 status = 'HEALTHY', 
                 is_seized = 0, 
                 is_auction_ready = 0, 
                 seized_by = NULL, 
                 seized_at = NULL, 
                 seizure_deadline = NULL, 
                 seize_reason = NULL 
             WHERE id = ?`,
            [plUser.id, plUser.username, plUser.username, targetComp.id]
          );

          if (prevOwnerId) {
            await query.run('DELETE FROM company_shareholders WHERE company_id = ? AND user_id = ?', [targetComp.id, prevOwnerId]);
          }
          const existingPlSh = await query.get('SELECT id FROM company_shareholders WHERE company_id = ? AND user_id = ?', [targetComp.id, plUser.id]);
          if (existingPlSh) {
            await query.run(
              `UPDATE company_shareholders 
               SET percentage = 100.0, holder_type = 'FOUNDER', holder_name = ? 
               WHERE id = ?`,
              [`${plUser.username} (Eksekusi Pengadilan)`, existingPlSh.id]
            );
          } else {
            await query.run(
              `INSERT INTO company_shareholders (id, company_id, holder_name, holder_type, shares_count, percentage, user_id) 
               VALUES (?, ?, ?, 'FOUNDER', ?, 100.0, ?)`,
              [uuidv4(), targetComp.id, `${plUser.username} (Eksekusi Pengadilan)`, totalCompShares, plUser.id]
            );
          }

          const totalLots = Math.max(1, Math.floor(totalCompShares / 100));
          if (prevOwnerId) {
            await query.run('UPDATE portfolios SET lots_owned = 0 WHERE user_id = ? AND company_id = ?', [prevOwnerId, targetComp.id]);
          }
          const plPort = await query.get('SELECT id FROM portfolios WHERE user_id = ? AND company_id = ?', [plUser.id, targetComp.id]);
          if (plPort) {
            await query.run('UPDATE portfolios SET lots_owned = lots_owned + ? WHERE id = ?', [totalLots, plPort.id]);
          } else {
            await query.run(
              'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
              [uuidv4(), plUser.id, targetComp.id, totalLots, curPrice]
            );
          }

          await dispatchInboxNotification(io, {
            userId: plUser.id,
            senderName: 'Majelis Hakim Arbitrase PNAF',
            category: 'COURT',
            title: `👑 Hak Milik Penuh Beralih: Anda Resmi Menguasai 100% ${targetComp.name}!`,
            message: `Amar Putusan Inkrah No. ${c.case_number} telah dieksekusi! Karena kas Tergugat (${c.defendant_name}) tidak mampu membayar sisa kewajiban IB ${courtShortfallIb.toLocaleString('id-ID')}, seluruh saham perseroan ${targetComp.name} (${targetComp.symbol}) resmi DIALIHKAN menjadi HAK MILIK ANDA!`,
            referenceId: caseId,
          });

          if (prevOwnerId) {
            await dispatchInboxNotification(io, {
              userId: prevOwnerId,
              senderName: 'Majelis Hakim Arbitrase PNAF',
              category: 'COURT',
              title: `⚖️ Sita Eksekusi Kepemilikan: PT. ${targetComp.name} Dialihkan ke Penggugat`,
              message: `Majelis Hakim PNAF mengeksekusi amar putusan No. ${c.case_number}. Karena saldo kas tidak mencukupi pelunasan ganti rugi, kepemilikan perseroan ${targetComp.name} (${targetComp.symbol}) telah diserahkan menjadi hak milik @${plUser.username}.`,
              referenceId: caseId,
            });
          }

          const takeoverNews = {
            id: uuidv4(),
            title: `👑 AKUISISI EKSEKUSI PNAF: Kendali ${targetComp.name} (${targetComp.symbol}) Resmi Menjadi Milik @${plUser.username}!`,
            content: `Kepaniteraan Eksekusi PNAF resmi mengalihkan saham dan kendali perseroan ${targetComp.name} dari Tergugat (@${prevOwnerUsername}) kepada Penggugat (@${plUser.username}) berdasarkan putusan inkrah No. ${c.case_number}. Saham perseroan dipulihkan aktif.`,
            affected_sector: targetComp.sector,
            sentiment: 'BULLISH',
            published_at: new Date().toISOString(),
          };
          await query.run(
            'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
            [takeoverNews.id, takeoverNews.title, takeoverNews.content, takeoverNews.affected_sector, takeoverNews.sentiment, takeoverNews.published_at]
          );

          if (io) {
            io.emit('market:news_broadcast', takeoverNews);
            io.emit('company:status_changed', { companyId: targetComp.id, status: 'HEALTHY', ownerId: plUser.id, ownerUsername: plUser.username });
            io.emit('company:seized_status', { companyId: targetComp.id, isSeized: false, reason: 'Pengalihan Hak Milik Putusan PNAF' });
            io.emit('user:portfolio_updated', { userId: plUser.id });
            if (prevOwnerId) io.emit('user:portfolio_updated', { userId: prevOwnerId });
          }

          finalNotes += ` [AKUISISI PAKSA EKSEKUSI: Kepemilikan perseroan ${targetComp.name} (${targetComp.symbol}) resmi dialihkan menjadi HAK MILIK Penggugat @${plUser.username} karena Tergugat gagal bayar.]`;
        }
      }
    } else if (shouldSeizeOrTransfer && targetComp && targetComp.is_seized !== 1 && (!plaintiffId || targetComp.owner_id !== plaintiffId)) {
      const now = new Date();
      const seizedAt = now.toISOString();
      const seizureDeadline = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
      const effectiveAward = Number(awardedAmount || c.verdict_awarded_amount || c.claim_amount_ib || 0);
      const formattedAward = effectiveAward > 0 ? ` [Tuntutan/Denda: IB ${effectiveAward.toLocaleString('id-ID')}]` : '';
      const scheduleTime = c.hearing_time || '10:00 WIB';
      const scheduleDate = c.court_hearing_date || 'Hari Ini';
      const reason = `Sita Eksekusi Putusan Hakim PNAF No. ${c.case_number} [Perkara: ${c.title}] [Penggugat: ${c.plaintiff_name}] [Tergugat: ${c.defendant_name}] [Waktu Sidang: ${scheduleTime}, ${scheduleDate}]${formattedAward} - Terbukti Bersalah`;

      await query.run(
        `UPDATE companies 
         SET is_seized = 1, 
             seized_by = 'Pengadilan Niaga & Arbitrase Federation (PNAF)', 
             seized_at = ?, 
             seizure_deadline = ?, 
             is_auction_ready = 1, 
             seize_reason = ?,
             status = CASE WHEN ? = 'VERDICT_PAILIT' THEN 'BANKRUPT' ELSE 'CRITICAL' END
         WHERE id = ?`,
        [seizedAt, seizureDeadline, reason, finalStatus, targetComp.id]
      );

      const seizureNews = {
        id: uuidv4(),
        title: `🚨 SITA EKSEKUSI PNAF: Saham & Aset ${targetComp.name} (${targetComp.symbol}) Resmi Disita Negara!`,
        content: `Kepaniteraan Eksekusi PNAF resmi menyita perseroan ${targetComp.name} milik Tergugat (${c.defendant_name}) setelah terbukti bersalah dalam Perkara No. ${c.case_number}. Saham perseroan kini masuk antrean Lelang BCF dan kas dibekukan.`,
        affected_sector: targetComp.sector,
        sentiment: 'BEARISH',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [seizureNews.id, seizureNews.title, seizureNews.content, seizureNews.affected_sector, seizureNews.sentiment, seizureNews.published_at]
      );
      if (io) {
        io.emit('market:news_broadcast', seizureNews);
        io.emit('company:seized_status', { companyId: targetComp.id, isSeized: true, reason, seizureDeadline });
        io.emit('company:status_changed', { companyId: targetComp.id, status: targetComp.status });
        io.emit('treasury:updated');
      }
    } else if (targetComp && (!shouldSeizeOrTransfer || (!hasShortfall && !isTakeoverDemand))) {
      finalNotes += ` [DENDA LUNAS TUNAI: Tergugat memiliki saldo kas cukup dan telah melunasi denda perkara IB ${(awardedAmount || 0).toLocaleString('id-ID')} secara tunai. Emiten ${targetComp.name} (${targetComp.symbol}) tetap beroperasi normal tanpa disita.]`;
    }
  }

  // Efek Hukum Nyata 1: Sinkronisasi Status Akta Notaris (deal_deeds)
  if (linkedDeed) {
    let nextDeedStatus = 'ACTIVE';
    if (finalStatus === 'VERDICT_APPROVED') nextDeedStatus = 'VERDICT_APPROVED';
    else if (finalStatus === 'VERDICT_PKPU') nextDeedStatus = 'SETTLED_PKPU';
    else if (finalStatus === 'VERDICT_PAILIT') nextDeedStatus = 'EXECUTED_PAILIT';
    else nextDeedStatus = 'ACTIVE';

    await query.run('UPDATE deal_deeds SET status = ? WHERE id = ?', [nextDeedStatus, linkedDeed.id]);
  }

  // Efek Hukum Nyata 2: Moratorium PKPU (+7 Hari Jatuh Tempo Pinjaman BCF) & Pemulihan Suspensi Emiten
  if ((finalStatus === 'VERDICT_APPROVED' || finalStatus === 'VERDICT_PKPU') && plaintiffId) {
    if (c.case_type === 'BANKRUPTCY') {
      const activeLoans = await query.all(
        "SELECT id, due_date FROM loans WHERE user_id = ? AND status = 'ACTIVE'",
        [plaintiffId]
      );
      for (const ln of activeLoans || []) {
        const baseMs = ln.due_date ? Date.parse(ln.due_date) : Date.now();
        const extendedIso = new Date((Number.isNaN(baseMs) ? Date.now() : Math.max(Date.now(), baseMs)) + 7 * 86400000).toISOString();
        await query.run('UPDATE loans SET due_date = ? WHERE id = ?', [extendedIso, ln.id]);
      }
      // PKPU debitur dikabulkan: rehabilitasi emiten yang dibekukan agar langsung terbuka
      if (/BCF|Bank Sentral|PKPU|Restrukturisasi/i.test(`${c.defendant_name} ${c.title}`) && finalStatus === 'VERDICT_APPROVED') {
        const frozenComps = await query.all(
          "SELECT id FROM companies WHERE owner_id = ? AND (is_seized = 1 OR status IN ('BANKRUPT','CRITICAL') OR COALESCE(company_balance_ib, 0) < 0)",
          [plaintiffId]
        );
        for (const fc of frozenComps || []) {
          const rehab = await rehabilitateCompanyAfterAppeal(io, fc.id, plaintiffId, c.case_number);
          if (rehab) finalNotes += ` [REHABILITASI ${rehab.companyName}: pembekuan dicabut & defisit IB ${rehab.clearedDeficitIb.toLocaleString('id-ID')} dihapus.]`;
        }
      }
    }
    if (c.case_type === 'REGULATORY' && finalStatus === 'VERDICT_APPROVED') {
      // Jika penggugat mengajukan banding pemulihan suspensi/UMA atas emitennya sendiri
      const plComp = c.defendant_company_id
        ? await query.get('SELECT * FROM companies WHERE id = ? AND owner_id = ?', [c.defendant_company_id, plaintiffId])
        : await query.get('SELECT * FROM companies WHERE owner_id = ?', [plaintiffId]);
      if (plComp && (plComp.uma_flag === 1 || plComp.suspended_at || plComp.status === 'SUSPENDED')) {
        await query.run(
          "UPDATE companies SET uma_flag = 0, uma_reason = NULL, suspended_at = NULL, suspend_until = NULL, suspend_reason = NULL, status = 'HEALTHY' WHERE id = ?",
          [plComp.id]
        );
      }
    }
    if ((c.case_type === 'DEFAMATION' || c.case_type === 'RECONVENTION') && finalStatus === 'VERDICT_APPROVED') {
      // Pemulihan nama baik emiten & pembatalan status sita PNAF / UMA jika gugatan banding & rekonvensi dikabulkan
      // Kumpulkan emiten yang direhabilitasi: emiten yang dirujuk perkara + SEMUA emiten penggugat yang sedang disita/bangkrut/defisit
      const rehabIds = new Set();
      if (c.plaintiff_company_id) rehabIds.add(c.plaintiff_company_id);
      if (plaintiffId) {
        const frozenComps = await query.all(
          "SELECT id FROM companies WHERE owner_id = ? AND (is_seized = 1 OR status IN ('BANKRUPT','CRITICAL') OR COALESCE(company_balance_ib, 0) < 0)",
          [plaintiffId]
        );
        for (const fc of frozenComps || []) rehabIds.add(fc.id);
        if (rehabIds.size === 0) {
          const anyPlComp = await query.get('SELECT id FROM companies WHERE owner_id = ? LIMIT 1', [plaintiffId]);
          if (anyPlComp) rehabIds.add(anyPlComp.id);
        }
      }
      for (const rid of rehabIds) {
        const rehab = await rehabilitateCompanyAfterAppeal(io, rid, plaintiffId, c.case_number);
        if (!rehab) continue;
        if (rehab.clearedDeficitIb > 0) {
          finalNotes += ` [REHABILITASI TOTAL ${rehab.companyName}: sita dicabut, denda/defisit IB ${rehab.clearedDeficitIb.toLocaleString('id-ID')} dihapus, perseroan dibuka kembali & operasional berjalan normal.]`;
        } else {
          finalNotes += ` [REHABILITASI TOTAL ${rehab.companyName}: sita & pembekuan dicabut, perseroan dibuka kembali & operasional berjalan normal.]`;
        }
      }
    }
  }

  const nowIso = new Date().toISOString();
  const effectiveAward = alreadyDelivered ? previouslyAwarded : awardedAmount;

  await query.run(
    `UPDATE court_cases
     SET status = ?,
         verdict_notes = ?,
         verdict_type = ?,
         verdict_awarded_amount = ?,
         room_status = 'VERDICT_DELIVERED',
         closed_at = COALESCE(closed_at, ?),
         decided_by = ?,
         bot_stage = 3,
         deed_id = COALESCE(deed_id, ?),
         deed_number = COALESCE(deed_number, ?)
     WHERE id = ?`,
    [
      finalStatus,
      finalNotes,
      finalType,
      effectiveAward,
      nowIso,
      decidedBy,
      linkedDeed?.id || null,
      linkedDeed?.deed_number || extractDeedNumberFromTitle(c.title) || null,
      caseId,
    ]
  );

  // Perbarui Rekor & Kemenangan Advokat Dinamis (Puja Azzahra, Zahra Bintang, Khairul Sagala)
  const isPlaintiffWin = finalStatus === 'VERDICT_APPROVED' || finalType === 'APPROVED_PLAINTIFF_WIN';
  const isDefendantWin = finalStatus === 'VERDICT_REJECTED' || finalType === 'GUGUR_DISMISSED';

  if (c.lawyer_name) {
    await recordLawyerCaseOutcome(c.lawyer_name, isPlaintiffWin);
  }
  if (c.defendant_lawyer_name) {
    await recordLawyerCaseOutcome(c.defendant_lawyer_name, isDefendantWin);
    if (c.defendant_user_id) {
      await dispatchInboxNotification(io, {
        userId: c.defendant_user_id,
        senderName: c.defendant_lawyer_name,
        category: 'COURT',
        title: isDefendantWin 
          ? `🛡️ Kemenangan Hukum: Gugatan Ditolak (${c.case_number})`
          : `⚖️ Laporan Pembelaan Sidang PNAF (${c.case_number})`,
        message: isDefendantWin
          ? `Kuasa Hukum Tetap Anda (${c.defendant_lawyer_name}) sukses memenangkan perkara melawan ${c.plaintiff_name} di persidangan PNAF saat Anda sedang offline! Tuduhan lawan ditolak dan reputasi perseroan Anda terlindungi.`
          : `Kuasa Hukum Tetap Anda (${c.defendant_lawyer_name}) telah hadir mendampingi perseroan Anda di persidangan PNAF melawan ${c.plaintiff_name}.`,
        referenceId: caseId
      });
    }
  }

  // Catat amar putusan resmi ke ruang chat sidang
  await appendCourtChat(io, {
    caseId,
    senderName: decidedBy === 'BOT_JUDGE' ? BOT_JUDGE_NAME : 'Majelis Hakim Ketua PNAF',
    senderRole: 'HAKIM',
    message: `🔨 PALU SIDANG DIKETUK 3 KALI — PUTUSAN INKRAH: ${finalNotes}`,
  });

  const updatedRow = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
  const allMessages = await query.all(
    'SELECT * FROM court_chat_messages WHERE case_id = ? ORDER BY created_at ASC',
    [caseId]
  );
  const formattedCase = formatCourtCase(updatedRow, allMessages);

  if (broadcastNews) {
    const statusHeadline =
      finalStatus === 'VERDICT_APPROVED'
        ? 'DIKABULKAN (APPROVED)'
        : finalStatus === 'VERDICT_PKPU'
        ? 'DAMAI / PKPU DISETUJUI'
        : finalStatus === 'VERDICT_PAILIT'
        ? 'VONIS PAILIT & SITA'
        : 'DITOLAK / GUGUR';

    const sentiment =
      finalStatus === 'VERDICT_APPROVED' || finalStatus === 'VERDICT_PKPU'
        ? 'BULLISH'
        : finalStatus === 'VERDICT_PAILIT'
        ? 'BEARISH'
        : 'NEUTRAL';

    const newsItem = {
      id: uuidv4(),
      title: `⚖️ PUTUSAN PNAF [${statusHeadline}]: Perkara No. ${c.case_number}`,
      content: finalNotes,
      affected_sector: 'Semua Sektor',
      affectedSector: 'Semua Sektor',
      sentiment,
      published_at: nowIso,
    };

    await query.run(
      'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
      [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
    );

    if (io) {
      io.emit('market:news_broadcast', newsItem);
      io.emit('market:breaking_news', newsItem);
    }
  }

  if (io) {
    io.emit('court:verdict', formattedCase);
    io.emit('court:case_updated', formattedCase);
    io.emit(`court:verdict_reached:${caseId}`, {
      caseId,
      verdictType: finalType,
      verdictStatus: finalStatus,
      notes: finalNotes,
      awardedAmount: effectiveAward,
      decidedBy,
      autoExitSeconds: 60,
      case: formattedCase,
    });
  }

  return {
    success: true,
    caseId,
    verdictStatus: finalStatus,
    verdictType: finalType,
    awardedAmount: effectiveAward,
    notes: finalNotes,
    case: formattedCase,
    message: `🔨 Palu Sidang Resmi Diketuk! Status Perkara: ${finalStatus}.`,
  };
}

/**
 * Auto-Healing Startup untuk memperbaiki perkara-perkara lama di DB produksi
 * yang sebelumnya diketuk palu lewat endpoint lama (sehingga room_status, verdict_type,
 * verdict_notes, dan status deal_deeds belum tersinkronisasi).
 */
async function healExistingCourtCases() {
  try {
    const allCases = await query.all('SELECT * FROM court_cases ORDER BY created_at ASC');
    const rewardedDeeds = new Set();

    // Tandai akta yang sudah pernah mendapatkan pencairan putusan
    for (const c of allCases) {
      const dNum = c.deed_number || extractDeedNumberFromTitle(c.title);
      if (dNum && Number(c.verdict_awarded_amount || 0) > 0) {
        rewardedDeeds.add(dNum);
      }
    }

    let healedCount = 0;
    for (const c of allCases) {
      const dNum = c.deed_number || extractDeedNumberFromTitle(c.title);

      // Lengkapi plaintiff_user_id jika kosong
      let plId = c.plaintiff_user_id;
      if (!plId && c.plaintiff_name) {
        const rawUname = c.plaintiff_name.split('(')[0].trim();
        const u = await query.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [rawUname]);
        if (u) {
          plId = u.id;
          await query.run('UPDATE court_cases SET plaintiff_user_id = ? WHERE id = ?', [plId, c.id]);
        }
      }

      if (c.status === 'IN_TRIAL') {
        if (dNum && !c.deed_number) {
          await query.run('UPDATE court_cases SET deed_number = ? WHERE id = ?', [dNum, c.id]);
        }
        continue;
      }

      // Perkara sudah diputus, cek apakah butuh normalisasi
      const normStatus = normalizeStatus(c.status);
      const needsHeal =
        c.status !== normStatus ||
        c.room_status !== 'VERDICT_DELIVERED' ||
        !c.verdict_type ||
        !c.closed_at ||
        /^Penggugat menuntut/i.test((c.verdict_notes || '').trim());

      if (!needsHeal) continue;

      // Untuk kasus sengketa akta pemain yang sebelumnya diketuk VERDICT_PAILIT oleh Admin (maksudnya memenangkan penggugat),
      // pastikan status & pencairan sinkron sekali per akta (tanpa duplikasi).
      let targetStatus = normStatus;
      let customAward = Number(c.verdict_awarded_amount || 0);

      if ((normStatus === 'VERDICT_PAILIT' || normStatus === 'VERDICT_PKPU' || normStatus === 'VERDICT_APPROVED') && plId) {
        if (dNum && rewardedDeeds.has(dNum) && customAward === 0) {
          // Akta yang sama sudah pernah dicairkan pada nomor perkara lain
          customAward = 0;
        } else if (customAward === 0) {
          const claim = Math.max(0, Number(c.claim_amount_ib || 0));
          customAward = normStatus === 'VERDICT_PKPU' ? Math.round(claim * 0.5) : Math.round(claim);
          if (dNum && customAward > 0) rewardedDeeds.add(dNum);
          // Jika sengketa wanprestasi pemain dimenangkan penuh, tampilkan VERDICT_APPROVED agar jelas APPROVED di APK
          if (c.case_type === 'DISPUTE' && normStatus === 'VERDICT_PAILIT') {
            targetStatus = 'VERDICT_APPROVED';
          }
        }
      }

      await executeCourtVerdict(null, {
        caseId: c.id,
        verdictStatus: targetStatus,
        verdictNotes: /^Penggugat menuntut/i.test((c.verdict_notes || '').trim()) ? '' : c.verdict_notes,
        customAwardedAmount: customAward,
        decidedBy: c.decided_by || 'ADMIN_MANUAL',
        broadcastNews: false,
      });
      healedCount++;
    }

    // Penyelarasan Alasan Sita (seize_reason) Perseroan yang Disita agar memuat data Penggugat, Tergugat & Waktu Sidang
    const seizedComps = await query.all('SELECT * FROM companies WHERE is_seized = 1');
    for (const sc of (seizedComps || [])) {
      const isDeficitPailit = Number(sc.company_balance_ib || 0) <= -50000000 || sc.status === 'BANKRUPT' || (sc.seize_reason && sc.seize_reason.toUpperCase().includes('PAILIT'));
      
      // Kasus 1: Perseroan disita karena Kepailitan Kas / Insolvensi Bank BCF
      if (isDeficitPailit) {
        const wibParts = getWibParts(sc.seized_at ? new Date(sc.seized_at) : new Date());
        const bankruptcyReason = `PAILIT BURSA: Defisit kas operasional telah menembus batas insolvensi maksimum (-IB 50.000.000). Perseroan dibekukan oleh Kepaniteraan PNAF & Bank Sentral BCF. [Tergugat: ${sc.name} (${sc.symbol})] [Otoritas: Pengadilan Niaga PNAF & Bank BCF] [Waktu Sidang: ${wibParts.timeStr}, ${wibParts.dateStr}]`;
        if (!sc.seize_reason || !sc.seize_reason.includes('PAILIT BURSA:') || !sc.seize_reason.includes('[Tergugat:')) {
          await query.run(
            "UPDATE companies SET seize_reason = ?, seized_by = 'Pengadilan Niaga Federasi (PNAF) & BCF' WHERE id = ?",
            [bankruptcyReason, sc.id]
          );
        }
        continue;
      }

      // Kasus 2: Perseroan disita karena Putusan Sengketa / Regulasi Pengadilan PNAF
      // Periksa apakah alasan sita sudah memuat Tergugat & Waktu Sidang
      const hasFullDetails = sc.seize_reason && sc.seize_reason.includes('[Tergugat:') && sc.seize_reason.includes('[Waktu Sidang:');
      const hasPlaintiffSelfSeizure = sc.seize_reason && sc.owner_id && sc.seize_reason.includes(sc.owner_id);

      if (!hasFullDetails || hasPlaintiffSelfSeizure) {
        // HANYA tautkan ke perkara yang statusnya DIKABULKAN (VERDICT_APPROVED / VERDICT_PAILIT)
        // dan Penggugat BUKAN pemilik perseroan itu sendiri!
        const linkedC = await query.get(
          `SELECT * FROM court_cases 
           WHERE status IN ('VERDICT_APPROVED', 'VERDICT_PAILIT')
             AND (defendant_company_id = ? OR defendant_user_id = ? OR title LIKE ? OR target_asset_description LIKE ?)
             AND (plaintiff_user_id IS NULL OR plaintiff_user_id != ?)
           ORDER BY created_at DESC LIMIT 1`,
          [sc.id, sc.owner_id || '', `%${sc.symbol}%`, `%${sc.symbol}%`, sc.owner_id || '---']
        );
        if (linkedC) {
          const award = Number(linkedC.verdict_awarded_amount || linkedC.claim_amount_ib || 0);
          const formatted = award > 0 ? ` [Tuntutan/Denda: IB ${award.toLocaleString('id-ID')}]` : '';
          const scheduleTime = linkedC.hearing_time || '10:00 WIB';
          const scheduleDate = linkedC.court_hearing_date || 'Hari Ini';
          const newReason = `Sita Eksekusi Putusan Hakim PNAF No. ${linkedC.case_number} [Perkara: ${linkedC.title}] [Penggugat: ${linkedC.plaintiff_name}] [Tergugat: ${linkedC.defendant_name}] [Waktu Sidang: ${scheduleTime}, ${scheduleDate}]${formatted} - Terbukti Bersalah`;
          await query.run('UPDATE companies SET seize_reason = ? WHERE id = ?', [newReason, sc.id]);
        } else {
          // Default jika tidak ada perkara lawan aktif
          const wibParts = getWibParts(sc.seized_at ? new Date(sc.seized_at) : new Date());
          const defaultReason = `Sita Eksekusi Pengawas Bursa & PNAF: Terbukti Pelanggaran Regulasi Bursa [Tergugat: ${sc.name} (${sc.symbol})] [Otoritas: Pengawas Bursa & PNAF] [Waktu Sidang: ${wibParts.timeStr}, ${wibParts.dateStr}]`;
          await query.run('UPDATE companies SET seize_reason = ? WHERE id = ?', [defaultReason, sc.id]);
        }
      }
    }

    if (healedCount > 0) {
      console.log(`⚖️ [PNAF Auto-Heal] Berhasil menyelaraskan ${healedCount} berkas putusan pengadilan & akta notaris.`);
    }
  } catch (err) {
    console.error('⚠️ [PNAF Auto-Heal] Warning:', err.message);
  }
}

/**
 * Engine Otonom Majelis Hakim & Panitera Bot PNAF
 * Dapat dinyalakan (Otomatis) atau dimatikan (Manual Admin) kapan saja.
 */
class CourtJudgeBotService {
  constructor(io) {
    this.io = io;
    this.timer = null;
    this.isProcessing = false;
  }

  start() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.tick().catch((err) => console.error('⚠️ [CourtJudgeBot] Tick error:', err.message));
    }, 12000);
    // Jalankan pemeriksaan awal 6 detik setelah server hidup
    setTimeout(() => {
      this.tick().catch(() => {});
    }, 6000);
    console.log('⚖️ [PNAF Bot Judge] Engine Majelis Hakim & Panitera Otomatis siap bertugas.');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick({ forceImmediate = false, targetCaseId = null } = {}) {
    if (this.isProcessing) return { processed: 0 };
    if (!forceImmediate) {
      const enabled = await isAutoJudgeEnabled();
      if (!enabled) return { processed: 0, mode: 'MANUAL_ADMIN' };
    }

    this.isProcessing = true;
    let processed = 0;
    try {
      const sql = targetCaseId
        ? "SELECT * FROM court_cases WHERE id = ? AND status = 'IN_TRIAL'"
        : "SELECT * FROM court_cases WHERE status = 'IN_TRIAL' ORDER BY created_at ASC";
      const activeCases = await query.all(sql, targetCaseId ? [targetCaseId] : []);

      for (const c of activeCases || []) {
        if (!forceImmediate && c.bot_next_action_at) {
          const nextMs = Date.parse(c.bot_next_action_at);
          if (!Number.isNaN(nextMs) && Date.now() < nextMs) {
            continue;
          }
        }

        if (forceImmediate) {
          // Jalankan seluruh tahapan yang tersisa sekaligus sampai ketuk palu
          let fresh = c;
          if (Number(fresh.bot_stage || 0) < 1) {
            await this.runStage1ClerkSummons(fresh);
            fresh = await query.get('SELECT * FROM court_cases WHERE id = ?', [c.id]);
          }
          if (fresh && Number(fresh.bot_stage || 0) < 2) {
            await this.runStage2Examination(fresh);
            fresh = await query.get('SELECT * FROM court_cases WHERE id = ?', [c.id]);
          }
          if (fresh && fresh.status === 'IN_TRIAL') {
            await this.runStage3Verdict(fresh);
          }
          processed++;
        } else {
          const stage = Number(c.bot_stage || 0);
          if (stage <= 0) {
            await this.runStage1ClerkSummons(c);
          } else if (stage === 1) {
            await this.runStage2Examination(c);
          } else {
            await this.runStage3Verdict(c);
          }
          processed++;
        }
      }
      return { processed };
    } finally {
      this.isProcessing = false;
    }
  }

  async runStage1ClerkSummons(c) {
    const wib = getWibParts();
    const nextAt = new Date(Date.now() + 18000).toISOString();
    const plPresent = c.plaintiff_user_id ? 1 : c.plaintiff_present;

    await query.run(
      `UPDATE court_cases
       SET court_hearing_date = ?,
           hearing_time = ?,
           summons_sent = 1,
           plaintiff_present = ?,
           room_status = 'IN_SESSION',
           bot_stage = 1,
           bot_next_action_at = ?
       WHERE id = ?`,
      [`Hari Ini, ${wib.dateStr}`, wib.timeStr, plPresent, nextAt, c.id]
    );

    await appendCourtChat(this.io, {
      caseId: c.id,
      senderName: BOT_CLERK_NAME,
      senderRole: 'PANITERA',
      message: `🏛️ SIDANG DIBUKA & RELAAS DITERBITKAN: Perkara No. ${c.case_number} (${c.title}) resmi dibuka di ${c.court_room_name || 'Ruang Sidang Utama Kartika PNAF'} pukul ${wib.timeStr}. Panggilan elektronik telah dikirim kepada Penggugat (${c.plaintiff_name}) dan Tergugat (${c.defendant_name}).`,
    });

    const updated = await query.get('SELECT * FROM court_cases WHERE id = ?', [c.id]);
    if (this.io && updated) {
      this.io.emit('court:case_updated', formatCourtCase(updated));
      this.io.emit(`court:presence_updated:${c.id}`, {
        caseId: c.id,
        plaintiffPresent: updated.plaintiff_present === 1,
        defendantPresent: updated.defendant_present === 1,
      });
    }
  }

  async runStage2Examination(c) {
    const nextAt = new Date(Date.now() + 20000).toISOString();
    let defPresent = c.defendant_present === 1;

    // Cek apakah pihak Tergugat adalah Bot, Institusi, atau Bank Sentral
    let isBotOrInstitutionalDefendant = !c.defendant_user_id;
    if (c.defendant_user_id) {
      if (
        c.defendant_user_id.startsWith('bot-') ||
        c.defendant_user_id === 'bank-central-bcf' ||
        c.defendant_user_id.startsWith('admin')
      ) {
        isBotOrInstitutionalDefendant = true;
      } else {
        const defComp = await query.get('SELECT is_bot FROM companies WHERE owner_id = ? LIMIT 1', [c.defendant_user_id]);
        if (defComp && defComp.is_bot === 1) isBotOrInstitutionalDefendant = true;
      }
    }

    const linkedDeed = await resolveLinkedDeed(c);

    if (!defPresent && isBotOrInstitutionalDefendant) {
      // 85% Kuasa Hukum Tergugat hadir menyampaikan jawaban hukum & tuntutan balik, 15% mangkir (verstek)
      const willAttend = Math.random() < 0.85;
      if (willAttend) {
        defPresent = true;
        await query.run('UPDATE court_cases SET defendant_present = 1 WHERE id = ?', [c.id]);

        let defenseText = '';
        if (c.case_type === 'BANKRUPTCY') {
          defenseText = `Yang Mulia, Biro Hukum ${c.defendant_name} hadir dan menyerahkan rekapitulasi baki kredit serta mendukung opsi restrukturisasi yang sehat.`;
        } else if (c.case_type === 'REGULATORY') {
          defenseText = `Yang Mulia, Kuasa Hukum ${c.defendant_name} hadir menyerahkan log aktivitas perdagangan bursa untuk diperiksa secara objektif.`;
        } else if (c.case_type === 'DEFAMATION') {
          defenseText = `Yang Mulia Majelis Hakim, Kuasa Hukum ${c.defendant_name} hadir dan membantah tuduhan mencemarkan nama baik perseroan Penggugat (${c.plaintiff_name}). Kami siap melakukan mediasi damai atau klarifikasi publik.`;
        } else if (c.case_type === 'RECONVENTION') {
          defenseText = `Yang Mulia Majelis Hakim, Kuasa Hukum ${c.defendant_name} hadir memberikan tanggapan atas gugatan balik rekonvensi dan menyerahkan putusan objektif kepada Majelis Hakim.`;
        } else if (linkedDeed) {
          const isDeedFulfilled = linkedDeed.status === 'COMPLETED' || String(linkedDeed.status || '').startsWith('LUNAS');
          if (isDeedFulfilled) {
            defenseText = `Yang Mulia Majelis Hakim PNAF, Tergugat (${c.defendant_name}) membantah keras seluruh dalil Penggugat! Kewajiban transaksi Akta #${linkedDeed.deed_number} telah diselesaikan secara sah, tuntas, dan lunas. Penggugat sengaja merekayasa dalil demi memeras penalti penjaminan! Kami mengajukan GUGATAN REKONVENSI (TUNTUTAN BALIK): Menuntut Penggugat dihukum membayar ganti rugi pencemaran nama baik dan ongkos perkara sebesar 15% nilai tuntutan!`;
          } else {
            defenseText = `Yang Mulia, Kuasa Hukum ${c.defendant_name} hadir melampirkan pembukuan perdata Akta #${linkedDeed.deed_number}. Tergugat telah bertindak dengan itikad baik dan tidak pernah melanggar klausul pokok perjanjian. Kami memohon Majelis Hakim menolak seluruh gugatan Penggugat dan memulihkan nama baik Tergugat!`;
          }
        } else {
          defenseText = `Yang Mulia, Kuasa Hukum ${c.defendant_name} hadir membantah dalil Penggugat. Gugatan ini tidak didasari alas hak hukum yang sah. Kami menuntut perkara digugurkan demi hukum!`;
        }

        await appendCourtChat(this.io, {
          caseId: c.id,
          senderName: `Kuasa Hukum ${c.defendant_name}`,
          senderRole: 'TERGUGAT',
          senderUserId: c.defendant_user_id || 'counsel-defense',
          message: defenseText,
        });
      }
    }

    // 0B. Tergugat Pemain Asli Sedang Offline: Periksa Kontrak Kuasa Hukum Tetap (Retainer Law Firm 24/7)
    if (!defPresent && !isBotOrInstitutionalDefendant && c.defendant_user_id) {
      const defUser = await query.get(
        'SELECT id, username, retainer_lawyer_name, retainer_lawyer_until FROM users WHERE id = ?',
        [c.defendant_user_id]
      );
      const nowIso = new Date().toISOString();
      if (defUser && defUser.retainer_lawyer_name && defUser.retainer_lawyer_until && defUser.retainer_lawyer_until > nowIso) {
        defPresent = true;
        const retainerLawyer = defUser.retainer_lawyer_name;
        await query.run('UPDATE court_cases SET defendant_present = 1, defendant_lawyer_name = ? WHERE id = ?', [retainerLawyer, c.id]);
        c.defendant_lawyer_name = retainerLawyer;
        c.defendant_present = 1;

        let retainerSpeech = '';
        if (retainerLawyer.includes('Sagala')) {
          retainerSpeech = `🛡️ [Advokat Khairul Sagala, S.H., C.L.A. - Sagala & Partners Sultan Tier (Kuasa Hukum Tetap Tergugat)]: "Interupsi Yang Mulia Majelis Hakim PNAF! Berdasarkan Surat Kuasa Khusus Retainer 24/7 No. RET/SGL/${c.id.slice(0, 6)}, kami berdiri mewakili Tergugat (${c.defendant_name}). Klien kami tidak mangkir, melainkan menyerahkan seluruh hak pembelaan hukum kepada kami! Kami memeriksa seluruh berkas gugatan Penggugat (${c.plaintiff_name}) dan menyatakan dalil ini cacat formil, manipulatif, dan mengada-ada! Kami menolak segala bentuk sita jaminan dan mendesak Majelis menolak gugatan seketika serta menghukum Penggugat membayar kerugian materiil dan immateriil!"`;
        } else if (retainerLawyer.includes('Bintang')) {
          retainerSpeech = `🛡️ [Advokat Senior Zahra Bintang, S.H., M.H. - Bintang Law Office (Kuasa Hukum Tetap Tergugat)]: "Yang Mulia Majelis Hakim PNAF yang terhormat! Kami hadir mewakili Tergugat (${c.defendant_name}) berdasarkan Kontrak Kuasa Hukum Tetap. Tidak ada dasar hukum untuk menjatuhkan putusan verstek! Klien kami beroperasi dengan kepatuhan penuh. Seluruh bukti Penggugat tidak memenuhi syarat materiel pembuktian perdata bursa. Kami mohon putusan bebas dan pemulihan reputasi perseroan Tergugat!"`;
        } else if (retainerLawyer.includes('Azzahra')) {
          retainerSpeech = `🛡️ [Advokat Puja Azzahra, S.H., LL.M. - Azzahra & Partners (Kuasa Hukum Tetap Tergugat)]: "Izin Yang Mulia Majelis Hakim PNAF! Selaku Kuasa Hukum Retainer Tergugat (${c.defendant_name}), kami menyatakan hadir mendampingi perkara. Kami telah menelaah audit transaksi dan menyatakan tuduhan Penggugat tidak berdasar. Kami memohon keadilan ditegakkan dengan menolak gugatan Penggugat demi asas kepastian hukum bisnis!"`;
        } else {
          retainerSpeech = `🛡️ [Advokat ${retainerLawyer} - Kuasa Hukum Retainer Tergugat]: "Yang Mulia Majelis Hakim PNAF, kami hadir mewakili Tergugat (${c.defendant_name}). Klien kami menolak seluruh dalil Penggugat dan memohon Majelis menolak gugatan ini!"`;
        }

        await appendCourtChat(this.io, {
          caseId: c.id,
          senderName: retainerLawyer,
          senderRole: 'TERGUGAT',
          senderUserId: c.defendant_user_id || 'counsel-defense',
          message: retainerSpeech,
        });
      }
    }

    // 1. Pledoi & Orasi Pembuka Penggugat (Advokat Resmi atau Penggugat Mandiri)
    if (c.lawyer_name) {
      let lawyerSpeech = '';
      if (c.lawyer_name.includes('Sagala')) {
        lawyerSpeech = `⚖️ [Advokat Khairul Sagala, S.H., C.L.A. - Sagala & Associates Sultan Tier]: "Yang Mulia Majelis Hakim PNAF yang kami muliakan! Kami hadir mendampingi Penggugat (${c.plaintiff_name}). Fakta hukum, bukti akta, dan audit bursa membuktikan tanpa keraguan sedikit pun bahwa perbuatan Tergugat (${c.defendant_name}) telah menimbulkan kerugian immateriil dan finansial nyata. Kami mendesak Majelis menjatuhkan putusan maksimal, eksekusi sita seketika, dan menolak seluruh bantahan lawan!"`;
      } else if (c.lawyer_name.includes('Bintang')) {
        lawyerSpeech = `⚖️ [Advokat Zahra Bintang, S.H., M.H. - Bintang Law Office]: "Yang Mulia Majelis Hakim PNAF! Seluruh eksepsi Tergugat harus dikesampingkan demi hukum. Berdasarkan Pasal 18 Statuta Hukum Korporasi Federasi (SHKF) juncto Pasal 42 Piagam Federasi Pasar Modal (PFPM), hak pemulihan klien kami (${c.plaintiff_name}) adalah sah dan mutlak. Kami juga memohon agar Permohonan Sita Jaminan (Conservatoir Beslag) dikabulkan guna memblokir aset Tergugat sampai perkara tuntas!"`;
      } else if (c.lawyer_name.includes('Azzahra')) {
        lawyerSpeech = `⚖️ [Advokat Puja Azzahra, S.H., LL.M. - Azzahra & Partners]: "Izin Yang Mulia Majelis Hakim yang terhormat! Klien kami (${c.plaintiff_name}) telah memenuhi seluruh syarat formil dan materiil gugatan dengan itikad baik. Dalil Tergugat tidak berdasar dan mengada-ada. Kami memohon keadilan ditegakkan dengan mengabulkan tuntutan ganti rugi penuh!"`;
      } else {
        lawyerSpeech = `⚖️ [Advokat ${c.lawyer_name}]: "Yang Mulia Majelis Hakim PNAF, kami Kuasa Hukum Penggugat (${c.plaintiff_name}) menegaskan bahwa dalil gugatan telah terbukti secara sah dan meyakinkan. Kami memohon keadilan ditegakkan demi kepastian hukum bisnis!"`;
      }

      await appendCourtChat(this.io, {
        caseId: c.id,
        senderName: c.lawyer_name,
        senderRole: 'PENGGUGAT',
        senderUserId: c.plaintiff_user_id || 'plaintiff-lawyer',
        message: lawyerSpeech,
      });
    } else {
      // Penggugat Beracara Mandiri (Tanpa Pengacara)
      const plaintiffSelfSpeech = `⚖️ [Penggugat Mandiri - ${c.plaintiff_name}]: "Yang Mulia Majelis Hakim PNAF! Kami berdiri langsung di hadapan persidangan ini menuntut hak bisnis kami yang dirugikan oleh Tergugat (${c.defendant_name}). Bukti transfer dan perikatan sudah jelas di hadapan Yang Mulia! Tergugat harus bertanggung jawab penuh atas setiap sen kerugian kami tanpa alasan!"`;
      await appendCourtChat(this.io, {
        caseId: c.id,
        senderName: c.plaintiff_name,
        senderRole: 'PENGGUGAT',
        senderUserId: c.plaintiff_user_id || 'plaintiff-principal',
        message: plaintiffSelfSpeech,
      });
    }

    // 2. Babak Debat Memanas: Duplik Keras Tergugat (Jika Tergugat Hadir)
    if (defPresent) {
      const defDuplik = `🚨 [Duplik & Eksepsi Kuasa Hukum ${c.defendant_name}]: "KEBERATAN KERAS YANG MULIA! Dalil yang disampaikan pihak Penggugat sangat berlebihan dan sarat tendensi mencoreng nama baik klien kami! Perseroan kami beroperasi secara legal dan memiliki rekam jejak bursa yang solid! Upaya memaksakan eksekusi dan penyitaan aset ini patut diduga sebagai aksi hostile takeover terselubung! Kami mendesak Majelis menolak seluruh dalil Penggugat!"`;
      await appendCourtChat(this.io, {
        caseId: c.id,
        senderName: `Kuasa Hukum ${c.defendant_name}`,
        senderRole: 'TERGUGAT',
        senderUserId: c.defendant_user_id || 'counsel-defense',
        message: defDuplik,
      });

      // 3. Replik Sengit Pamungkas Penggugat / Advokat Penggugat
      let replikSpeech = '';
      if (c.lawyer_name?.includes('Sagala')) {
        replikSpeech = `⚡ [Replik Pamungkas - Advokat Khairul Sagala, S.H., C.L.A.]: "Retorika panik Tergugat tidak dapat menutupi defisit kepatuhan mereka! Jejak audit forensik bursa dan akta notaris tidak mengenal kata kompromi! Majelis yang mulia, jangan biarkan debitur ingkar janji berlindung di balik dalil kosong! Kami minta sita jaminan dikukuhkan dan vonis ditegakkan!"`;
      } else if (c.lawyer_name?.includes('Bintang')) {
        replikSpeech = `⚡ [Replik Pamungkas - Advokat Zahra Bintang, S.H., M.H.]: "Tergugat hanya mencoba mengulur waktu karena seluruh eksepsi mereka rontok di depan fakta materiil! Hukum pasar modal dibangun di atas kepastian, bukan alasan defensif! Kami menuntut palu keadilan diketok tanpa keraguan!"`;
      } else if (c.lawyer_name?.includes('Azzahra')) {
        replikSpeech = `⚡ [Replik Pamungkas - Advokat Puja Azzahra, S.H., LL.M.]: "Seluruh dalil sanggahan Tergugat telah gugur demi hukum. Fakta materiil telah benderang di hadapan persidangan. Prinsip kepastian perdata menuntut Tergugat mengganti rugi secara penuh!"`;
      } else if (c.lawyer_name) {
        replikSpeech = `⚡ [Replik Kuasa Hukum Penggugat]: "Bantahan Tergugat tidak berdasar fakta hukum. Kami menuntut keadilan ditegakkan dan hak klien kami dipulihkan seketika!"`;
      } else {
        replikSpeech = `⚡ [Replik Penggugat Mandiri - ${c.plaintiff_name}]: "Kami tidak akan gentar dengan pembelaan berbelit Tergugat! Fakta kerugian nyata ada di depan mata. Kami memohon Yang Mulia Majelis Hakim mengabulkan seluruh gugatan kami!"`;
      }

      await appendCourtChat(this.io, {
        caseId: c.id,
        senderName: c.lawyer_name || c.plaintiff_name,
        senderRole: 'PENGGUGAT',
        senderUserId: c.plaintiff_user_id || 'plaintiff-counsel',
        message: replikSpeech,
      });
    }

    // 4. Intervensi Ketegasan & Penertiban Ruang Sidang oleh Ketua Majelis Hakim
    const judgeIntervention = `🏛️ [Ketua Majelis Hakim - Prof. Dr. Bagas Daniswara, S.H., M.H.]: "TERTIB PERSIDANGAN! Majelis Hakim memperingatkan seluruh pihak untuk menjaga marwah dan adab peradilan niaga! Majelis telah mencatat secara komprehensif gugatan, eksepsi, replik, maupun duplik yang disampaikan. Pengadilan Niaga & Arbitrase Federasi memutus berdasarkan fakta otentik, keadilan substantif, dan supremasi hukum ekonomi tanpa kompromi!"`;
    await appendCourtChat(this.io, {
      caseId: c.id,
      senderName: BOT_JUDGE_NAME,
      senderRole: 'HAKIM',
      message: judgeIntervention,
    });

    if (c.is_conservatoir_beslag === 1) {
      await appendCourtChat(this.io, {
        caseId: c.id,
        senderName: BOT_JUDGE_NAME,
        senderRole: 'HAKIM',
        message: `🔒 PENETAPAN SITA JAMINAN (CONSERVATOIR BESLAG): Menimbang permohonan Penggugat yang didukung bukti awal yang cukup dan risiko pengalihan aset oleh Tergugat, Majelis Hakim menetapkan pembekuan sementara dana jaminan senilai tuntutan perkara (IB ${Number(c.claim_amount_ib || 0).toLocaleString('id-ID')}) pada kas Tergugat hingga putusan berkekuatan hukum tetap dibacakan!`,
      });
    }
    const examMsg = linkedDeed
      ? `⚖️ PEMERIKSAAN ALAT BUKTI: Majelis Hakim telah memverifikasi keabsahan Akta Notaris #${linkedDeed.deed_number} senilai IB ${Number(linkedDeed.total_price_ib || 0).toLocaleString('id-ID')} bermeterai lunas beserta bukti tuntutan sebesar IB ${Number(c.claim_amount_ib || 0).toLocaleString('id-ID')}. Majelis memasuki musyawarah pembacaan putusan.`
      : `⚖️ PEMERIKSAAN POKOK PERKARA: Majelis Hakim sedang meneliti berkas gugatan "${c.title}", riwayat kepatuhan finansial para pihak, dan nilai tuntutan IB ${Number(c.claim_amount_ib || 0).toLocaleString('id-ID')} sebelum mengetuk palu putusan.`;

    await appendCourtChat(this.io, {
      caseId: c.id,
      senderName: BOT_JUDGE_NAME,
      senderRole: 'HAKIM',
      message: examMsg,
    });

    await query.run(
      'UPDATE court_cases SET bot_stage = 2, bot_next_action_at = ? WHERE id = ?',
      [nextAt, c.id]
    );

    const updated = await query.get('SELECT * FROM court_cases WHERE id = ?', [c.id]);
    if (this.io && updated) {
      this.io.emit('court:case_updated', formatCourtCase(updated));
      this.io.emit(`court:presence_updated:${c.id}`, {
        caseId: c.id,
        plaintiffPresent: updated.plaintiff_present === 1,
        defendantPresent: updated.defendant_present === 1,
      });
    }
  }

  async runStage3Verdict(c) {
    const linkedDeed = await resolveLinkedDeed(c);
    const rawClaim = Math.max(0, Number(c.claim_amount_ib || 0));
    let verdictStatus = 'VERDICT_APPROVED';
    let verdictType = 'APPROVED_PLAINTIFF_WIN';
    let verdictNotes = '';
    let customAwardedAmount = undefined;

    // 1. Cek asas Ne Bis In Idem (gugatan ganda pada akta yang sama yang sudah diputus menang)
    if (linkedDeed) {
      const priorWon = await query.get(
        `SELECT case_number, status FROM court_cases
         WHERE id != ? AND status IN ('VERDICT_APPROVED', 'VERDICT_PKPU', 'VERDICT_PAILIT')
           AND (deed_id = ? OR deed_number = ? OR title LIKE ?)
           AND verdict_awarded_amount > 0
         LIMIT 1`,
        [c.id, linkedDeed.id, linkedDeed.deed_number, `%#${linkedDeed.deed_number}%`]
      );
      if (priorWon) {
        return executeCourtVerdict(this.io, {
          caseId: c.id,
          verdictStatus: 'VERDICT_REJECTED',
          verdictType: 'GUGUR_DISMISSED',
          verdictNotes: `❌ NE BIS IN IDEM: Majelis Hakim Arbitrase PNAF menolak gugatan ganda karena klaim atas Akta #${linkedDeed.deed_number} telah diputus dan dieksekusi pada Perkara No. ${priorWon.case_number}.`,
          customAwardedAmount: 0,
          decidedBy: 'BOT_JUDGE',
        });
      }
    }

    // 2. Evaluasi berdasarkan kategori perkara
    if (c.case_type === 'BANKRUPTCY') {
      const isDebtorPkpuAppeal =
        c.plaintiff_user_id && /BCF|Bank Sentral|PKPU|Restrukturisasi/i.test(`${c.defendant_name} ${c.title}`);

      if (isDebtorPkpuAppeal) {
        const plUser = await query.get('SELECT credit_score, username FROM users WHERE id = ?', [c.plaintiff_user_id]);
        const creditScore = plUser?.credit_score ?? 700;
        if (creditScore >= 500) {
          verdictStatus = 'VERDICT_APPROVED';
          verdictType = 'APPROVED_PLAINTIFF_WIN';
          customAwardedAmount = 0;
          verdictNotes = `✅ PERMOHONAN PKPU DIKABULKAN (APPROVED): ${BOT_JUDGE_NAME} mengabulkan permohonan restrukturisasi & moratorium pinjaman ${c.plaintiff_name} (Skor Kredit: ${creditScore}). Jatuh tempo fasilitas pinjaman aktif diperpanjang +7 hari.`;
        } else {
          verdictStatus = 'VERDICT_REJECTED';
          verdictType = 'GUGUR_DISMISSED';
          customAwardedAmount = 0;
          verdictNotes = `❌ PERMOHONAN PKPU DITOLAK: Skor kredit pemohon (${creditScore}) berada di bawah ambang kelayakan restrukturisasi minimum Bank Sentral Federasi.`;
        }
      } else {
        verdictStatus = c.defendant_present === 1 ? 'VERDICT_PKPU' : 'VERDICT_PAILIT';
        verdictType = c.defendant_present === 1 ? 'SETTLED_MEDIATION' : 'VERSTEK_PLAINTIFF_WIN';
      }
    } else if (c.case_type === 'REGULATORY') {
      // Cek emiten terkait jika ada
      const targetComp = c.defendant_company_id
        ? await query.get('SELECT * FROM companies WHERE id = ?', [c.defendant_company_id])
        : await query.get(
            'SELECT * FROM companies WHERE LOWER(symbol) = LOWER(?) OR LOWER(name) LIKE LOWER(?) LIMIT 1',
            [c.defendant_name.trim(), `%${c.defendant_name.trim()}%`]
          );

      if (targetComp && targetComp.owner_id === c.plaintiff_user_id) {
        // Penggugat memohon pembukaan suspensi/UMA emitennya
        verdictStatus = 'VERDICT_APPROVED';
        verdictType = 'APPROVED_PLAINTIFF_WIN';
        customAwardedAmount = 0;
        verdictNotes = `✅ BANDING REGULASI DIKABULKAN (APPROVED): ${BOT_JUDGE_NAME} memerintahkan pemulihan status perdagangan normal bagi emiten ${targetComp.name} (${targetComp.symbol}).`;
      } else if (rawClaim > 100000000000) {
        verdictStatus = 'VERDICT_REJECTED';
        verdictType = 'GUGUR_DISMISSED';
        customAwardedAmount = 0;
        verdictNotes = `❌ GUGATAN REGULASI DITOLAK: Nilai tuntutan tidak proporsional dan tidak disertai bukti audit pelanggaran bursa OPFF.`;
      } else {
        verdictStatus = 'VERDICT_APPROVED';
        verdictType = 'APPROVED_PLAINTIFF_WIN';
        customAwardedAmount = Math.min(rawClaim || 25000000, 50000000);
        verdictNotes = `✅ LAPORAN PENGAWASAN BURSA DIKABULKAN (APPROVED): ${BOT_JUDGE_NAME} mengesahkan temuan kepatuhan bursa terhadap ${c.defendant_name} dan mencairkan insentif pelapor sebesar IB ${customAwardedAmount.toLocaleString('id-ID')}.`;
      }
    } else if (c.case_type === 'DEFAMATION') {
      // PEMERIKSAAN KETAT ALAT BUKTI PENCEMARAN NAMA BAIK
      // 1. Cek apakah Tergugat pernah menggugat Penggugat secara fiktif dan perkaranya ditolak
      const priorDismissed = await query.get(
        `SELECT case_number, title FROM court_cases 
         WHERE (plaintiff_user_id = ? OR plaintiff_name LIKE ?)
           AND (defendant_user_id = ? OR defendant_name LIKE ?)
           AND status IN ('VERDICT_REJECTED', 'DISMISSED')
         LIMIT 1`,
        [c.defendant_user_id, `%${c.defendant_name}%`, c.plaintiff_user_id, `%${c.plaintiff_name}%`]
      );

      // 2. Cek apakah perseroan Penggugat mengalami kejatuhan pasar atau UMA
      const plComp = c.plaintiff_company_id 
        ? await query.get('SELECT * FROM companies WHERE id = ?', [c.plaintiff_company_id])
        : await query.get('SELECT * FROM companies WHERE owner_id = ? LIMIT 1', [c.plaintiff_user_id]);

      const hasDetailedFacts = (c.notes && c.notes.length >= 25) || (c.target_asset_description && c.target_asset_description.length >= 20);

      let isDefamationProven = false;
      let rejectReason = '';

      if (priorDismissed) {
        // Terbukti ada rekam jejak perkara fitnah / fiktif sebelumnya yang telah ditolak Pengadilan PNAF
        isDefamationProven = true;
      } else if (plComp && (plComp.uma_flag === 1 || Number(plComp.price_change_pct || 0) <= -12)) {
        // Terbukti terjadi anjlok pasar signifikan / suspensi reputasi akibat manuver Tergugat
        isDefamationProven = true;
      } else if (!hasDetailedFacts) {
        // Hakim Bot Keras: Tanpa uraian fakta hukum yang memadai, gugatan langsung DITOLAK!
        isDefamationProven = false;
        rejectReason = 'Penggugat tidak menyertakan kronologi fakta materiil, rincian kerugian riil, maupun alat bukti otentik.';
      } else {
        // Hakim Bot menguji pembuktian materiil secara ketat dan objektif
        const roll = Math.random();
        if (roll < 0.25) {
          isDefamationProven = true;
        } else {
          isDefamationProven = false;
          rejectReason = 'Setelah menguji log pembuktian persidangan dan rekam jejak bursa, Tergugat TIDAK TERBUKTI menyebarkan fitnah atau merugikan reputasi perseroan Penggugat secara melawan hukum.';
        }
      }

      if (isDefamationProven) {
        verdictStatus = 'VERDICT_APPROVED';
        verdictType = 'APPROVED_PLAINTIFF_WIN';
        customAwardedAmount = Math.min(rawClaim || 50000000, 500000000);
        verdictNotes = `✅ GUGATAN PENCEMARAN NAMA BAIK DIKABULKAN (APPROVED): ${BOT_JUDGE_NAME} memeriksa alat bukti persidangan secara seksama dan menyatakan Tergugat (${c.defendant_name}) TERBUKTI BERSALAH mencemarkan nama baik perseroan Penggugat (${c.plaintiff_name}). Menghukum Tergugat membayar ganti rugi sebesar IB ${customAwardedAmount.toLocaleString('id-ID')}. Apabila kas Tergugat tidak mencukupi, Pengadilan mengeksekusi SITA JAMINAN dan mengalihkan perseroan Tergugat menjadi HAK MILIK Penggugat!`;
      } else {
        verdictStatus = 'VERDICT_REJECTED';
        verdictType = 'GUGUR_DISMISSED';
        const finePl = Math.max(10000000, Math.min(100000000, Math.round(rawClaim * 0.10)));
        customAwardedAmount = 0;
        verdictNotes = `❌ GUGATAN PENCEMARAN NAMA BAIK DITOLAK: ${BOT_JUDGE_NAME} memeriksa fakta hukum persidangan. ${rejectReason} Tuduhan Penggugat dinyatakan TIDAK TERBUKTI dan tidak berdasar. Menghukum Penggugat membayar sanksi biaya perkara dan kompensasi fitnah sebesar IB ${finePl.toLocaleString('id-ID')} kepada Tergugat.`;
      }
    } else if (c.case_type === 'RECONVENTION') {
      // PEMERIKSAAN KETAT GUGATAN REKONVENSI (TUNTUTAN BALIK)
      const priorBogus = await query.get(
        `SELECT id, case_number, title FROM court_cases 
         WHERE (plaintiff_user_id = ? OR plaintiff_name LIKE ?)
           AND (defendant_user_id = ? OR defendant_name LIKE ?)
           AND status IN ('VERDICT_REJECTED', 'DISMISSED')
         ORDER BY closed_at DESC LIMIT 1`,
        [c.defendant_user_id, `%${c.defendant_name}%`, c.plaintiff_user_id, `%${c.plaintiff_name}%`]
      );

      if (priorBogus || c.defendant_present === 0) {
        verdictStatus = 'VERDICT_APPROVED';
        verdictType = 'APPROVED_PLAINTIFF_WIN';
        customAwardedAmount = Math.min(rawClaim || 50000000, 300000000);
        verdictNotes = `✅ GUGATAN REKONVENSI DIKABULKAN (APPROVED): ${BOT_JUDGE_NAME} mengabulkan gugatan rekonvensi Penggugat (${c.plaintiff_name}) karena tuduhan Tergugat (${c.defendant_name}) dalam perkara sebelumnya telah diputus TIDAK TERBUKTI dan fiktif. Menghukum Tergugat membayar ganti rugi immaterial sebesar IB ${customAwardedAmount.toLocaleString('id-ID')}.`;
      } else {
        verdictStatus = 'VERDICT_REJECTED';
        verdictType = 'GUGUR_DISMISSED';
        customAwardedAmount = 0;
        verdictNotes = `❌ GUGATAN REKONVENSI DITOLAK: ${BOT_JUDGE_NAME} meneliti arsip PNAF dan tidak menemukan putusan perkara fiktif sebelumnya yang diajukan oleh Tergugat terhadap Penggugat. Gugatan rekonvensi gugur demi hukum.`;
      }
    } else {
      // DISPUTE (Sengketa Saham & Akta Wanprestasi)
      if (!linkedDeed) {
        let hasShareRelationship = false;
        if (c.plaintiff_user_id && (c.defendant_company_id || c.defendant_user_id)) {
          const compId = c.defendant_company_id;
          if (compId) {
            const sh = await query.get('SELECT id FROM company_shareholders WHERE company_id = ? AND user_id = ?', [compId, c.plaintiff_user_id]);
            if (sh) hasShareRelationship = true;
          }
        }

        if (!hasShareRelationship) {
          // Hakim Bot Keras: Tanpa bukti akta kesepakatan dan bukan pemegang saham sah -> DITOLAK KERAS!
          verdictStatus = 'VERDICT_REJECTED';
          verdictType = 'GUGUR_DISMISSED';
          const defamationFine = Math.max(10000000, Math.min(100000000, Math.round(rawClaim * 0.10)));
          customAwardedAmount = 0;
          verdictNotes = `❌ SENGKETA SAHAM DITOLAK: ${BOT_JUDGE_NAME} memeriksa buku pemegang saham perseroan. Penggugat tidak memiliki bukti Akta Notaris maupun catatan kepemilikan saham di Brankas PNAF. Gugatan dinyatakan tidak berdasar hukum dan Penggugat dihukum denda perkara fiktif IB ${defamationFine.toLocaleString('id-ID')} kepada Tergugat.`;
        } else if (c.defendant_present === 0) {
          verdictStatus = 'VERDICT_APPROVED';
          verdictType = 'VERSTEK_PLAINTIFF_WIN';
        } else {
          // Ada sengketa proporsional, uji pembuktian
          const roll = Math.random();
          if (roll < 0.40) {
            verdictStatus = 'VERDICT_APPROVED';
            verdictType = 'APPROVED_PLAINTIFF_WIN';
          } else if (roll < 0.75) {
            verdictStatus = 'VERDICT_REJECTED';
            verdictType = 'GUGUR_DISMISSED';
            const fine = Math.max(10000000, Math.min(50000000, Math.round(rawClaim * 0.10)));
            customAwardedAmount = 0;
            verdictNotes = `❌ GUGATAN SENGKETA SAHAM DITOLAK: Kuasa Hukum Tergugat membuktikan bahwa penguasaan saham telah sesuai anggaran dasar. Penggugat dihukum membayar biaya perkara IB ${fine.toLocaleString('id-ID')}.`;
          } else {
            verdictStatus = 'VERDICT_PKPU';
            verdictType = 'SETTLED_MEDIATION';
            verdictNotes = `🤝 PUTUSAN MEDIASI ARBITRASE PNAF: Majelis Hakim menetapkan sengketa kepemilikan saham diselesaikan melalui RUPS luar biasa tanpa eksekusi sepihak.`;
          }
        }
      } else {
        // PEMERIKSAAN MATERI BUKTI AKTA OLEH MAJELIS HAKIM
        const isDeedFulfilled = linkedDeed.status === 'COMPLETED' || String(linkedDeed.status || '').startsWith('LUNAS');
        if (isDeedFulfilled) {
          // Akta terbukti sudah lunas / selesai -> Gugatan Penggugat adalah pencemaran nama baik fiktif!
          verdictStatus = 'VERDICT_REJECTED';
          verdictType = 'GUGUR_DISMISSED';
          const defamationFine = Math.max(10000000, Math.min(100000000, Math.round(rawClaim * 0.15)));
          customAwardedAmount = 0;
          verdictNotes = `❌ GUGATAN DITOLAK & PENGGUGAT DIHUKUM DENDA REKONVENSI: ${BOT_JUDGE_NAME} memeriksa berkas Akta #${linkedDeed.deed_number} dan menemukan seluruh kewajiban telah lunas dieksekusi secara sah. Tuduhan wanprestasi Penggugat (${c.plaintiff_name}) dinyatakan TIDAK TERBUKTI. Menghukum Penggugat membayar denda pencemaran nama baik sebesar IB ${defamationFine.toLocaleString('id-ID')} kepada Tergugat (${c.defendant_name}).`;
        } else {
          // Ada sengketa klausul nyata
          const roll = Math.random();
          if (roll < 0.50) {
            verdictStatus = 'VERDICT_APPROVED';
            verdictType = 'APPROVED_PLAINTIFF_WIN';
          } else if (roll < 0.80) {
            verdictStatus = 'VERDICT_REJECTED';
            verdictType = 'GUGUR_DISMISSED';
            const defamationFine = Math.max(10000000, Math.min(50000000, Math.round(rawClaim * 0.10)));
            customAwardedAmount = 0;
            verdictNotes = `❌ GUGATAN DITOLAK: Majelis Hakim PNAF memeriksa pembuktian Tergugat (${c.defendant_name}) dan menyatakan tidak terdapat wanprestasi sepihak atas Akta #${linkedDeed.deed_number}. Gugatan Penggugat dinyatakan gugur dan Penggugat dihukum membayar ganti rugi biaya perkara IB ${defamationFine.toLocaleString('id-ID')} kepada Tergugat.`;
          } else {
            verdictStatus = 'VERDICT_PKPU';
            verdictType = 'SETTLED_MEDIATION';
            verdictNotes = `🤝 PUTUSAN MEDIASI ARBITRASE PNAF: Majelis Hakim memutus sengketa Akta #${linkedDeed.deed_number} diselesaikan melalui jalur musyawarah perdata tanpa eksekusi sita paksa.`;
          }
        }
      }
    }

    // Evaluasi Efek Pengacara Penggugat (Advokat Puja Azzahra, Zahra Bintang, Khairul Sagala)
    if (c.lawyer_name && !verdictNotes.includes('NE BIS IN IDEM')) {
      const isSagala = c.lawyer_name.includes('Sagala');
      const isBintang = c.lawyer_name.includes('Bintang');
      const isAzzahra = c.lawyer_name.includes('Azzahra');

      if (verdictStatus !== 'VERDICT_APPROVED') {
        const lawyerRoll = Math.random();
        const boostThreshold = isSagala ? 0.95 : (isBintang ? 0.85 : 0.75);

        if (lawyerRoll < boostThreshold) {
          verdictStatus = 'VERDICT_APPROVED';
          verdictType = 'APPROVED_PLAINTIFF_WIN';
          customAwardedAmount = rawClaim > 0 ? rawClaim : 50000000;
          verdictNotes = `✅ GUGATAN DIKABULKAN PENUH (APPROVED): Majelis Hakim PNAF mempertimbangkan pembelaan hukum brilian dan fakta otentik yang diajukan Kuasa Hukum Penggugat (${c.lawyer_name}). Tergugat (${c.defendant_name}) dinyatakan wanprestasi dan dihukum membayar ganti rugi penuh sebesar IB ${customAwardedAmount.toLocaleString('id-ID')}.`;
          if (c.is_conservatoir_beslag === 1) {
            verdictNotes += ' Sita Jaminan (Conservatoir Beslag) resmi dikonversi menjadi Sita Eksekusi Seketika!';
          }
        }
      } else {
        verdictNotes += ` (Didampingi Kuasa Hukum: ${c.lawyer_name})`;
      }
    }

    // Evaluasi Efek Pengacara Tergugat (Retainer Law Firm 24/7 atau Kuasa Terpilih)
    if (c.defendant_lawyer_name && !verdictNotes.includes('NE BIS IN IDEM')) {
      const defIsSagala = c.defendant_lawyer_name.includes('Sagala');
      const defIsBintang = c.defendant_lawyer_name.includes('Bintang');
      const defPower = defIsSagala ? 96 : (defIsBintang ? 88 : 80);

      if (!c.lawyer_name) {
        // Penggugat Mandiri Tanpa Pengacara Lawan Pengacara Top Tergugat: Pertahanan sangat kokoh!
        const defRoll = Math.random();
        const defThreshold = defIsSagala ? 0.95 : (defIsBintang ? 0.85 : 0.75);
        if (defRoll < defThreshold) {
          verdictStatus = 'VERDICT_REJECTED';
          verdictType = 'GUGUR_DISMISSED';
          const defamationFine = Math.max(25000000, Math.min(250000000, Math.round(rawClaim * 0.15)));
          customAwardedAmount = 0;
          verdictNotes = `🛡️ GUGATAN DITOLAK PENUH & PERLINDUNGAN HUKUM RETENSI: Majelis Hakim PNAF mengabulkan seluruh eksepsi Kuasa Hukum Tergugat (${c.defendant_lawyer_name}). Tuduhan Penggugat (${c.plaintiff_name}) dinyatakan tidak berdasar secara materiel! Menghukum Penggugat membayar denda pencemaran nama baik sebesar IB ${defamationFine.toLocaleString('id-ID')} kepada Tergugat.`;
        }
      } else {
        // Duel Advokat Tingkat Tinggi (Penggugat vs Tergugat)
        const plIsSagala = c.lawyer_name.includes('Sagala');
        const plIsBintang = c.lawyer_name.includes('Bintang');
        const plPower = plIsSagala ? 96 : (plIsBintang ? 88 : 80);

        const pPlWin = plPower / (plPower + defPower);
        const clashRoll = Math.random();

        if (clashRoll < pPlWin) {
          verdictStatus = 'VERDICT_APPROVED';
          verdictType = 'APPROVED_PLAINTIFF_WIN';
          customAwardedAmount = rawClaim > 0 ? rawClaim : 50000000;
          verdictNotes = `✅ PERKARA DIMENANGKAN PENGGUGAT DALAM DUEL ADVOKAT: Majelis Hakim PNAF mengabulkan dalil Kuasa Hukum Penggugat (${c.lawyer_name}) atas tangkisan Kuasa Hukum Tergugat (${c.defendant_lawyer_name}). Tergugat (${c.defendant_name}) dihukum membayar ganti rugi IB ${customAwardedAmount.toLocaleString('id-ID')}.`;
        } else {
          verdictStatus = 'VERDICT_REJECTED';
          verdictType = 'GUGUR_DISMISSED';
          customAwardedAmount = 0;
          const defamationFine = Math.max(20000000, Math.min(150000000, Math.round(rawClaim * 0.10)));
          verdictNotes = `🛡️ GUGATAN DITOLAK DALAM DUEL ADVOKAT: Majelis Hakim PNAF memenangkan pembelaan Kuasa Hukum Tergugat (${c.defendant_lawyer_name}) atas tuntutan Kuasa Hukum Penggugat (${c.lawyer_name}). Seluruh eksepsi Tergugat diterima dan nama baik perseroan dipulihkan (Penggugat dibebankan biaya perkara IB ${defamationFine.toLocaleString('id-ID')})!`;
        }
      }
    }

    return executeCourtVerdict(this.io, {
      caseId: c.id,
      verdictStatus,
      verdictType,
      verdictNotes,
      customAwardedAmount,
      decidedBy: 'BOT_JUDGE',
    });
  }
}

module.exports = {
  BOT_JUDGE_NAME,
  BOT_CLERK_NAME,
  formatCourtCase,
  formatCourtMessage,
  appendCourtChat,
  dispatchInboxNotification,
  executeCourtVerdict,
  healExistingCourtCases,
  isAutoJudgeEnabled,
  setAutoJudgeEnabled,
  getAutoJudgeStatusPayload,
  CourtJudgeBotService,
};

