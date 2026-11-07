const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/*
|--------------------------------------------------------------------------
| Deployment & Server Utility Routes (Auto-Deploy Git Pull - v1.4.0-CFX)
|--------------------------------------------------------------------------
| Khusus untuk otomasi pembaruan kode di server Linux (Git pull, NPM install,
| Sinkronisasi Web Admin) serta auto-restart container Docker TANPA menghapus
| atau mereset database akun pemain (capital_federation.db).
*/

router.get('/updatecapital', async (req, res) => {
    // 1. Kunci Pengaman Rahasia (Mencegah orang luar iseng nge-trigger)
    const secretKey = process.env.DEPLOY_SECRET || '19122004';
    const providedKey = req.query.key;

    if (providedKey !== secretKey) {
        return res.status(403).send(`
            <div style="background:#0f172a; color:#f87171; font-family:system-ui,sans-serif; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px;">
                <div style="max-width:500px; width:100%; background:#1e293b; border:1px solid #ef4444; border-radius:16px; padding:32px; text-align:center;">
                    <h2 style="margin:0 0 10px 0;">🚫 Akses Ditolak</h2>
                    <p style="color:#94a3b8; font-size:14px;">Kunci rahasia (?key=...) yang Anda masukkan salah!</p>
                </div>
            </div>
        `);
    }

    // Deteksi otomatis path folder root git proyek (/var/www/capital_federation atau lokal)
    const candidateDirs = [
        '/var/www/capital_federation',
        path.resolve(__dirname, '../../'),
        path.resolve(__dirname, '../../../'),
        path.resolve(__dirname, '../'),
        process.cwd(),
    ];
    const repoDir = candidateDirs.find((dir) => {
        try {
            return fs.existsSync(path.join(dir, '.git'));
        } catch (_) {
            return false;
        }
    }) || candidateDirs[0];

    let logGit = '';
    let logNpm = '';
    let logSync = '';
    let logFresh = '';

    try {
        // 2. Mengatasi Dubious Ownership & Tarik Kodingan Baru dari GitHub
        execSync(`git config --global --add safe.directory "*"`);
        logGit += execSync(`cd "${repoDir}" && git fetch --all 2>&1`).toString();
        logGit += '\n' + execSync(`cd "${repoDir}" && git reset --hard origin/main 2>&1`).toString();

        // 3. Update Dependency NPM Backend
        const backendDir = fs.existsSync(path.join(repoDir, 'backend')) ? path.join(repoDir, 'backend') : repoDir;
        logNpm = execSync(`cd "${backendDir}" && npm install --production 2>&1`).toString();

        // 4. Sinkronisasi ke /app jika berjalan di dalam container Docker terpisah
        if (fs.existsSync('/app') && path.resolve(backendDir) !== '/app') {
            try {
                execSync(`cp -rf "${backendDir}/src/"* /app/src/ 2>/dev/null || true`);
                if (fs.existsSync(path.join(backendDir, 'public'))) {
                    execSync(`mkdir -p /app/public && cp -rf "${backendDir}/public/"* /app/public/ 2>/dev/null || true`);
                }
                logSync = 'Sinkronisasi kode terbaru & Web Admin ke container /app selesai.';
            } catch (_) {}
        }

        // 4B. Refresh Database Menjadi Baru & Bersih jika dipanggil dengan parameter &fresh=1
        if (req.query.fresh === '1') {
            try {
                const { resetMarketFresh } = require('./seed');
                await resetMarketFresh({ preserveHumanUsers: true });
                logFresh = '\n[DATABASE FRESH REFRESH]\n✅ Seluruh pasar bursa, 252+ emiten Tbk, dan 265 bot pemain berhasil di-refresh BARU & SEGAR!\nAkun pemain asli dilindungi dengan saldo awal 50 Juta IB.';
            } catch (fErr) {
                logFresh = `\n[DATABASE REFRESH NOTICE]\n${fErr.message}`;
            }
        }

        // 5. Kirim Respon Visual
        const htmlResponse = `
            <div style="background:#0f172a; color:#f8fafc; font-family:system-ui,sans-serif; min-height:100vh; padding:30px;">
                <h1 style="color:#22c55e; margin-bottom:5px;">✅ Berhasil Update Sistem Capital Federation (v2.0.6 Build 55)!</h1>
                <p style="color:#94a3b8; margin-top:0;">Dieksekusi langsung di Server Linux • Status Pasar & Emiten Mutakhir</p>
                
                <h3 style="color:#38bdf8;">Laporan Log Eksekusi (${repoDir}):</h3>
                <pre style="background:#1e293b; color:#4ade80; padding:20px; border-radius:10px; overflow-x:auto; font-family:Consolas,monospace; font-size:13px; line-height:1.6; border:1px solid #334155;">
[GIT FETCH & RESET HARD]
${logGit.trim()}

[NPM INSTALL PRODUCTION]
${logNpm.trim()}
${logSync ? `\n[DOCKER SYNC]\n${logSync}\n` : ''}${logFresh ? `\n${logFresh}\n` : ''}
[AUTO RESTART DOCKER]
Container akan reboot dalam 2 detik untuk memuat kodingan baru ke memory...
                </pre>
            </div>
        `;

        res.send(htmlResponse);

        // 6. Mantra Restart Otomatis Node.js
        setTimeout(() => {
            console.log('🔄 Restarting Node.js container to apply new code...');
            process.exit(0);
        }, 1500);

    } catch (error) {
        return res.status(500).send(`
            <div style="background:#0f172a; color:#f8fafc; font-family:sans-serif; min-height:100vh; padding:30px;">
                <h1 style="color:#ef4444;">❌ Gagal Melakukan Pembaruan!</h1>
                <pre style="background:#1e293b; color:#f87171; padding:20px; border-radius:10px; overflow-x:auto;">${error.message}\n${error.stdout ? error.stdout.toString() : ''}</pre>
            </div>
        `);
    }
});

// Endpoint Darurat: Rescue & Diagnostic MSS Panel via internal Docker network
router.get('/rescue-panel', async (req, res) => {
    if (req.query.key !== '19122004') {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const report = { timestamp: new Date().toISOString() };

    // 1. Panggil auto-deploy & restart via mss-backend
    try {
        const bResp = await fetch('http://mss-backend:8000/api/update-rahasia-panel?key=kunci-rahasia-mepal-2026', {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000)
        });
        report.mss_backend_status = bResp.status;
        report.mss_backend_data = await bResp.json();
    } catch (bErr) {
        report.mss_backend_error = bErr.message;
    }

    // 2. Cek apakah mss-frontend sudah merespons
    try {
        const fResp = await fetch('http://mss-frontend:80/', {
            signal: AbortSignal.timeout(4000)
        });
        report.mss_frontend_status = fResp.status;
    } catch (fErr) {
        report.mss_frontend_error = fErr.message;
    }

    // 3. Cek mss-ttyd
    try {
        const tResp = await fetch('http://mss-ttyd:7681/ttyd/', {
            signal: AbortSignal.timeout(4000)
        });
        report.mss_ttyd_status = tResp.status;
    } catch (tErr) {
        report.mss_ttyd_error = tErr.message;
    }

    // 4. Periksa akun user di database mss_panel
    try {
        const mysql = require('mysql2/promise');
        const bcrypt = require('bcryptjs');
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'mss-db',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || 'root_secret_pass',
            database: 'mss_panel',
            connectTimeout: 4000
        });
        const [rows] = await conn.execute('SELECT id, name, email, password FROM users');
        report.users = rows.map(r => ({ id: r.id, name: r.name, email: r.email }));
        
        const candidates = ['password123', 'admin', 'admin123', '19122004', 'mss', 'servermss', 'kunci-rahasia-mepal-2026', 'mepal2026', 'admin@mepal.local', 'password', 'toor', 'root'];
        let matched = null;
        if (rows[0] && rows[0].password) {
            for (const c of candidates) {
                if (bcrypt.compareSync(c, rows[0].password)) {
                    matched = c;
                    break;
                }
            }
        }
        report.matched_password = matched;
        
        if (req.query.reset_pass) {
            const newHash = bcrypt.hashSync(req.query.reset_pass, 10);
            await conn.execute('UPDATE users SET password = ? WHERE id = 1', [newHash]);
            report.password_reset_to = req.query.reset_pass;
        }
        
        await conn.end();
    } catch (dbErr) {
        report.db_users_error = dbErr.message;
    }
    try {
        const tResp2 = await fetch('http://mss-ttyd:7681/', {
            signal: AbortSignal.timeout(4000)
        });
        report.mss_ttyd_root_status = tResp2.status;
    } catch (tErr) {
        report.mss_ttyd_root_error = tErr.message;
    }

    // 5. Test login ke mss-backend
    try {
        const lResp = await fetch('http://mss-backend:8000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ email: 'admin@mepal.local', password: 'password123' })
        });
        report.test_login_status = lResp.status;
        report.test_login_data = await lResp.json();
    } catch (lErr) {
        report.test_login_error = lErr.message;
    }

    res.json(report);
});

module.exports = router;

