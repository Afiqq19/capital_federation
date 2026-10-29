import { useState } from 'react';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import {
  Scale,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Gavel,
  Landmark,
  FileText,
  Lock,
  Eye,
  CheckCircle2,
  BookOpen,
  Coins,
  Building2,
  Sparkles,
} from 'lucide-react';

const CONSTITUTION_ARTICLES = [
  {
    article: 'Pasal 1',
    title: 'Kedaulatan Saham & Akuisisi Pengendali (M&A 51%)',
    summary: 'Kepemilikan saham di atas 50% (+1 lembar atau 51%) memberikan hak pengendalian mutlak atas emiten.',
    details: [
      'Setiap konglomerat yang berhasil menguasai 51% porsi saham berhak atas status Pemegang Saham Pengendali (PSP).',
      'Porsi saham pendiri awal (founder) didilusi secara proporsional sesuai ketentuan notariat (contoh: 70% didilusi 51% menyisakan 19%).',
      'Pengendali berhak menentukan arah bisnis, fundamental bot, dan menerima porsi dividen mayoritas.',
    ],
    tone: 'emerald',
    icon: Building2,
  },
  {
    article: 'Pasal 2',
    title: 'Batas Volatilitas Harian Simetris (ARA +35% & ARB -35%)',
    summary: 'Pergerakan harga saham dibatasi sirkuit pemutus simetris untuk menjaga stabilitas pasar modal.',
    details: [
      'Batas Auto Rejection Atas (ARA) dipatok maksimal +35.00% dari harga penutupan hari sebelumnya.',
      'Batas Auto Rejection Bawah (ARB) dipatok maksimal -35.00% dari harga penutupan hari sebelumnya.',
      'Order beli di atas ARA atau order jual di bawah ARB akan ditolak otomatis oleh sistem bursa IPMC.',
    ],
    tone: 'amber',
    icon: Scale,
  },
  {
    article: 'Pasal 3',
    title: 'Pengawasan Pasar & Radar UMA (Unusual Market Activity)',
    summary: 'Penandaan resmi terhadap pergerakan harga atau volume saham di luar kebiasaan wajar.',
    details: [
      'Status UMA bukan merupakan sanksi suspensi, melainkan peringatan transparansi bagi para investor.',
      'Perdagangan saham berstatus UMA tetap berlangsung normal di pasar reguler maupun pasar negosiasi.',
      'Emiten wajib memberikan konfirmasi atas volatilitas transaksi bila diminta oleh Otoritas Pengawas Bursa.',
    ],
    tone: 'amber',
    icon: AlertTriangle,
  },
  {
    article: 'Pasal 4',
    title: 'Suspensi Perdagangan (Trading Halt)',
    summary: 'Tindakan intervensi tertinggi berupa penghentian sementara seluruh aktivitas perdagangan saham.',
    details: [
      'Suspensi dijatuhkan apabila terindikasi insider trading, manipulasi pasar terstruktur, atau kepailitan korporasi.',
      'Selama suspensi berlangsung, tidak ada order beli atau jual yang dapat dieksekusi di bursa.',
      'Pencabutan suspensi hanya dapat dilakukan setelah masa penetapan berakhir atau melalui ketetapan resmi Otoritas.',
    ],
    tone: 'rose',
    icon: Lock,
  },
  {
    article: 'Pasal 5',
    title: 'Pajak Bursa & Bea Meterai Sah Digital',
    summary: 'Kewajiban kontribusi fiskal dari setiap transaksi saham untuk ketahanan kas negara federasi.',
    details: [
      'Setiap eksekusi penjualan saham dikenakan Pajak Transaksi Bursa sebesar 0.10% yang langsung disetor ke Brankas Kas Negara.',
      'Setiap akta notaris peralihan blok saham atau M&A wajib dilekatkan Bea Meterai Digital lunas senilai IB 10.000.',
      'Penerimaan bea meterai dan pajak dialokasikan ke cadangan devisa likuid negara untuk stabilitas ekonomi.',
    ],
    tone: 'sky',
    icon: Coins,
  },
  {
    article: 'Pasal 6',
    title: 'Kepailitan & Eksekusi Sita Jaminan PNAF',
    summary: 'Kewenangan yudisial Pengadilan Niaga Arbitrase Federasi atas debitur wanprestasi dan emiten bermasalah.',
    details: [
      'Bank Sentral Indigo Federasi (BIF) dapat mengajukan permohonan sita terhadap debitur yang berstatus kredit macet (NPL).',
      'PNAF berhak membekukan dan mengeksekusi sita jaminan atas seluruh perseroan atau portofolio debitur.',
      'Perseroan yang disita beralih ke bawah pengawasan kurator negara demi mengamankan kepentingan publik.',
    ],
    tone: 'violet',
    icon: Gavel,
  },
  {
    article: 'Pasal 7',
    title: 'Restriksi Dividen Perseroan Sitaan',
    summary: 'Pembekuan hak penerimaan dividen bagi emiten yang berstatus sitaan negara.',
    details: [
      'Emiten yang berada dalam status sita Pengadilan Niaga dilarang mengalirkan dividen ke pemegang saham lama.',
      'Aliran dividen ditampung di brankas penampungan negara dan dibekukan sampai kewajiban diselesaikan.',
      'Pemegang saham tidak dapat menarik modal perseroan selama sanksi sitaan belum dicabut.',
    ],
    tone: 'rose',
    icon: Shield,
  },
  {
    article: 'Pasal 8',
    title: 'Pemulihan Sita & Pelunasan Tripartit',
    summary: 'Syarat mutlak penebusan kembali perseroan yang disita oleh otoritas negara.',
    details: [
      'Debitur wajib melunasi seluruh utang pokok fasilitas pinjaman Bank Sentral Federasi (BIF).',
      'Debitur wajib melunasi akumulasi bunga kredit yang tertunggak.',
      'Debitur wajib menyetorkan uang sanksi / denda pemulihan sita resmi ke Brankas Kas Negara Federasi.',
    ],
    tone: 'emerald',
    icon: Landmark,
  },
  {
    article: 'Pasal 9',
    title: 'Validitas Akta Notariat & Penalti Wanprestasi 20%',
    summary: 'Kekuatan hukum mengikat atas seluruh transaksi pengalihan saham non-bursa (P2P).',
    details: [
      'Setiap transaksi jual beli saham pendiri wajib diterbitkan Akta Notaris Resmi bernomor register legal.',
      'Pelanggaran kesepakatan atau pembatalan sepihak dikenakan penalti wanprestasi sebesar 20% dari nilai transaksi.',
      'Gugatan wanprestasi langsung didaftarkan ke Kepaniteraan Pengadilan Niaga Federasi.',
    ],
    tone: 'amber',
    icon: FileText,
  },
  {
    article: 'Pasal 10',
    title: 'Intervensi Likuiditas & Dana Talangan Darurat (Bailout)',
    summary: 'Kewenangan Kas Negara Federasi menyuntikkan likuiditas penyelamatan demi ketahanan sistemik.',
    details: [
      'Kas Negara Federasi dapat mengucurkan dana talangan (Bailout) kepada emiten krisis berbobot indeks besar.',
      'Surplus kas devisa negara dapat disalurkan sebagai Dividen Kemakmuran (Stimulus) langsung ke seluruh konglomerat.',
      'Injeksi likuiditas bertujuan meredam efek domino krisis makro dan menjaga optimisme bursa.',
    ],
    tone: 'emerald',
    icon: Sparkles,
  },
];

export default function LegalConstitutionPage() {
  const [activeTab, setActiveTab] = useState('CONSTITUTION');

  return (
    <div className="space-y-6 page-enter">
      {/* 1. Header Hero Banner */}
      <div className="card p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-indigo-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-300 shrink-0 border border-indigo-500/30">
              <Scale size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 font-mono">
                  LEX MERCATORIA INDIGO • KEPATUHAN SISTEM
                </span>
                <Badge tone="emerald">TERKODIFIKASI RESMI</Badge>
              </div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight mt-1">
                Konstitusi Pasar Modal & Kebijakan Kepatuhan Hukum
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Landasan hukum simulasi kedaulatan moneter, aturan 10 pasal pasar modal, kebijakan privasi data, dan deklarasi kepatuhan regulasi digital bebas perjudian.
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800 shrink-0">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-200">10 PASAL PASAR MODAL</div>
              <div className="text-[11px] text-emerald-400 font-medium">ARB -35% • M&A 51% • PNAF</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-sm">
              ✓
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab('CONSTITUTION')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'CONSTITUTION'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <BookOpen size={14} />
            10 Pasal Konstitusi Pasar Modal
          </button>

          <button
            onClick={() => setActiveTab('DISCLAIMER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'DISCLAIMER'
                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck size={14} />
            Kepatuhan Hukum & Anti-Judi Online
          </button>

          <button
            onClick={() => setActiveTab('TERMS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'TERMS'
                ? 'bg-sky-400/20 text-sky-300 border border-sky-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileText size={14} />
            Ketentuan Layanan (ToS)
          </button>

          <button
            onClick={() => setActiveTab('PRIVACY')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'PRIVACY'
                ? 'bg-violet-400/20 text-violet-300 border border-violet-400/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Lock size={14} />
            Kebijakan Privasi Data (UU PDP)
          </button>
        </div>
      </div>

      {/* 2. Tab Contents */}
      {activeTab === 'CONSTITUTION' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Scale size={16} className="text-amber-400" />
              Kitab Undang-Undang Pasar Modal Federasi Indigo (10 Pasal Lex Mercatoria)
            </h3>
            <span className="text-xs text-slate-500 font-mono">Status: Berlaku Mengikat</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CONSTITUTION_ARTICLES.map((art) => {
              const Icon = art.icon;
              return (
                <Card key={art.article} className="hover:border-slate-700 transition-colors">
                  <div className="flex items-start gap-3 p-1">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-400 shrink-0">
                      <Icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-extrabold text-amber-400">
                          {art.article}
                        </span>
                        <Badge tone={art.tone}>{art.tone === 'emerald' ? 'PROGRESIF' : art.tone === 'rose' ? 'RESTRIKSI' : 'REGULASI'}</Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mt-0.5">
                        {art.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                        {art.summary}
                      </p>

                      <ul className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-2 text-[11.5px] text-slate-400">
                        {art.details.map((d, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-amber-400/80 font-bold shrink-0">•</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'DISCLAIMER' && (
        <Card className="space-y-6">
          <CardHeader
            title="Kepatuhan Regulasi Digital & Klausul Anti-Perjudian (Anti-Gambling)"
            subtitle="Kesesuaian dengan peraturan perundang-undangan digital internasional dan UU ITE"
            icon={ShieldCheck}
            tone="var(--emerald)"
          />

          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} />
                1. Pernyataan Simulasi Murni (Pure Educational Tycoon Simulation)
              </h4>
              <p>
                Platform game ini adalah perangkat lunak simulasi bisnis, strategi konglomerasi, dan edukasi mekanisme pasar modal. Seluruh entitas, instrumen, peristiwa makro, persidangan, dan transaksi di dalamnya bersifat fiksi semata dan disimulasikan secara terisolasi.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Coins size={16} />
                2. Status Mata Uang Virtual (IB & IDG) & Larangan Cash-Out
              </h4>
              <p>
                Mata uang virtual yang digunakan dalam platform ini, yaitu <strong>IB (Indigo Billion)</strong> dan <strong>IDG (Indigo Credits)</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Bukan merupakan uang kartal, bukan instrumen pembayaran sah di dunia nyata, dan bukan aset kripto berharga.</li>
                <li>Tidak memiliki nilai tukar terhadap Rupiah (IDR), Dollar Amerika (USD), atau mata uang riil mana pun.</li>
                <li><strong>DILARANG KERAS</strong> dan <strong>TIDAK MEMILIKI FITUR</strong> untuk ditarik (withdraw), diuangkan, diperjualbelikan dengan uang asli, atau ditukar dengan barang bernilai nyata.</li>
                <li>Platform ini tidak memfasilitasi taruhan, undian berhadiah uang asli, atau bentuk perjudian apa pun sesuai amanat UU ITE Pasal 27 ayat (2).</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="text-sm font-bold text-sky-300 flex items-center gap-2">
                <Landmark size={16} />
                3. Orisinalitas Lore & Ketiadaan Afiliasi Lembaga Nyata
              </h4>
              <p>
                Seluruh terminologi seperti <em>Republik Federasi Indigo</em>, <em>BUMF (Badan Usaha Milik Federasi)</em>, <em>PNAF (Pengadilan Niaga Arbitrase Federasi)</em>, <em>BIF (Bank Sentral Indigo Federasi)</em>, dan <em>IPMC</em> adalah 100% kreasi dunia fiksi orisinal. Platform ini tidak terafiliasi dengan Badan Usaha Milik Negara (BUMN) Republik Indonesia, Bursa Efek Indonesia (BEI), Otoritas Jasa Keuangan (OJK), Bank Indonesia (BI), maupun perusahaan manapun di dunia nyata.
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'TERMS' && (
        <Card className="space-y-6">
          <CardHeader
            title="Ketentuan Layanan Pemain (Terms of Service)"
            subtitle="Aturan main, integritas persaingan pasar, dan tata tertib konglomerat"
            icon={FileText}
            tone="var(--sky)"
          />

          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-100">1. Akun & Keamanan Akses</h4>
              <p className="text-slate-400">
                Setiap pemain bertanggung jawab penuh menjaga kerahasiaan kredensial akunnya. Satu pemain hanya diperkenankan mengoperasikan satu identitas konglomerat utama.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-100">2. Integritas Perdagangan & Anti-Cheat</h4>
              <p className="text-slate-400">
                Dilarang menggunakan perangkat lunak otomatis pihak ketiga (bot injector, memory hacker, memory scanner) untuk memanipulasi saldo atau harga saham. Pelanggaran berakibat pada pembekuan permanen (Banned) oleh admin.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-100">3. Kekuatan Putusan Arbitrase (PNAF)</h4>
              <p className="text-slate-400">
                Dalam hal terjadinya sengketa transaksi P2P, wanprestasi kontrak akta notaris, atau gagal bayar kredit bank sentral, keputusan Majelis Hakim Pengadilan Niaga Arbitrase Federasi (PNAF) bersifat final dan mengikat di dalam game.
              </p>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'PRIVACY' && (
        <Card className="space-y-6">
          <CardHeader
            title="Kebijakan Privasi Data Pemain (Privacy Policy)"
            subtitle="Kepatuhan terhadap standar perlindungan kerahasiaan data pribadi (UU PDP)"
            icon={Lock}
            tone="var(--violet)"
          />

          <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
            <div className="space-y-1">
              <h4 className="font-bold text-slate-100">1. Data yang Disimpan</h4>
              <p className="text-slate-400">
                Sistem hanya menyimpan data teknis yang dibutuhkan untuk keberlangsungan simulasi game: Username, alamat email terdaftar, hash kata sandi terenkripsi (BCrypt), dan riwayat log transaksi permainan.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-100">2. Ketiadaan Pengumpulan Data Finansial Riil</h4>
              <p className="text-slate-400">
                Platform tidak pernah meminta, mengumpulkan, atau menyimpan nomor kartu kredit riil, nomor rekening bank nyata, PIN perbankan, atau dokumen kependudukan sensitif milik pemain.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-slate-100">3. Hak Akses & Penghapusan Akun</h4>
              <p className="text-slate-400">
                Pemain berhak mengajukan penghapusan akun dan data historis permainannya kapan saja melalui menu pengaturan atau melalui panitera pengawas sistem.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
