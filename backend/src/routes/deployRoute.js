const express = require('express');
const router = express.Router();
const { execSync } = require('child_process');
const path = require('path');

/*
|--------------------------------------------------------------------------
| Deployment & Server Utility Routes (Auto-Deploy Git Pull)
|--------------------------------------------------------------------------
| Khusus untuk otomasi pembaruan kode di server (Git pull, NPM install,
| Database Migration) serta auto-restart container Docker.
*/

router.get('/updatecapital', (req, res) => {
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

    // Path folder root proyek (/var/www/capital_federation)
    const repoDir = path.resolve(__dirname, '../../../');
    let logGit = '';
    let logNpm = '';
    let logBuild = '';

    try {
        // 2. Mengatasi Dubious Ownership & Tarik Kodingan Baru dari GitHub
        execSync(`git config --global --add safe.directory "*"`);
        logGit += execSync(`cd "${repoDir}" && git fetch --all 2>&1`).toString();
        logGit += '\n' + execSync(`cd "${repoDir}" && git reset --hard origin/main 2>&1`).toString();

        // 3. Update Dependency NPM Backend
        logNpm = execSync(`cd "${repoDir}/backend" && npm install --production 2>&1`).toString();

        // 4. (Opsional) Jika Admin Web dibangun otomatis:
        // logBuild = execSync(`cd "${repoDir}/admin" && npm install && npm run build && cp -r dist/* ../backend/public/ 2>&1`).toString();

        // 5. Kirim Respon Visual Keren Persis Seperti di Laravel Bapak
        const htmlResponse = `
            <div style="background:#0f172a; color:#f8fafc; font-family:system-ui,sans-serif; min-height:100vh; padding:30px;">
                <h1 style="color:#22c55e; margin-bottom:5px;">✅ Berhasil Menarik Kodingan Baru & Update Sistem Capital Federation!</h1>
                <p style="color:#94a3b8; margin-top:0;">Dieksekusi langsung di Server Linux Toshiba MSS Panel</p>
                
                <h3 style="color:#38bdf8;">Laporan Log Eksekusi:</h3>
                <pre style="background:#1e293b; color:#4ade80; padding:20px; border-radius:10px; overflow-x:auto; font-family:Consolas,monospace; font-size:13px; line-height:1.6; border:1px solid #334155;">
[GIT FETCH & RESET HARD]
${logGit.trim()}

[NPM INSTALL PRODUCTION]
${logNpm.trim()}
${logBuild ? `\n[BUILD ADMIN WEB]\n${logBuild.trim()}\n` : ''}
[AUTO RESTART DOCKER]
Container akan reboot dalam 2 detik untuk memuat kodingan baru ke memory...
                </pre>
            </div>
        `;

        res.send(htmlResponse);

        // 6. Mantra Restart Otomatis Node.js (Docker akan otomatis menghidupkannya lagi!)
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

module.exports = router;
