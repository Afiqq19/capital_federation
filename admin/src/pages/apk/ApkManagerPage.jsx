import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone, Upload, CheckCircle2, AlertTriangle, Download, RefreshCw,
  ShieldCheck, FileArchive, ExternalLink, Sparkles, Save, HardDrive, Hash, Layers
} from 'lucide-react';
import { request } from '../../api/http';
import { useAdmin } from '../../context/AdminContext';

export default function ApkManagerPage({ showToast }) {
  const adminCtx = useAdmin();
  const toastFn = showToast || adminCtx?.notify;
  const [apkInfo, setApkInfo] = useState({
    version: '1.6.9',
    buildNumber: 23,
    fileSizeMb: '25.3 MB',
    minAndroid: 'Android 10.0 (API Level 29 / Q)',
    hasHostedApk: true,
    downloadCount: 315,
    releaseNotes: 'v1.6.9: Proteksi Permanen Kepemilikan PT Pendiri, Sinkronisasi Penuh Investasi R&D PT Utama & Anak Perusahaan, serta Akselerasi Server & Refresh Halus Latar Belakang Tanpa Kedip.'
  });
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);

  // Form metadata state
  const [version, setVersion] = useState('1.6.9');
  const [buildNumber, setBuildNumber] = useState(23);
  const [minAndroid, setMinAndroid] = useState('Android 10.0 (API 29 / Q)');
  const [externalUrl, setExternalUrl] = useState('');
  const [releaseNotesText, setReleaseNotesText] = useState('');

  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const fileInputRef = useRef(null);

  const loadApkInfo = async (silent = false) => {
    if (silent !== true) setLoading(true);
    try {
      const res = await request('/api/version');
      setApkInfo(res);
      setVersion(res.version || '1.6.9');
      setBuildNumber(res.buildNumber || 23);
      setMinAndroid(res.minAndroid || 'Android 10.0 (API 29 / Q)');
      setExternalUrl(res.externalUrl || '');
      if (Array.isArray(res.releaseNotes)) {
        setReleaseNotesText(res.releaseNotes.join('\n'));
      } else if (typeof res.releaseNotes === 'string') {
        setReleaseNotesText(res.releaseNotes);
      }
    } catch (e) {
      if (toastFn) toastFn('Gagal memuat info rilis APK: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApkInfo(false);
  }, []);

  const handleSaveMetadata = async (e) => {
    e.preventDefault();
    setSavingMeta(true);
    try {
      const notes = releaseNotesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await request('/api/admin/apk/metadata', {
        method: 'POST',
        body: {
          version: version.trim(),
          buildNumber: Number(buildNumber) || 23,
          minAndroid: minAndroid.trim(),
          externalUrl: externalUrl.trim(),
          releaseNotes: notes
        }
      });
      if (toastFn) toastFn('Metadata versi & catatan rilis APK berhasil diperbarui!', 'success');
      await loadApkInfo(true);
    } catch (err) {
      if (toastFn) toastFn('Gagal menyimpan metadata: ' + err.message, 'error');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.apk')) {
      if (toastFn) toastFn('Format file harus berekstensi .apk!', 'error');
      return;
    }
    setSelectedFile(file);
  };

  const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    const chunkSize = 0x8000;
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
    }
    return window.btoa(binary);
  };

  const handleUploadApk = async () => {
    if (!selectedFile) {
      if (toastFn) toastFn('Pilih file .apk terlebih dahulu!', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per chunk (aman melewati Cloudflare Tunnel)
    const totalChunks = Math.ceil(selectedFile.size / CHUNK_SIZE);

    try {
      const notes = releaseNotesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      for (let idx = 0; idx < totalChunks; idx++) {
        const start = idx * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, selectedFile.size);
        const blobSlice = selectedFile.slice(start, end);
        const buffer = await blobSlice.arrayBuffer();
        const chunkBase64 = arrayBufferToBase64(buffer);

        setUploadStatusText(`Mengunggah paket bagian ${idx + 1} dari ${totalChunks} (${((end / 1024 / 1024)).toFixed(1)} MB / ${(selectedFile.size / 1024 / 1024).toFixed(1)} MB)...`);

        await request('/api/admin/apk/upload-chunk', {
          method: 'POST',
          body: {
            chunkIndex: idx,
            totalChunks,
            chunkBase64,
            version: version.trim(),
            buildNumber: Number(buildNumber) || 5,
            minAndroid: minAndroid.trim(),
            releaseNotes: idx === totalChunks - 1 ? notes : undefined
          }
        });

        setUploadProgress(Math.round(((idx + 1) / totalChunks) * 100));
      }

      setUploadStatusText('Verifikasi SHA-256 & publikasi APK selesai!');
      if (toastFn) {
        toastFn(`File APK v${version} (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB) berhasil diunggah & dipublikasikan!`, 'success');
      }
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadApkInfo();
    } catch (err) {
      if (toastFn) toastFn('Gagal mengunggah APK: ' + err.message, 'error');
      setUploadStatusText('Gagal: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Status Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: 16,
        padding: 22,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14,
            background: 'rgba(16, 185, 129, 0.2)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#10b981'
          }}>
            <Smartphone size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>
                Distribusi APK Resmi & Portal Download Publik
              </span>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: apkInfo?.hasHostedApk ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: apkInfo?.hasHostedApk ? '#34d399' : '#fbbf24',
                border: `1px solid ${apkInfo?.hasHostedApk ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`
              }}>
                {apkInfo?.hasHostedApk ? 'FILE APK TERSEDIA DI SERVER' : 'BELUM ADA FILE FISIK DI SERVER'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              Setiap kali Anda mengunggah APK baru atau menaikkan nomor versi di sini, halaman depan{' '}
              <strong style={{ color: '#e2e8f0' }}>capitalfederation.xie.my.id</strong> dan detektor pembaruan di menu{' '}
              <strong style={{ color: '#38bdf8' }}>Profil Aplikasi Mobile</strong> otomatis tersinkronisasi.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a
            href="/?preview=public"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10,
              background: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              color: '#e2e8f0', textDecoration: 'none', fontSize: 13, fontWeight: 600
            }}
          >
            <ExternalLink size={15} /> Lihat Website Download Publik
          </a>
          <a
            href="/api/download/apk"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#022c22', textDecoration: 'none', fontSize: 13, fontWeight: 800
            }}
          >
            <Download size={15} /> Tes Unduh APK Sekarang
          </a>
        </div>
      </div>

      {/* KPI Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: 14
      }}>
        <div style={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.14)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>VERSI RILIS AKTIF</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
            v{apkInfo?.version || '1.5.0'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Build #{apkInfo?.buildNumber || 5} • Production Release
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.14)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>UKURAN FILE APK SERVER</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>
            {apkInfo?.fileSizeMb ? (String(apkInfo.fileSizeMb).includes('MB') ? apkInfo.fileSizeMb : `${apkInfo.fileSizeMb} MB`) : '24.8 MB'}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            {apkInfo?.hasHostedApk ? 'Tersimpan permanen di /app/data/releases' : 'Menunggu upload APK'}
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.14)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>TOTAL UNDUHAN PEMAIN</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>
            {(apkInfo?.downloadCount || 0).toLocaleString('id-ID')}x
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            Diunduh dari Website Resmi
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.14)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>SYARAT SERTIFIKASI OS</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', marginTop: 4 }}>
            {apkInfo?.minAndroid || 'Android 10.0 (API 29)'}
          </div>
          <div style={{ fontSize: 12, color: '#10b981', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
            <ShieldCheck size={14} /> ARM64 Signed Release APK
          </div>
        </div>
      </div>

      {/* Main Two Columns: Upload APK Binary + Metadata Editor */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20
      }}>
        {/* Left Card: Upload File APK Baru */}
        <div style={{
          background: '#0f172a',
          border: '1px solid rgba(148, 163, 184, 0.16)',
          borderRadius: 16,
          padding: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Upload size={20} color="#10b981" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
              1. Upload File Binary APK Terbaru (.apk)
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
            Pilih file hasil build Flutter (<code style={{ color: '#38bdf8' }}>app-release.apk</code>) dari komputer Anda. Sistem akan mengunggahnya secara bertahap (Chunked 2 MB) agar aman menembus Cloudflare Tunnel dan menyimpannya di volume permanen server.
          </p>

          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            style={{
              border: '2px dashed rgba(16, 185, 129, 0.4)',
              background: selectedFile ? 'rgba(16, 185, 129, 0.08)' : 'rgba(15, 23, 42, 0.6)',
              borderRadius: 14,
              padding: '28px 20px',
              textAlign: 'center',
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <FileArchive size={36} color={selectedFile ? '#10b981' : '#64748b'} style={{ marginBottom: 10 }} />
            {selectedFile ? (
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginBottom: 4 }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Ukuran: <strong>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</strong> • Klik untuk ganti file
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
                  Klik di sini untuk memilih file <span style={{ color: '#10b981' }}>app-release.apk</span>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Mendukung file APK hingga 150 MB (Otomatis Chunk Upload)
                </div>
              </div>
            )}
          </div>

          {uploading && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 12,
              padding: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#e2e8f0', marginBottom: 8 }}>
                <span>{uploadStatusText}</span>
                <strong style={{ color: '#38bdf8' }}>{uploadProgress}%</strong>
              </div>
              <div style={{ width: '100%', height: 8, background: '#1e293b', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #38bdf8)',
                  transition: 'width 0.25s ease'
                }} />
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedFile || uploading}
            onClick={handleUploadApk}
            style={{
              padding: '13px 20px',
              borderRadius: 12,
              border: 'none',
              background: !selectedFile || uploading
                ? 'rgba(51, 65, 85, 0.6)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: !selectedFile || uploading ? '#64748b' : '#022c22',
              fontWeight: 800,
              fontSize: 14,
              cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Upload size={17} />
            {uploading ? `Mengunggah APK (${uploadProgress}%)...` : `Unggah & Publikasikan APK v${version}`}
          </button>

          {apkInfo?.sha256 && (
            <div style={{
              background: 'rgba(2, 6, 23, 0.65)',
              border: '1px solid rgba(148, 163, 184, 0.12)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 11,
              color: '#94a3b8'
            }}>
              <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Hash size={12} color="#10b981" /> Checksum SHA-256 File Aktif:
              </div>
              <code style={{ wordBreak: 'break-all', color: '#38bdf8', fontSize: 11 }}>
                {apkInfo.sha256}
              </code>
            </div>
          )}
        </div>

        {/* Right Card: Pengaturan Versi & Catatan Rilis */}
        <form
          onSubmit={handleSaveMetadata}
          style={{
            background: '#0f172a',
            border: '1px solid rgba(148, 163, 184, 0.16)',
            borderRadius: 16,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={20} color="#38bdf8" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc' }}>
              2. Konfigurasi Versi, Sertifikasi OS & Catatan Rilis
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
                Versi Aplikasi (Contoh: 1.5.0)
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: '#020617', border: '1px solid rgba(148,163,184,0.25)',
                  color: '#f8fafc', fontSize: 14, fontFamily: 'JetBrains Mono, monospace'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
                Nomor Build (Contoh: 5)
              </label>
              <input
                type="number"
                min="1"
                value={buildNumber}
                onChange={(e) => setBuildNumber(e.target.value)}
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  background: '#020617', border: '1px solid rgba(148,163,184,0.25)',
                  color: '#f8fafc', fontSize: 14, fontFamily: 'JetBrains Mono, monospace'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
              Sertifikasi Spesifikasi Minimum Android
            </label>
            <input
              type="text"
              value={minAndroid}
              onChange={(e) => setMinAndroid(e.target.value)}
              placeholder="Android 10.0 (API 29 / Q)"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: '#020617', border: '1px solid rgba(148,163,184,0.25)',
                color: '#f8fafc', fontSize: 13
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
              Link Mirror Eksternal (Opsional - kosongkan jika memakai server ini)
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="Kosongkan agar mengunduh langsung dari /api/download/apk"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: '#020617', border: '1px solid rgba(148,163,184,0.25)',
                color: '#f8fafc', fontSize: 13
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
              Catatan Pembaruan / Release Notes (1 baris per poin)
            </label>
            <textarea
              rows={5}
              value={releaseNotesText}
              onChange={(e) => setReleaseNotesText(e.target.value)}
              placeholder="Masukkan daftar fitur baru..."
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                background: '#020617', border: '1px solid rgba(148,163,184,0.25)',
                color: '#f8fafc', fontSize: 13, lineHeight: 1.5, resize: 'vertical'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={savingMeta}
            style={{
              marginTop: 'auto',
              padding: '12px 18px',
              borderRadius: 12,
              border: '1px solid rgba(56, 189, 248, 0.4)',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              cursor: savingMeta ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Save size={16} />
            {savingMeta ? 'Menyimpan...' : 'Simpan Metadata & Catatan Rilis'}
          </button>
        </form>
      </div>
    </div>
  );
}
