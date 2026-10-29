const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');

module.exports = function(io) {
  // 1. Ambil Detail Ruang Sidang Live
  router.get('/room/:caseId', async (req, res) => {
    try {
      const { caseId } = req.params;
      const courtCase = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!courtCase) return res.status(404).json({ error: 'Perkara pengadilan tidak ditemukan' });

      const messages = await query.all(
        'SELECT * FROM court_chat_messages WHERE case_id = ? ORDER BY created_at ASC',
        [caseId]
      );

      res.json({
        ...courtCase,
        messages: messages || []
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Presensi Masuk Sidang (Tombol: [🟢 SAYA HADIR])
  router.post('/room/check-in', async (req, res) => {
    try {
      const { caseId, userId, role } = req.body; // role: 'PLAINTIFF' atau 'DEFENDANT'
      const courtCase = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!courtCase) return res.status(404).json({ error: 'Perkara tidak ditemukan' });

      let isPlaintiff = role === 'PLAINTIFF' || courtCase.plaintiff_user_id === userId;
      let updateSql = isPlaintiff 
        ? 'UPDATE court_cases SET plaintiff_present = 1 WHERE id = ?' 
        : 'UPDATE court_cases SET defendant_present = 1 WHERE id = ?';
      
      await query.run(updateSql, [caseId]);

      // Catat log panitera ke chat room
      const user = await query.get('SELECT username FROM users WHERE id = ?', [userId]);
      const partyName = user ? user.username : (isPlaintiff ? 'Penggugat' : 'Tergugat');
      const logMsgId = uuidv4();
      await query.run(
        'INSERT INTO court_chat_messages (id, case_id, sender_name, sender_role, message) VALUES (?, ?, ?, ?, ?)',
        [logMsgId, caseId, 'Panitera Sidang PNAK', 'PANITERA', `🟢 ${partyName} (${isPlaintiff ? 'Pihak Penggugat' : 'Pihak Tergugat'}) Telah Hadir Memenuhi Panggilan Sidang.`]
      );

      const updated = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);

      // Broadcast update presensi ke semua peserta di room
      io.emit(`court:presence_updated:${caseId}`, {
        caseId,
        plaintiffPresent: updated.plaintiff_present === 1,
        defendantPresent: updated.defendant_present === 1,
        partyName,
        role: isPlaintiff ? 'PLAINTIFF' : 'DEFENDANT'
      });

      res.json({
        success: true,
        message: 'Presensi kehadiran Anda resmi dicatat oleh Panitera Sidang PNAK.',
        case: updated
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Kirim Pesan Argumen / Pembelaan di Room Sidang
  router.post('/room/:caseId/messages', async (req, res) => {
    try {
      const { caseId } = req.params;
      const { senderName, senderRole, message } = req.body;

      if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'Pesan sidang tidak boleh kosong' });
      }

      const msgId = uuidv4();
      await query.run(
        'INSERT INTO court_chat_messages (id, case_id, sender_name, sender_role, message) VALUES (?, ?, ?, ?, ?)',
        [msgId, caseId, senderName || 'Peserta Sidang', senderRole || 'PENGGUGAT', message.trim()]
      );

      const msgObj = {
        id: msgId,
        case_id: caseId,
        sender_name: senderName || 'Peserta Sidang',
        sender_role: senderRole || 'PENGGUGAT',
        message: message.trim(),
        created_at: new Date().toISOString()
      };

      io.emit(`court:new_message:${caseId}`, msgObj);
      res.json({ success: true, message: msgObj });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Atur Jadwal Sidang (Hakim / Panitera)
  router.post('/room/:caseId/schedule', async (req, res) => {
    try {
      const { caseId } = req.params;
      const { hearingDate, hearingTime, courtRoomName } = req.body;
      const c = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!c) return res.status(404).json({ error: 'Perkara tidak ditemukan' });

      const dateStr = hearingDate || c.court_hearing_date;
      const timeStr = hearingTime || c.hearing_time || '10:00 WIB';
      const roomStr = courtRoomName || c.court_room_name || 'Ruang Sidang Utama Kartika PNAF';

      await query.run(
        'UPDATE court_cases SET court_hearing_date = ?, hearing_time = ?, court_room_name = ? WHERE id = ?',
        [dateStr, timeStr, roomStr, caseId]
      );

      // Siarkan log panitera ke room
      const logMsgId = uuidv4();
      const schedMsg = `📅 JADWAL SIDANG DITETAPKAN: ${dateStr} pukul ${timeStr} bertempat di ${roomStr}.`;
      await query.run(
        'INSERT INTO court_chat_messages (id, case_id, sender_name, sender_role, message) VALUES (?, ?, ?, ?, ?)',
        [logMsgId, caseId, 'Panitera Sidang PNAF', 'PANITERA', schedMsg]
      );

      const updated = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      io.emit(`court:scheduled:${caseId}`, updated);
      io.emit('court:case_updated', updated);

      res.json({ success: true, message: 'Jadwal sidang berhasil ditetapkan!', case: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Kirim Surat Panggilan Sidang Resmi (Undangan Relaas Panggilan Elektronik)
  router.post('/room/:caseId/send-summons', async (req, res) => {
    try {
      const { caseId } = req.params;
      const c = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!c) return res.status(404).json({ error: 'Perkara tidak ditemukan' });

      await query.run('UPDATE court_cases SET summons_sent = 1 WHERE id = ?', [caseId]);

      // Catat log panitera
      const logMsgId = uuidv4();
      const summonsMsg = `📨 RELAAS PANGGILAN RESMI PNAF: Surat panggilan sidang elektronik telah diterbitkan kepada Penggugat (${c.plaintiff_name}) dan Tergugat (${c.defendant_name}). Harap hadir tepat waktu.`;
      await query.run(
        'INSERT INTO court_chat_messages (id, case_id, sender_name, sender_role, message) VALUES (?, ?, ?, ?, ?)',
        [logMsgId, caseId, 'Panitera Sidang PNAF', 'PANITERA', summonsMsg]
      );

      // Siarkan notifikasi breaking news panggilan sidang
      const newsItem = {
        id: uuidv4(),
        title: `⚖️ PANGGILAN SIDANG PNAF: Perkara No. ${c.case_number}`,
        content: `Panitera PNAF menerbitkan panggilan resmi kepada ${c.plaintiff_name} (Penggugat) dan ${c.defendant_name} (Tergugat) untuk hadir pada sidang perkara ${c.title}. Jadwal: ${c.court_hearing_date} ${c.hearing_time || '10:00 WIB'} di ${c.court_room_name || 'Ruang Sidang Kartika'}.`,
        affected_sector: 'Semua Sektor',
        sentiment: 'NEUTRAL',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );
      io.emit('market:news_broadcast', newsItem);
      io.emit('market:breaking_news', newsItem);
      io.emit(`court:summons_sent:${caseId}`, { caseId, summonsSent: true });

      res.json({ success: true, message: 'Surat panggilan sidang resmi berhasil disiarkan!' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Ketuk Palu Vonis (Verstek / Gugur / Batal / Vonis Damai)
  router.post('/room/verdict', async (req, res) => {
    try {
      const { caseId, adminJudgeOverride, forcedVerdictType } = req.body;
      const c = await query.get('SELECT * FROM court_cases WHERE id = ?', [caseId]);
      if (!c) return res.status(404).json({ error: 'Perkara tidak ditemukan' });

      let verdictType = forcedVerdictType;
      let verdictStatus = 'VERDICT_PAILIT';
      let notes = '';
      let awardedAmount = 0.0;

      // Evaluasi Otomatis berdasarkan Kehadiran jika tidak di-override
      if (!verdictType) {
        if (c.plaintiff_present === 1 && c.defendant_present === 0) {
          verdictType = 'VERSTEK_PLAINTIFF_WIN';
        } else if (c.plaintiff_present === 0 && c.defendant_present === 1) {
          verdictType = 'GUGUR_DISMISSED';
        } else if (c.plaintiff_present === 0 && c.defendant_present === 0) {
          verdictType = 'BATAL_ANNULLED';
        } else {
          verdictType = 'SETTLED_MEDIATION';
        }
      }

      // -------------------------------------------------------------
      // SKENARIO A: VERSTEK (Penggugat Hadir, Tergugat MANGKIR)
      // Penggugat Menang Mutlak, Uang Sitaan Penalti Cair ke Kas Penggugat!
      // -------------------------------------------------------------
      if (verdictType === 'VERSTEK_PLAINTIFF_WIN') {
        verdictStatus = 'VERDICT_PAILIT';
        awardedAmount = c.claim_amount_ib || 1000000000.0;
        notes = `⚖️ PUTUSAN VERSTEK MAJELIS HAKIM PNAK: Tergugat (${c.defendant_name}) dinyatakan MANGKIR dan kehilangan hak membela diri. Gugatan Penggugat dikabulkan PENUH. Sita eksekusi ganti rugi sebesar IB ${awardedAmount.toLocaleString('id-ID')} dicairkan seketika ke Kas Pribadi Penggugat.`;

        // Eksekusi pencairan uang jika ada plaintiff_user_id
        if (c.plaintiff_user_id) {
          await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [awardedAmount, c.plaintiff_user_id]);
        }

        // Potong dari tergugat jika terdaftar
        if (c.defendant_user_id) {
          await query.run('UPDATE users SET balance_ib = MAX(0, balance_ib - ?) WHERE id = ?', [awardedAmount, c.defendant_user_id]);
        }
      } 
      // -------------------------------------------------------------
      // SKENARIO B: GUGUR (Tergugat Hadir, Penggugat MANGKIR)
      // -------------------------------------------------------------
      else if (verdictType === 'GUGUR_DISMISSED') {
        verdictStatus = 'VERDICT_REJECTED';
        notes = `⚖️ PUTUSAN MAJELIS HAKIM PNAK: Penggugat (${c.plaintiff_name}) dinyatakan MANGKIR dan lalai membuktikan tuntutan. Gugatan dinyatakan GUGUR DEMI HUKUM.`;
      } 
      // -------------------------------------------------------------
      // SKENARIO C: BATAL (Keduanya Sama-Sama Mangkir)
      // -------------------------------------------------------------
      else if (verdictType === 'BATAL_ANNULLED') {
        verdictStatus = 'VERDICT_REJECTED';
        notes = `⚖️ PENETAPAN HAKIM PNAK: Kedua belah pihak mangkir dari sidang. Perkara No. ${c.case_number} dinyatakan BATAL & GUGUR.`;
      } 
      // -------------------------------------------------------------
      // SKENARIO D: MEDIASI / SIDANG KEDUANYA HADIR
      // -------------------------------------------------------------
      else {
        verdictStatus = 'VERDICT_PKPU';
        awardedAmount = Math.round((c.claim_amount_ib || 1000000000.0) * 0.5);
        notes = `⚖️ VONIS MEDIASI ARBITRASE PNAK: Tergugat diwajibkan membayar kompensasi restrukturisasi sebesar IB ${awardedAmount.toLocaleString('id-ID')} kepada Penggugat dalam waktu 30 hari bursa.`;
        if (c.plaintiff_user_id) {
          await query.run('UPDATE users SET balance_ib = balance_ib + ? WHERE id = ?', [awardedAmount, c.plaintiff_user_id]);
        }
      }

      await query.run(
        `UPDATE court_cases 
         SET status = ?, verdict_notes = ?, verdict_type = ?, verdict_awarded_amount = ?, room_status = 'VERDICT_DELIVERED', closed_at = ?
         WHERE id = ?`,
        [verdictStatus, notes, verdictType, awardedAmount, new Date().toISOString(), caseId]
      );

      // Siarkan Breaking News Ketuk Palu
      const newsItem = {
        id: uuidv4(),
        title: `⚖️ KETUK PALU PNAK: Perkara No. ${c.case_number} Resmi Diputus!`,
        content: notes,
        affected_sector: 'Semua Sektor',
        sentiment: verdictType === 'VERSTEK_PLAINTIFF_WIN' ? 'BEARISH' : 'NEUTRAL',
        published_at: new Date().toISOString()
      };
      await query.run(
        'INSERT INTO news (id, title, content, affected_sector, sentiment, published_at) VALUES (?, ?, ?, ?, ?, ?)',
        [newsItem.id, newsItem.title, newsItem.content, newsItem.affected_sector, newsItem.sentiment, newsItem.published_at]
      );
      io.emit('market:news_broadcast', newsItem);

      // Siarkan Event Ketuk Palu & Mulai Countdown 60 Detik Auto Exit
      io.emit(`court:verdict_reached:${caseId}`, {
        caseId,
        verdictType,
        verdictStatus,
        notes,
        awardedAmount,
        autoExitSeconds: 60
      });

      res.json({
        success: true,
        caseId,
        verdictType,
        notes,
        awardedAmount,
        message: '🔨 Palu Sidang Resmi Diketok Tiga Kali! Berita Acara Putusan Terbit.'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
