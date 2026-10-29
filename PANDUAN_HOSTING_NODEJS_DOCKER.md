# PANDUAN HOSTING CAPITAL FEDERATION (NODE.JS + DOCKER + FLUTTER) DI MSS SERVER

Panduan ini disesuaikan khusus untuk server Linux Toshiba MSS Panel agar proyek **capital_federation** berjalan otomatis di dalam Docker, tersambung ke database MariaDB panel, dan bisa diakses oleh Web Admin serta aplikasi Flutter di HP secara legal, aman, dan berkinerja tinggi.

---

## 0. Route Auto-Deploy (`backend/src/routes/deployRoute.js`)

File `backend/src/routes/deployRoute.js` telah dipasang dan diaktifkan di `backend/src/server.js`:

```javascript
const deployRoute = require('./routes/deployRoute');
app.use('/', deployRoute);
```

Bapak cukup buka browser dan akses URL:
👉 `https://capitalfederation.xie.my.id/updatecapital?key=19122004`

---

## 1. Spesifikasi Lingkungan Server
* **Direktori Penampung Host:** `/var/www/capital_federation`
* **Docker Network Panel:** `mss-server-panel_mss-network`
* **Database Container:** `mss-db` (MariaDB/MySQL)
* **Kredensial Database Internal:**
  * Host: `mss-db`
  * Port: `3306`
  * Username: `root`
  * Password: `root_secret_pass`
  * Database Name: `db_capitalfederation` (dibuat di MSS Panel)
* **Port Layanan Backend Node.js:** `5000` (atau port pilihan lainnya)

---

## 2. LANGKAH-LANGKAH DEPLOYMENT

### LANGKAH 1: Buat Database di MSS Panel
1. Buka browser: [https://panel.xie.my.id](https://panel.xie.my.id)
2. Masuk ke menu **Database Manager** di sebelah kiri.
3. Di tab *Visual Explorer*, klik tombol **(+)**.
4. Masukkan nama database: `db_capitalfederation`.
5. Pilih mesin database: `mss-db`. Klik Simpan.

---

### LANGKAH 2: Masuk ke Server & Clone Proyek
Buka Command Prompt di Windows, lalu login SSH ke server:
```bash
ssh mss@192.168.1.100
```
Masuk ke direktori web `/var/www/` dan clone repositori:
```bash
cd /var/www
git clone https://github.com/Afiqq19/capital_federation.git
cd capital_federation
```
*(Atau sesuaikan URL repo git Anda).*

---

### LANGKAH 3: Siapkan Dockerfile untuk Backend Node.js
Di dalam folder backend (`/var/www/capital_federation/backend/`), buat file `Dockerfile`:
```bash
nano backend/Dockerfile
```
Isi dengan konfigurasi berikut:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies terlebih dahulu (optimasi cache layer Docker)
COPY package*.json ./
RUN npm install --production

# Salin source code backend
COPY . .

# Expose port backend
EXPOSE 5000

# Jalankan server
CMD ["node", "src/server.js"]
```
*(Simpan: Tekan `CTRL+O`, `ENTER`, lalu `CTRL+X`)*

---

### LANGKAH 4: Siapkan docker-compose.yml
Di root proyek (`/var/www/capital_federation/`), buat file `docker-compose.yml`:
```bash
nano docker-compose.yml
```
Isi dengan konfigurasi berikut:
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
      - DB_HOST=mss-db
      - DB_PORT=3306
      - DB_DATABASE=db_capitalfederation
      - DB_USERNAME=root
      - DB_PASSWORD=root_secret_pass
    networks:
      - mss-network

networks:
  mss-network:
    external: true
    name: mss-server-panel_mss-network
```
*(Simpan: Tekan `CTRL+O`, `ENTER`, lalu `CTRL+X`)*

> **PENTING:** Dengan menyetel `name: mss-server-panel_mss-network`, container Node.js otomatis berada di jaringan yang sama dengan `mss-db`, sehingga dapat memanggil hostname `mss-db:3306` langsung tanpa setting manual.

---

### LANGKAH 5: Konfigurasi File .env Backend
Di folder `/var/www/capital_federation/backend/`, sesuaikan file `.env`:
```env
PORT=5000
NODE_ENV=production

# Database Connection ke MariaDB MSS Panel
DB_HOST=mss-db
DB_PORT=3306
DB_DATABASE=db_capitalfederation
DB_USERNAME=root
DB_PASSWORD=root_secret_pass
```

---

### LANGKAH 6: Sajikan Web Admin (NPM/React/Vite)
Agar Web Admin dapat diakses bersamaan dengan backend tanpa menambah port/container baru:
1. Di komputer lokal, jalankan build pada folder admin:
   ```bash
   cd admin
   npm run build
   ```
2. Salin isi folder hasil build (`dist/` atau `build/`) ke dalam folder `backend/public/` di server.
3. Di file `backend/src/server.js`, pastikan middleware static files Express aktif:
   ```javascript
   const express = require('express');
   const path = require('path');
   const app = express();

   // Sajikan web admin statis
   app.use(express.static(path.join(__dirname, '../public')));

   // Rute API Anda
   // app.use('/api', apiRoutes);

   // Fallback untuk SPA React (Vite)
   app.get('*', (req, res) => {
       res.sendFile(path.join(__dirname, '../public/index.html'));
   });
   ```

---

### LANGKAH 7: Jalankan Container Docker
Jalankan perintah ini di direktori `/var/www/capital_federation/`:
```bash
sudo docker compose up -d --build
```
Periksa status container:
```bash
docker ps
```
Container `capitalfederation_backend` akan berstatus `Up` di port `0.0.0.0:5000->5000/tcp`.

---

### LANGKAH 8: Hubungkan ke Domain Publik (Cloudflare Tunnel)
Agar backend dan web admin bisa diakses dari HP atau luar jaringan:
1. Buka dashboard **Cloudflare Zero Trust** -> **Access** -> **Tunnels**.
2. Pilih Tunnel server Anda, klik **Configure** -> tab **Public Hostnames**.
3. Klik **Add a public hostname**:
   * **Subdomain:** `capitalfederation` (atau `api-capitalfederation`)
   * **Domain:** `xie.my.id`
   * **Type:** `HTTP`
   * **URL:** `192.168.1.100:5000`
4. Klik **Save hostname**.
5. Sekarang web dan API Anda aktif secara publik di: `https://capitalfederation.xie.my.id`.

---

### LANGKAH 9: Integrasi ke Aplikasi Mobile (Flutter APK)
Di proyek Flutter Anda (file konfigurasi endpoint / service API):
```dart
class ApiConfig {
  // Gunakan domain Cloudflare Tunnel publik agar bisa diakses via kuota seluler / WiFi luar
  static const String baseUrl = 'https://capitalfederation.xie.my.id';
}
```
Lakukan kompilasi rilis APK:
```bash
flutter build apk --release
```
File APK siap didistribusikan ke perangkat Android dan langsung terhubung secara live ke server Linux Toshiba.
