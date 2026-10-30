import {
  Activity,
  Zap,
  AlertTriangle,
  Ban,
  Landmark,
  Building2,
  Users,
  FileText,
  Sliders,
  Gavel,
  Shield,
  Coins,
  Flame,
  Award,
  Smartphone,
} from 'lucide-react';

/**
 * Peta menu sidebar. Satu entri = satu halaman (folder pages/<id>).
 * accent  → warna aksen menu (CSS color)
 */
export const NAV_GROUPS = [
  {
    label: 'Monitoring',
    items: [
      { id: 'dashboard', label: 'Ikhtisar Pasar', title: 'Ikhtisar Moneter & Pasar', subtitle: 'Ringkasan kondisi bursa, bank sentral, dan konglomerat', icon: Activity, accent: '#f5b942' },
      { id: 'macro', label: 'Krisis Makro & Berita', title: 'Krisis Makro & Siaran Berita', subtitle: 'Picu guncangan ekonomi & siarkan berita ke seluruh pemain', icon: Zap, accent: '#fbbf24' },
      { id: 'apk', label: 'Setting APK & Download', title: 'Pengaturan APK & Portal Download', subtitle: 'Upload file APK terbaru, atur versi update otomatis & pantau unduhan pemain', icon: Smartphone, accent: '#10b981' },
    ],
  },
  {
    label: 'Pengawasan Bursa',
    items: [
      { id: 'uma', label: 'Peringatan UMA', title: 'Peringatan UMA', subtitle: 'Penandaan pergerakan tidak wajar — perdagangan tetap berjalan', icon: AlertTriangle, accent: '#fbbf24', badgeKey: 'uma' },
      { id: 'suspension', label: 'Suspensi Saham', title: 'Suspensi Saham', subtitle: 'Hentikan perdagangan saham sampai tanggal yang ditentukan', icon: Ban, accent: '#fb7185', badgeKey: 'suspension' },
    ],
  },
  {
    label: 'Lembaga Moneter & Fiskal',
    items: [
      { id: 'bank', label: 'Bank Sentral BIF', title: 'Bank Sentral Indigo Federasi (BIF)', subtitle: 'Suku bunga acuan, likuiditas, dan pengawasan debitur', icon: Landmark, accent: '#34d399', badgeKey: 'rate' },
      { id: 'treasury', label: 'Kas Negara (Vault)', title: 'Brankas Kas Negara Federasi', subtitle: 'Penerimaan PNBP, pajak transaksi, sita lelang & dana talangan', icon: Landmark, accent: '#10b981' },
      { id: 'bonds', label: 'Obligasi Negara (SBN)', title: 'Surat Utang Negara & Obligasi (ORI & SBR)', subtitle: 'Penerbitan kuota obligasi & pembayaran kupon pasif', icon: Coins, accent: '#f59e0b' },
      { id: 'subsidies', label: 'Subsidi & Tax Holiday', title: 'Insentif Fiskal & Subsidi Sektoral', subtitle: 'Diskon tarif PPh Badan dan bantuan operasional industri', icon: Flame, accent: '#34d399' },
      { id: 'court', label: 'Pengadilan Niaga (PNAF)', title: 'Pengadilan Niaga & Arbitrase Federasi (PNAF)', subtitle: 'Sidang kepailitan, eksekusi sita jaminan, dan sengketa saham', icon: Gavel, accent: '#eab308' },
    ],
  },
  {
    label: 'Korporasi & Pengadaan',
    items: [
      { id: 'tenders', label: 'Tender Mega-Proyek', title: 'Tender Pengadaan Proyek Pemerintah', subtitle: 'Lelang mega-proyek nasional dan penetapan pemenang kontrak', icon: Award, accent: '#38bdf8' },
      { id: 'companies', label: 'Direktori Emiten', title: 'Direktori Emiten & BUMF', subtitle: 'Struktur kepemilikan dan status pengawasan setiap emiten', icon: Building2, accent: '#38bdf8', badgeKey: 'companies' },
      { id: 'deeds', label: 'Brankas Akta Notaris', title: 'Brankas Akta & Kontrak P2P', subtitle: 'Arsip akta jual beli saham notariil, meterai digital & klausul wanprestasi', icon: FileText, accent: '#f59e0b' },
      { id: 'users', label: 'Konglomerat Pemain', title: 'Konglomerat & Aset Pemain', subtitle: 'Inspeksi kekayaan, perusahaan, portofolio, dan hutang pemain', icon: Users, accent: '#a78bfa', badgeKey: 'users' },
    ],
  },
  {
    label: 'Kepatuhan & Hukum',
    items: [
      { id: 'legal', label: 'Konstitusi & Regulasi', title: 'Kitab UU & Konstitusi Game', subtitle: '10 Pasal Lex Mercatoria, Disclaimer Hukum & Kebijakan Privasi', icon: Shield, accent: '#38bdf8' },
      { id: 'logs', label: 'Audit Transaksi', title: 'Audit Trail Transaksi', subtitle: 'Seluruh aktivitas bursa terekam permanen', icon: FileText, accent: '#94a3b8' },
      { id: 'settings', label: 'Parameter Moneter', title: 'Regulasi Moneter & Syarat IPO', subtitle: 'Atur ambang IPO, inflasi, dan intervensi bot', icon: Sliders, accent: '#94a3b8' },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
export const DEFAULT_PAGE = 'dashboard';
