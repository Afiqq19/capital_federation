const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const {
  BOT_CLERK_NAME,
  formatCourtCase,
  formatCourtMessage,
  appendCourtChat,
  executeCourtVerdict,
  getAutoJudgeStatusPayload,
  setAutoJudgeEnabled,
  isAutoJudgeEnabled,
} = require('../services/courtEngine.service');

module.exports = function (io, courtJudgeBot) {
  const router = express.Router();

  // 0. Status & Sakelar ON/OFF Majelis Hakim Bot Otomatis PNAF
  router.get('/auto-judge/status', async (req, res) => {
    try {
      const payload = await getAutoJudgeStatusPayload();
      res.json(payload);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/auto-judge/toggle', async (req, res) => {
    try {
      const current = await isAutoJudgeEnabled();
      const nextEnabled =
        req.body && typeof req.body.enabled === 'boolean' ? req.body.enabled : !current;
      await setAutoJudgeEnabled(nextEnabled);
      const payload = await getAutoJudgeStatusPayload();
      io.emit('court:auto_judge_updated', payload);

      // Jika baru dinyalakan ke mode Otomatis, langsung picu pemeriksaan perkara yang menunggu
      if (nextEnabled && courtJudgeBot) {
        setTimeout(() => {
          courtJudgeBot.tick().catch(() => {});
        }, 500);
      }

      res.json({
        success: true,
        ...payload,
        message: nextEnabled
          ? '🤖 Mode Majelis Hakim Bot Otomatis PNAF DIAKTIFKAN! Perkara baru & aktif akan diproses otomatis.'
          : '👨‍⚖️ Mode Majelis Hakim diubah ke MANUAL! Seluruh ketukan palu menunggu keputusan Admin/Hakim Agung.',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/auto-judge/process-now', async (req, res) => {
    try {
      const { caseId } = req.body || {};
      if (!courtJudgeBot) {
        return res.status(503).json({ error: 'Engine Bot Hakim belum siap' });
      }
      const result = await courtJudgeBot.tick({
        forceImmediate: true,
        targetCaseId: caseId || null,
      });
      const statusPayload = await getAutoJudgeStatusPayload();
      res.json({
        success: true,
        processed: result.processed || 0,
        status: statusPayload,
        message:
          (result.processed || 0) > 0
            ? `⚡ Bot Majelis Hakim PNAF berhasil memutus ${result.processed} perkara secara instan!`
            : 'Tidak ada perkara berstatus DALAM SIDANG (IN_TRIAL) yang menunggu putusan.',
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1. Ambil Detail Ruang Sidang Live (Dual Format: snake_case & camelCase)
  router.get('/room/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const courtCase = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!courtCase) {
        return res.status(404).json({ error: 'Perkara pengadilan tidak ditemukan' });
      }

      const messages = await query.all(
        'SELECT * FROM court_chat_messages WHERE case_id = ? ORDER BY created_at ASC',
        [caseId]
      );

      res.json(formatCourtCase(courtCase, messages || []));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 1b. Ambil Daftar Pesan Ruang Sidang (Kompatibilitas penuh Mobile APK)
  router.get('/room/:caseId/messages', async (req, res) => {
    try {
      const { caseId } = req.params;
      const messages = await query.all(
        'SELECT * FROM court_chat_messages WHERE case_id = ? ORDER BY created_at ASC',
        [caseId]
      );
      res.json((messages || []).map(formatCourtMessage));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Presensi Masuk Sidang (Tombol: [🟢 SAYA HADIR])
  router.post('/room/check-in', async (req, res) => {
    try {
      const { caseId, userId, role } = req.body || {};
      const courtCase = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!courtCase) return res.status(404).json({ error: 'Perkara tidak ditemukan' });

      const user = userId ? await query.get('SELECT id, username FROM users WHERE id = ?', [userId]) : null;
      const unameLower = (user?.username || '').toLowerCase();

      let isPlaintiff = role === 'PLAINTIFF';
      if (!role && userId) {
        if (courtCase.plaintiff_user_id === userId) {
          isPlaintiff = true;
        } else if (courtCase.defendant_user_id === userId) {
          isPlaintiff = false;
        } else if (unameLower && (courtCase.plaintiff_name || '').toLowerCase().includes(unameLower)) {
          isPlaintiff = true;
        } else {
          isPlaintiff = false;
        }
      }

      if (isPlaintiff) {
        await query.run(
          "UPDATE court_cases SET plaintiff_present = 1, plaintiff_user_id = COALESCE(plaintiff_user_id, ?), room_status = CASE WHEN room_status = 'WAITING_PRESENCE' THEN 'IN_SESSION' ELSE room_status END WHERE id = ?",
          [userId || null, caseId]
        );
      } else {
        await query.run(
          "UPDATE court_cases SET defendant_present = 1, defendant_user_id = COALESCE(defendant_user_id, ?), room_status = CASE WHEN room_status = 'WAITING_PRESENCE' THEN 'IN_SESSION' ELSE room_status END WHERE id = ?",
          [userId || null, caseId]
        );
      }

      const partyName = user ? user.username : isPlaintiff ? courtCase.plaintiff_name : courtCase.defendant_name;
      await appendCourtChat(io, {
        caseId,
        senderName: BOT_CLERK_NAME,
        senderRole: 'PANITERA',
        message: `🟢 PRESENSI TERVERIFIKASI: ${partyName} (${isPlaintiff ? 'Pihak Penggugat' : 'Pihak Tergugat'}) telah hadir secara resmi di ruang persidangan.`,
      });

      const updated = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      const formatted = formatCourtCase(updated);

      io.emit(`court:presence_updated:${caseId}`, {
        caseId,
        plaintiffPresent: updated.plaintiff_present === 1,
        defendantPresent: updated.defendant_present === 1,
        partyName,
        role: isPlaintiff ? 'PLAINTIFF' : 'DEFENDANT',
      });
      io.emit('court:case_updated', formatted);

      res.json({
        success: true,
        message: 'Presensi kehadiran Anda resmi dicatat oleh Panitera Sidang PNAF.',
        case: formatted,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Kirim Pesan Argumen / Pembelaan / Instruksi Hakim di Room Sidang
  router.post('/room/:caseId/messages', async (req, res) => {
    try {
      const { caseId } = req.params;
      const { senderName, senderRole, role, senderUserId, message } = req.body || {};

      if (!message || String(message).trim() === '') {
        return res.status(400).json({ error: 'Pesan sidang tidak boleh kosong' });
      }

      const rawRole = String(senderRole || role || 'PENGGUGAT').toUpperCase();
      let normalizedRole = 'PENGGUGAT';
      if (rawRole.includes('HAKIM') || rawRole === 'JUDGE') normalizedRole = 'HAKIM';
      else if (rawRole.includes('PANITERA') || rawRole === 'SYSTEM' || rawRole === 'CLERK') normalizedRole = 'PANITERA';
      else if (rawRole.includes('TERGUGAT') || rawRole === 'DEFENDANT') normalizedRole = 'TERGUGAT';
      else normalizedRole = 'PENGGUGAT';

      const msgObj = await appendCourtChat(io, {
        caseId,
        senderName: senderName || 'Peserta Sidang',
        senderRole: normalizedRole,
        senderUserId: senderUserId || null,
        message: String(message).trim(),
      });

      res.json({ success: true, message: msgObj });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Atur Jadwal Sidang (Hakim / Panitera)
  router.post('/room/:caseId/schedule', async (req, res) => {
    try {
      const { caseId } = req.params;
      const { hearingDate, hearingTime, courtRoomName } = req.body || {};
      const c = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!c) return res.status(404).json({ error: 'Perkara tidak ditemukan' });

      const dateStr = hearingDate || c.court_hearing_date;
      const timeStr = hearingTime || c.hearing_time || '10:00 WIB';
      const roomStr = courtRoomName || c.court_room_name || 'Ruang Sidang Utama Kartika PNAF';

      await query.run(
        'UPDATE court_cases SET court_hearing_date = ?, hearing_time = ?, court_room_name = ? WHERE id = ?',
        [dateStr, timeStr, roomStr, caseId]
      );

      await appendCourtChat(io, {
        caseId,
        senderName: BOT_CLERK_NAME,
        senderRole: 'PANITERA',
        message: `📅 JADWAL SIDANG DITETAPKAN: ${dateStr} pukul ${timeStr} bertempat di ${roomStr}.`,
      });

      const updated = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      const formatted = formatCourtCase(updated);
      io.emit(`court:scheduled:${caseId}`, formatted);
      io.emit('court:case_updated', formatted);

      res.json({ success: true, message: 'Jadwal sidang berhasil ditetapkan!', case: formatted });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Kirim Surat Panggilan Sidang Resmi (Relaas Elektronik)
  router.post('/room/:caseId/send-summons', async (req, res) => {
    try {
      const { caseId } = req.params;
      const c = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!c) return res.status(404).json({ error: 'Perkara tidak ditemukan' });

      await query.run('UPDATE court_cases SET summons_sent = 1 WHERE id = ?', [caseId]);

      await appendCourtChat(io, {
        caseId,
        senderName: BOT_CLERK_NAME,
        senderRole: 'PANITERA',
        message: `📨 RELAAS PANGGILAN RESMI PNAF: Surat panggilan sidang elektronik telah diterbitkan kepada Penggugat (${c.plaintiff_name}) dan Tergugat (${c.defendant_name}). Harap hadir tepat waktu.`,
      });

      const newsItem = {
        id: uuidv4(),
        title: `⚖️ PANGGILAN SIDANG PNAF: Perkara No. ${c.case_number}`,
        content: `Panitera PNAF menerbitkan panggilan resmi kepada ${c.plaintiff_name} (Penggugat) dan ${c.defendant_name} (Tergugat) untuk hadir pada sidang perkara ${c.title}. Jadwal: ${c.court_hearing_date} ${c.hearing_time || '10:00 WIB'} di ${c.court_room_name || 'Ruang Sidang Kartika'}.`,
        affected_sector: 'Semua Sektor',
        affectedSector: 'Semua Sektor',
        sentiment: 'NEUTRAL',
        published_at: new Date().toISOString(),
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );
      io.emit('market:news_broadcast', newsItem);
      io.emit('market:breaking_news', newsItem);

      const updated = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      io.emit(`court:summons_sent:${caseId}`, { caseId, summonsSent: true });
      io.emit('court:case_updated', formatCourtCase(updated));

      res.json({ success: true, message: 'Surat panggilan sidang resmi berhasil disiarkan!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Ketuk Palu Vonis dari Ruang Sidang Live (Admin Hakim Agung atau Evaluasi Bot Hakim)
  router.post('/room/verdict', async (req, res) => {
    try {
      const {
        caseId,
        adminJudgeOverride,
        forcedVerdictType,
        verdictStatus,
        verdictNotes,
        awardedAmount,
        userId,
      } = req.body || {};

      const c = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!c) return res.status(404).json({ error: 'Perkara tidak ditemukan' });

      // Cek apakah pemanggil adalah Admin / Hakim Otoritas
      let isCallerAdmin = Boolean(adminJudgeOverride);
      if (!isCallerAdmin && userId) {
        const caller = await query.get('SELECT role, username FROM users WHERE id = ?', [userId]);
        if (
          caller &&
          (String(caller.role || '').toUpperCase() === 'ADMIN' ||
            ['admin', 'msyafiq19'].includes(String(caller.username || '').toLowerCase()))
        ) {
          isCallerAdmin = true;
        }
      }

      if (!isCallerAdmin) {
        // Jika bukan Admin: cek apakah Bot Hakim Otomatis sedang aktif
        const autoEnabled = await isAutoJudgeEnabled();
        if (!autoEnabled) {
          return res.status(403).json({
            error:
              'Persidangan sedang berada dalam Mode Manual Hakim Agung. Ketukan palu putusan hanya dapat dilakukan oleh Majelis Hakim Otoritas PNAF.',
          });
        }
        // Jika Bot Hakim Otomatis aktif, jalankan musyawarah & putusan resmi oleh Bot Hakim
        if (courtJudgeBot) {
          await courtJudgeBot.tick({ forceImmediate: true, targetCaseId: caseId });
          const decided = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
          return res.json({
            success: true,
            caseId,
            verdictStatus: decided?.status,
            verdictType: decided?.verdict_type,
            notes: decided?.verdict_notes,
            awardedAmount: decided?.verdict_awarded_amount || 0,
            case: formatCourtCase(decided),
            message: '🔨 Majelis Hakim Bot PNAF telah bermusyawarah dan mengetuk palu putusan!',
          });
        }
      }

      const result = await executeCourtVerdict(io, {
        caseId,
        verdictStatus: verdictStatus || null,
        verdictType: forcedVerdictType || null,
        verdictNotes: verdictNotes || '',
        customAwardedAmount: awardedAmount,
        decidedBy: 'ADMIN_MANUAL',
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
