# PANDUAN HOSTING CAPITAL FEDERATION v1.4.0-CFX (NODE.JS + DOCKER + FLUTTER) DI MSS SERVER

Panduan ini disesuaikan khusus untuk server Linux Toshiba MSS Panel agar proyek **capital_federation (v1.4.0-CFX)** berjalan otomatis di dalam Docker, menyajikan Web Admin & API sekaligus, serta **menjamin 100% akun pemain, saldo, PT, dan portofolio saham TIDAK AKAN PERNAH HILANG atau ter-reset** saat ada update website, APK, maupun backend.

---

## 0. Route Auto-Deploy (`backend/src/deployRoute.js`)

File `backend/src/deployRoute.js` telah dipasang **sejajar dengan `db.js`, `seed.js`, dan `server.js`** (serta tetap kompatibel melalui `backend/src/routes/deployRoute.js`) dan diaktifkan di `backend/src/server.js`:

```javascript
const deployRoute = require('./deployRoute');
app.use('/', deployRoute);
```

Setiap kali Bapak selesai melakukan `git push origin main` dari laptop/PC, Bapak cukup buka browser dan akses URL:
👉 `https://capitalfederation.xie.my.id/updatecapital?key=19122004`

**Jaminan Keamanan Data Pemain Saat Update:**
1. File database `backend/data/capital_federation.db` dikecualikan di `.gitignore` dan dipasang pada **Docker Persistent Volume (`./backend/data:/app/data`)**.
2. Saat `/updatecapital?key=19122004` atau `docker compose up -d --build` dijalankan, hanya kode program & tampilan Web Admin yang diperbarui—**seluruh akun pemain, kas pribadi, kas PT, saham, akta P2P, dan histori transaksi tetap utuh 100% tanpa mengulang dari awal**.
3. `seed.js` hanya berjalan otomatis **1 kali saja** saat server pertama kali diinstal (ketika tabel `companies` masih 0). Setelah ada data, `seed.js` tidak akan pernah menimpa data lagi.

---

## 1. Spesifikasi Lingkungan Server
* **Versi Rilis:** `v1.4.0-CFX Production (Build 4)`
* **Direktori Penampung Host:** `/var/www/capital_federation`
* **Docker Network Panel:** `mss-server-panel_mss-network`
* **Database Container:** `mss-db` (MariaDB/MySQL) & Persistent Volume `./backend/data` (`capital_federation.db`)
* **Port Layanan Backend & Web Admin:** `5000` (di-mapping ke `https://capitalfederation.xie.my.id`)

---

## 2. LANGKAH-LANGKAH DEPLOYMENT DI SERVER LINUX

### LANGKAH 1: Masuk ke Server Linux & Clone Proyek
Buka Command Prompt / Terminal, lalu login SSH ke server:
```bash
ssh mss@192.168.1.100
```
Masuk ke direktori `/var/www/` dan clone repositori GitHub Bapak:
```bash
cd /var/www
git clone https://github.com/Afiqq19/capital_federation.git
cd capital_federation
```
*(Catatan: Jika folder `/var/www/capital_federation` sudah pernah di-clone sebelumnya, cukup jalankan `cd /var/www/capital_federation && git pull origin main`).*

---

### LANGKAH 2: Cek File `backend/Dockerfile` & `docker-compose.yml` (Sudah Siap di Repo!)
File `backend/Dockerfile`, `docker-compose.yml`, serta hasil build Web Admin (`backend/public/`) **sudah kami buatkan dan sertakan langsung di dalam repositori GitHub Bapak**, sehingga Bapak **tidak perlu** mengetik manual dengan `nano` lagi!

Berikut isi `docker-compose.yml` yang sudah aktif di repo Bapak (dilengkapi pelindung database `volumes:`):
```yaml
version: '3.8'

services:
  capital_federation_backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: capitalfederation_backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - NODE_ENV=production
      - DEPLOY_SECRET=19122004
      - DB_HOST=mss-db
      - DB_PORT=3306
      - DB_DATABASE=db_capitalfederation
      - DB_USERNAME=root
      - DB_PASSWORD=root_secret_pass
    volumes:
      - ./backend/data:/app/data
      - ./backend/src:/app/src
      - ./backend/public:/app/public
      - ./:/var/www/capital_federation
    networks:
      - mss-network

networks:
  mss-network:
    external: true
    name: mss-server-panel_mss-network
```

---

### LANGKAH 3: Jalankan Container Docker
Di dalam direktori `/var/www/capital_federation/` di server Linux, langsung jalankan:
```bash
sudo docker compose up -d --build
```
Periksa status container:
```bash
sudo docker ps
```
Container `capitalfederation_backend` akan berstatus `Up` di port `0.0.0.0:5000->5000/tcp`.

---

### LANGKAH 4: Hubungkan ke Domain Publik (Cloudflare Tunnel)
Agar Backend dan Web Admin bisa diakses dari HP atau luar jaringan melalui `https://capitalfederation.xie.my.id`:
1. Buka dashboard **Cloudflare Zero Trust** -> **Networks / Access** -> **Tunnels**.
2. Pilih Tunnel server Bapak, klik **Configure** -> tab **Public Hostnames**.
3. Klik **Add a public hostname**:
   * **Subdomain:** `capitalfederation`
   * **Domain:** `xie.my.id`
   * **Type:** `HTTP`
   * **URL:** `192.168.1.100:5000` (atau `localhost:5000`)
4. Klik **Save hostname**.
5. Sekarang:
   * **Web Admin Console** langsung dapat dibuka di: `https://capitalfederation.xie.my.id` (Login: `admin` / `admin123`)
   * **Cek Versi Server Live:** `https://capitalfederation.xie.my.id/api/version`
   * **Link Auto-Update Server:** `https://capitalfederation.xie.my.id/updatecapital?key=19122004`

---

### LANGKAH 5: Kompilasi Rilis APK Mobile (`v1.4.0-CFX`)
File `mobile/lib/services/api_service.dart` sudah diarahkan ke `https://capitalfederation.xie.my.id` dengan versi `1.4.0+4` (`v1.4.0-CFX Production`).
Untuk mem-build file APK rilis siap sebar ke pemain:
```bash
cd mobile
flutter build apk --release
```
File APK hasil build berada di `mobile/build/app/outputs/flutter-apk/app-release.apk`.
