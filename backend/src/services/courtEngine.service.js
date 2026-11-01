const { v4: uuidv4 } = require('uuid');
const { query, recordCashFlow } = require('../db');

const BOT_JUDGE_NAME = 'Prof. Dr. Bagas Daniswara, S.H., M.H. (Ketua Majelis Hakim PNAF)';
const BOT_CLERK_NAME = 'R. Arya Wicaksana, S.H. (Panitera Sidang Niaga PNAF)';
const AUTO_JUDGE_SETTING_KEY = 'court_bot_auto_judge';

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
    } else if (decidedBy === 'BOT_JUDGE' && !linkedDeed) {
      // Proteksi ekonomi untuk gugatan bebas tanpa akta saat diputus otomatis oleh Bot Hakim
      let cap = 250000000; // Maks 250 Juta IB untuk klaim bebas non-akta otomatis
      if (c.defendant_user_id) {
        const defU = await query.get('SELECT balance_ib FROM users WHERE id = ?', [c.defendant_user_id]);
        if (defU) {
          cap = Math.min(500000000, Math.max(25000000, Math.round((defU.balance_ib || 0) * 0.25)));
        }
      }
      awardedAmount = Math.min(rawClaim, cap);
    } else if (decidedBy === 'BOT_JUDGE' && linkedDeed) {
      const maxDeedPenalty = Math.max(Math.round((linkedDeed.total_price_ib || 0) * 0.25), 5000000);
      awardedAmount = Math.min(rawClaim, maxDeedPenalty);
    } else {
      awardedAmount = Math.round(rawClaim);
    }
  } else if (finalStatus === 'VERDICT_PKPU') {
    if (c.case_type === 'BANKRUPTCY' && /BCF|Bank Sentral|PKPU|Restrukturisasi/i.test(`${c.defendant_name} ${c.title}`) && c.plaintiff_user_id) {
      awardedAmount = 0;
    } else if (decidedBy === 'BOT_JUDGE' && !linkedDeed) {
      awardedAmount = Math.min(Math.round(rawClaim * 0.5), 150000000);
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
        let deductComp = defamationFine - deductPersonal;
        let newPlBal = Math.max(0, plBal - deductPersonal);
        let newPlCompBal = plCompBal - deductComp;

        await query.run('UPDATE users SET balance_ib = ?, company_balance_ib = ? WHERE id = ?', [newPlBal, newPlCompBal, plUser.id]);
        if (deductComp > 0) {
          await query.run('UPDATE companies SET company_balance_ib = company_balance_ib - ? WHERE owner_id = ?', [deductComp, plUser.id]);
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

        try {
          await query.run(
            `INSERT INTO user_inbox (id, user_id, sender_name, category, title, message, reference_id, is_read, created_at)
             VALUES (?, ?, ?, 'COURT', ?, ?, ?, 0, ?)`,
            [
              uuidv4(),
              plUser.id,
              'Majelis Hakim Arbitrase PNAF',
              `⚖️ Gugatan Ditolak: Denda Pencemaran Nama Baik (${c.case_number})`,
              `Majelis Hakim PNAF menolak seluruh gugatan Anda terhadap ${c.defendant_name} karena tidak memiliki bukti hukum sah. Anda dijatuhi sanksi ganti rugi pencemaran nama baik sebesar IB ${defamationFine.toLocaleString('id-ID')} yang telah didebit dan diserahkan kepada Tergugat.`,
              caseId,
              new Date().toISOString(),
            ]
          );

          await query.run(
            `INSERT INTO user_inbox (id, user_id, sender_name, category, title, message, reference_id, is_read, created_at)
             VALUES (?, ?, ?, 'COURT', ?, ?, ?, 0, ?)`,
            [
              uuidv4(),
              defUser.id,
              'Majelis Hakim Arbitrase PNAF',
              `🛡️ Gugatan Ditolak: Nama Baik Dipulihkan (${c.case_number})`,
              `Kabar baik! Majelis Hakim PNAF menolak gugatan ${c.plaintiff_name} terhadap Anda. Nama baik Anda dipulihkan dan kompensasi ganti rugi pencemaran nama baik sebesar IB ${defamationFine.toLocaleString('id-ID')} telah disetorkan ke saldo Anda!`,
              caseId,
              new Date().toISOString(),
            ]
          );
        } catch (_) {}

        if (io) {
          io.emit('user:balance_updated', { userId: plUser.id, newBalance: newPlBal });
          io.emit('user:balance_updated', { userId: defUser.id, newBalance: newDefBal });
        }
      }
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
        try {
          await query.run(
            `INSERT INTO user_inbox (id, user_id, sender_name, category, title, message, reference_id, is_read, created_at)
             VALUES (?, ?, ?, 'COURT', ?, ?, ?, 0, ?)`,
            [
              uuidv4(),
              plUser.id,
              'Majelis Hakim Arbitrase PNAF',
              `✅ Putusan Dikabulkan: Kompensasi IB ${awardedAmount.toLocaleString('id-ID')} (${c.case_number})`,
              `Majelis Hakim PNAF mengabulkan gugatan Anda terhadap ${c.defendant_name}. Dana ganti rugi sebesar IB ${awardedAmount.toLocaleString('id-ID')} telah disetorkan ke Kas Rekening Anda.`,
              caseId,
              new Date().toISOString(),
            ]
          );
        } catch (_) {}
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

    if (c.defendant_user_id && c.defendant_user_id !== plaintiffId && !['admin-001', 'bank-central-bcf'].includes(c.defendant_user_id)) {
      const defUser = await query.get('SELECT id, balance_ib, company_balance_ib FROM users WHERE id = ?', [c.defendant_user_id]);
      if (defUser) {
        let remainingToDeduct = awardedAmount;
        const personalBal = Number(defUser.balance_ib) || 0;
        const personalDeduct = Math.min(personalBal, remainingToDeduct);
        const newDefPersonal = Math.max(0, personalBal - personalDeduct);
        remainingToDeduct -= personalDeduct;

        let compBal = Number(defUser.company_balance_ib) || 0;
        let compDeduct = 0;
        if (remainingToDeduct > 0) {
          compDeduct = remainingToDeduct;
          compBal = compBal - compDeduct; // Boleh minus untuk memicu defisit operasional / pailit
        }

        await query.run(
          'UPDATE users SET balance_ib = ?, company_balance_ib = ? WHERE id = ?',
          [newDefPersonal, compBal, defUser.id]
        );

        // Jika Tergugat memiliki baris di companies, sinkronkan juga kas PT-nya
        await query.run(
          'UPDATE companies SET company_balance_ib = ? WHERE owner_id = ?',
          [compBal, defUser.id]
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

        try {
          await query.run(
            `INSERT INTO user_inbox (id, user_id, sender_name, category, title, message, reference_id, is_read, created_at)
             VALUES (?, ?, ?, 'COURT', ?, ?, ?, 0, ?)`,
            [
              uuidv4(),
              defUser.id,
              'Majelis Hakim Arbitrase PNAF',
              `🔨 Vonis Pengadilan PNAF (${c.case_number})`,
              `Majelis Hakim PNAF menjatuhkan putusan bersalah atas perkara ${c.case_number}. Dana ganti rugi sebesar IB ${awardedAmount.toLocaleString('id-ID')} telah dieksekusi dari kas Anda.`,
              caseId,
              new Date().toISOString(),
            ]
          );
        } catch (_) {}

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

          await query.run(
            `INSERT INTO user_inbox (id, user_id, sender_name, category, title, message, reference_id, is_read, created_at)
             VALUES (?, ?, ?, 'COURT', ?, ?, ?, 0, ?)`,
            [
              uuidv4(),
              plaintiffId,
              'Majelis Hakim Arbitrase PNAF',
              `📈 Pemulihan Saham Berhasil: ${pctToRecover}% ${targetComp.name}`,
              `Putusan inkrah Perkara No. ${c.case_number} membatalkan pengalihan sepihak oleh ${c.defendant_name}. Sebanyak ${pctToRecover}% saham (${sharesToRecover.toLocaleString('id-ID')} lbr / ${lotsToRecover} lot) resmi dikembalikan ke portofolio Anda!`,
              caseId,
              new Date().toISOString(),
            ]
          );

          await query.run(
            `INSERT INTO user_inbox (id, user_id, sender_name, category, title, message, reference_id, is_read, created_at)
             VALUES (?, ?, ?, 'COURT', ?, ?, ?, 0, ?)`,
            [
              uuidv4(),
              c.defendant_user_id,
              'Majelis Hakim Arbitrase PNAF',
              `⚖️ Eksekusi Pengembalian Saham: ${pctToRecover}% ${targetComp.name}`,
              `Berdasarkan amar putusan Perkara No. ${c.case_number}, kepemilikan ${pctToRecover}% saham ${targetComp.name} Anda resmi dibatalkan dan dikembalikan kepada ${c.plaintiff_name}.`,
              caseId,
              new Date().toISOString(),
            ]
          );

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

    // Cek apakah Tergugat kekurangan dana kas tunai untuk melunasi tuntutan denda
    let isCashDeficit = false;
    if (c.defendant_user_id) {
      const defUserCheck = await query.get('SELECT balance_ib, company_balance_ib FROM users WHERE id = ?', [c.defendant_user_id]);
      if (defUserCheck) {
        const totalDefCash = (Number(defUserCheck.balance_ib) || 0) + Math.max(0, Number(defUserCheck.company_balance_ib) || 0);
        if (awardedAmount > 0 && totalDefCash < awardedAmount) {
          isCashDeficit = true;
        }
      }
    }

    if (targetComp && plaintiffId && (isTakeoverDemand || isCashDeficit) && targetComp.owner_id !== plaintiffId) {
      // === EKSEKUSI PENGALIHAN HAK MILIK SECARA LANGSUNG KEPADA PENGGUGAT ===
      const plUser = await query.get('SELECT id, username FROM users WHERE id = ?', [plaintiffId]);
      if (plUser) {
        const prevOwnerUsername = targetComp.owner_username || 'Tergugat';
        const prevOwnerId = targetComp.owner_id;

        // 1. Update status emiten: Pemilik baru menjadi Penggugat, status SEHAT, tidak disita lagi!
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
          [plUser.id, plUser.username, targetComp.id]
        );

        // 2. Alihkan Kepemilikan Pemegang Saham (company_shareholders)
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
            [uuidv4(), targetComp.id, `${plUser.username} (Eksekusi Pengadilan)`, targetComp.total_shares || 1000000, plUser.id]
          );
        }

        // 3. Portofolio Saham: Alihkan seluruh lot pendiri ke Penggugat
        const totalLots = Math.max(1, Math.floor((Number(targetComp.total_shares) || 1000000) / 100));
        if (prevOwnerId) {
          await query.run('UPDATE portfolios SET lots_owned = 0 WHERE user_id = ? AND company_id = ?', [prevOwnerId, targetComp.id]);
        }
        const plPort = await query.get('SELECT id FROM portfolios WHERE user_id = ? AND company_id = ?', [plUser.id, targetComp.id]);
        if (plPort) {
          await query.run('UPDATE portfolios SET lots_owned = lots_owned + ? WHERE id = ?', [totalLots, plPort.id]);
        } else {
          await query.run(
            'INSERT INTO portfolios (id, user_id, company_id, lots_owned, avg_buy_price) VALUES (?, ?, ?, ?, ?)',
            [uuidv4(), plUser.id, targetComp.id, totalLots, targetComp.current_price || 100]
          );
        }

        // 4. Kirim Surat Putusan ke Kotak Pesan Penggugat
        await query.run(
          `INSERT INTO user_inbox (id, user_id, sender_name, category, title, message, reference_id, is_read, created_at)
           VALUES (?, ?, ?, 'COURT', ?, ?, ?, 0, ?)`,
          [
            uuidv4(),
            plUser.id,
            'Majelis Hakim Arbitrase PNAF',
            `👑 Hak Milik Beralih: Anda Resmi Menguasai 100% ${targetComp.name}!`,
            `Amar Putusan Inkrah No. ${c.case_number} telah dieksekusi! Karena Tergugat (${c.defendant_name}) terbukti bersalah dan ${isCashDeficit ? 'kasnya tidak mencukupi untuk membayar ganti rugi' : 'sesuai klausul sita hak milik'}, seluruh 100% kepemilikan dan saham perseroan ${targetComp.name} (${targetComp.symbol}) resmi DIALIHKAN menjadi HAK MILIK ANDA!`,
            caseId,
            new Date().toISOString(),
          ]
        );

        // 5. Kirim Surat Eksekusi ke Kotak Pesan Tergugat
        if (prevOwnerId) {
          await query.run(
            `INSERT INTO user_inbox (id, user_id, sender_name, category, title, message, reference_id, is_read, created_at)
             VALUES (?, ?, ?, 'COURT', ?, ?, ?, 0, ?)`,
            [
              uuidv4(),
              prevOwnerId,
              'Majelis Hakim Arbitrase PNAF',
              `⚖️ Sita Eksekusi Kepemilikan: PT. ${targetComp.name} Dialihkan ke Penggugat`,
              `Majelis Hakim PNAF mengeksekusi amar putusan No. ${c.case_number}. Karena ${isCashDeficit ? 'saldo kas Anda tidak mencukupi pelunasan ganti rugi' : 'klausul sita eksekusi hak milik'}, 100% kepemilikan perseroan ${targetComp.name} (${targetComp.symbol}) telah dicabut dan resmi diserahkan menjadi hak milik @${plUser.username}.`,
              caseId,
              new Date().toISOString(),
            ]
          );
        }

        // 6. Siarkan Breaking News ke Ticker Pasar
        const takeoverNews = {
          id: uuidv4(),
          title: `👑 AKUISISI EKSEKUSI PNAF: Kendali ${targetComp.name} (${targetComp.symbol}) Resmi Menjadi Milik @${plUser.username}!`,
          content: `Kepaniteraan Eksekusi PNAF resmi mengalihkan 100% saham dan kendali perseroan ${targetComp.name} dari Tergugat (@${prevOwnerUsername}) kepada Penggugat (@${plUser.username}) berdasarkan putusan inkrah No. ${c.case_number}. Saham perseroan dipulihkan aktif.`,
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

        finalNotes += ` [AKUISISI PAKSA EKSEKUSI: 100% kepemilikan perseroan ${targetComp.name} (${targetComp.symbol}) resmi dialihkan menjadi HAK MILIK Penggugat @${plUser.username} karena Tergugat gagal bayar / tuntutan sita hak milik.]`;
      }
    } else if (targetComp && targetComp.is_seized !== 1) {
      const now = new Date();
      const seizedAt = now.toISOString();
      const seizureDeadline = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
      const reason = `Sita Eksekusi Putusan Hakim PNAF No. ${c.case_number} (${c.title}) - Terbukti Wanprestasi / Bersalah`;

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
      // Pemulihan nama baik emiten & pembatalan status bermasalah / UMA jika gugatan pembelaan dikabulkan
      const plCompId = c.plaintiff_company_id || (plaintiffId ? (await query.get('SELECT id FROM companies WHERE owner_id = ? LIMIT 1', [plaintiffId]))?.id : null);
      if (plCompId) {
        await query.run(
          "UPDATE companies SET uma_flag = 0, uma_reason = NULL, suspended_at = NULL, suspend_until = NULL, suspend_reason = NULL, is_seized = 0, is_auction_ready = 0, status = 'HEALTHY' WHERE id = ?",
          [plCompId]
        );
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
          senderUserId: c.defendant_user_id || 'bot-counsel',
          message: defenseText,
        });
      }
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

      const hasDetailedFacts = (c.notes && c.notes.length > 25) || (c.target_asset_description && c.target_asset_description.length > 20);

      let isDefamationProven = false;
      let rejectReason = '';

      if (priorDismissed) {
        // Terbukti ada rekam jejak perkara fitnah / fiktif sebelumnya yang telah ditolak Pengadilan PNAF
        isDefamationProven = true;
      } else if (plComp && (plComp.uma_flag === 1 || Number(plComp.price_change_pct || 0) <= -12)) {
        // Terbukti terjadi anjlok pasar signifikan / suspensi reputasi akibat rumor Tergugat
        isDefamationProven = true;
      } else if (c.defendant_present === 0) {
        // Tergugat mangkir dari persidangan dan tidak memberikan bantahan hukum
        isDefamationProven = true;
      } else if (!hasDetailedFacts) {
        isDefamationProven = false;
        rejectReason = 'Penggugat tidak menyertakan kronologi fakta materiil, data kerugian, atau alat bukti otentik.';
      } else {
        // Pengadilan memeriksa bukti objektif dari kedua belah pihak
        const roll = Math.random();
        if (roll < 0.40) {
          isDefamationProven = true;
        } else {
          isDefamationProven = false;
          rejectReason = 'Setelah menguji log transaksi dan fakta persidangan, Tergugat tidak terbukti menyebarkan fitnah atau merugikan reputasi korporasi secara melawan hukum.';
        }
      }

      if (isDefamationProven) {
        verdictStatus = 'VERDICT_APPROVED';
        verdictType = 'APPROVED_PLAINTIFF_WIN';
        customAwardedAmount = Math.min(rawClaim || 50000000, 500000000);
        verdictNotes = `✅ GUGATAN PENCEMARAN NAMA BAIK DIKABULKAN (APPROVED): ${BOT_JUDGE_NAME} memeriksa alat bukti persidangan dan menyatakan Tergugat (${c.defendant_name}) TERBUKTI mencemarkan nama baik perseroan Penggugat (${c.plaintiff_name}). Menghukum Tergugat membayar ganti rugi sebesar IB ${customAwardedAmount.toLocaleString('id-ID')}. Apabila kas Tergugat tidak mencukupi, berlaku klausul sita eksekusi hak milik perseroan!`;
      } else {
        verdictStatus = 'VERDICT_REJECTED';
        verdictType = 'GUGUR_DISMISSED';
        const finePl = Math.max(10000000, Math.min(100000000, Math.round(rawClaim * 0.10)));
        customAwardedAmount = 0;
        verdictNotes = `❌ GUGATAN PENCEMARAN NAMA BAIK DITOLAK: ${BOT_JUDGE_NAME} memeriksa fakta hukum persidangan. ${rejectReason} Gugatan Penggugat dinyatakan TIDAK TERBUKTI. Menghukum Penggugat membayar sanksi denda perkara fiktif sebesar IB ${finePl.toLocaleString('id-ID')} kepada Tergugat.`;
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

        if (c.defendant_present === 0) {
          verdictStatus = 'VERDICT_APPROVED';
          verdictType = 'VERSTEK_PLAINTIFF_WIN';
        } else if (!hasShareRelationship && rawClaim > 5000000000) {
          // Tuntutan saham miliaran tanpa ada bukti akta dan bukan pemegang saham -> DITOLAK KERAS!
          verdictStatus = 'VERDICT_REJECTED';
          verdictType = 'GUGUR_DISMISSED';
          const defamationFine = Math.max(10000000, Math.min(100000000, Math.round(rawClaim * 0.10)));
          customAwardedAmount = 0;
          verdictNotes = `❌ SENGKETA SAHAM DITOLAK: ${BOT_JUDGE_NAME} memeriksa buku pemegang saham perseroan. Penggugat tidak memiliki bukti Akta Notaris maupun catatan kepemilikan saham di Brankas PNAF. Penggugat dihukum denda perkara fiktif IB ${defamationFine.toLocaleString('id-ID')}.`;
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
  executeCourtVerdict,
  healExistingCourtCases,
  isAutoJudgeEnabled,
  setAutoJudgeEnabled,
  getAutoJudgeStatusPayload,
  CourtJudgeBotService,
};

