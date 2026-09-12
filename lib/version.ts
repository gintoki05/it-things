export interface VersionRelease {
  version: string
  date: string
  codename?: string
  changes: string[]
}

export const APP_VERSION = "v2.3.14"
export const APP_BUILD = "2026.09.12"
export const APP_NAME = "IT-THINGS 98"
export const APP_EDITION = "Second Edition (SE)"

export const APP_CHANGELOG: VersionRelease[] = [
  {
    version: "v2.3.14",
    date: "12 Sep 2026",
    codename: "Chat Live Links, Quick Copy, Anti-Prank Video Title & Winamp Auto-Detect",
    changes: [
      "Auto-Detect & Clickable Live Links: Setiap tautan URL http/https di obrolan chat otomatis aktif sebagai link yang dapat diklik langsung dengan pemisahan tanda baca rapi.",
      "Tombol Salin Link 1-Klik: Ditambahkan tombol retro mini [Salin] di samping tautan dengan indikator feedback [Tersalin!] selama 2 detik.",
      "Kartu Pratinjau Judul Video YouTube (Anti-Prank / Anti-Rickroll): Menampilkan card judul resmi dan nama kanal YouTube pada setiap link obrolan sebelum dibuka atau diputar.",
      "Tombol Putar Cepat di Winamp: Akses 1-klik [▶ Putar di Winamp] langsung dari balon chat yang otomatis memasukkan lagu ke playlist dan membuka jendela WINAMP.EXE.",
      "Auto-Resolve & Metadata Cache Winamp: Deteksi otomatis judul video saat paste link ke form Winamp, sinkronisasi judul asli pada pesan 'Share ke Chat', serta client-side caching.",
    ],
  },
  {
    version: "v2.3.13",
    date: "12 Sep 2026",
    codename: "Welcome 98 What's New Hub & Start Pointer Balloon",
    changes: [
      "Peluncuran modul Welcome 98 (welcome98.exe) untuk pengumuman otomatis pembaruan sistem dan highlight fitur baru.",
      "Showcase 4 fitur utama: Winamp 2.91 & CRT, Game Center 98, Status Online Tim, dan Properti Wallpaper dengan tombol peluncur langsung.",
      "Balon Petunjuk Retro Windows 98 yang menunjuk ke tombol Start di taskbar dengan animasi pulse amber saat pengumuman selesai dibaca.",
      "Integrasi menu What's New pada Start Menu, menu klik kanan desktop (Context Menu), dan dialog winver.exe.",
      "Sanitasi event keyboard: isolasi tombol Escape khusus dialog tanpa mencegat Enter pada form login dan input teks.",
    ],
  },
  {
    version: "v2.3.12",
    date: "12 Sep 2026",
    codename: "Winamp 2.91 Media Player with CRT Video Display & 2-Way Sync",
    changes: [
      "Peluncuran aplikasi pemutar media retro Winamp 2.91 (winamp.exe) dengan green LCD marquee, spectrum equalizer, volume control, dan drawer playlist.",
      "Layar CRT Video Display (AVS) dengan 4 filter retro: CRT 90s scanlines, VHS Tape OSD, Matrix Green Terminal, dan Normal.",
      "Input Cepat & Standby Terminal Langsung di Layar CRT: Memungkinkan paste link YouTube langsung di tengah monitor tanpa perlu scroll.",
      "Sinkronisasi 2-Arah via YouTube IFrame API: Slider volume Winamp mengontrol volume YouTube real-time, serta aksi pause/play langsung di video tersinkronisasi otomatis ke Winamp.",
      "Spektrum Equalizer Reaktif: Animasi bar spektrum yang merespons volume suara dan langsung rata saat di-pause atau di-mute.",
      "Dialog Konfirmasi Hapus Retro: Menggunakan standar ConfirmDialog (HAPUS_LAGU.EXE dan KOSONGKAN_PLAYLIST.EXE) dengan RetroActionButton.",
      "Integrasi Shortcut Desktop & Taskbar Ticker: Shortcut Winamp dan Wordle di desktop serta running track ticker di taskbar.",
    ],
  },
  {
    version: "v2.3.11",
    date: "12 Sep 2026",
    codename: "Server-Side Anti-Cheat, Team Privacy & In-Flight Request Deduplication",
    changes: [
      "Arsitektur Anti-Cheat Server-Side Wordle 98: Memindahkan 200+ bank kata dan kalkulasi harian ke server-only module, serta validasi tebakan via route handlers (/api/wordle/today & /api/wordle/guess).",
      "Sanitasi Papan Skor Wordle: Implementasi PostgreSQL view public.wordle_leaderboard di Supabase untuk mengisolasi riwayat tebakan (guesses) pemain lain dari network response.",
      "Team Member Privacy & Email Masking: Proxy data tim melalui /api/team dan /api/team/[id] dengan pembatasan akses email hanya untuk akun Administrator.",
      "Pembersihan Legacy Fridge: Menghapus total query, counter badge, dan subscription realtime fridge_items yang tidak digunakan.",
      "In-Flight Request Deduplication: Penerapan shared in-memory caching & request deduplication pada pic-store, lapak-store, wordle-store, team-store, dan memo-store untuk mereduksi duplikasi fetch pada saat mount desktop.",
    ],
  },
  {
    version: "v2.3.10",
    date: "12 Sep 2026",
    codename: "Daily Wordle 98 Asynchronous Word Puzzle & Mobile Responsive Polish",
    changes: [
      "Peluncuran game harian asinkron Wordle 98 (wordle.exe): tebak 1 kata rahasia 5 huruf tiap hari (reset jam 00:00) santai tanpa harus online bersamaan.",
      "Integrasi 200+ kosakata kurasi istilah IT, kultur kantor IT-Things, dan bahasa Indonesia 5-huruf valid.",
      "Papan Klasemen Harian realtime terintegrasi Supabase yang mencatat ranking tebakan tersedikit dan waktu selesai anggota tim.",
      "Fitur Salin Hasil Emoji retro khas Wordle untuk dibagikan ke obrolan tim atau chat messenger.",
      "Dukungan input ganda: keyboard fisik komputer (A-Z, Enter, Backspace) dan keyboard virtual touch-friendly di layar.",
      "Optimasi tampilan mobile untuk Wordle 98: touch-manipulation, hit area tombol min 32px, dan tata letak responsif.",
      "Penyempurnaan state launcher desktop dengan auto-fallback data instance agar aplikasi game selalu terbuka lancar.",
    ],
  },
  {
    version: "v2.3.9",
    date: "12 Sep 2026",
    codename: "Multiplayer Paint War 98, Retro Game Arcade & Exit Confirmation",
    changes: [
      "Peluncuran game multiplayer Paint War 98 (paintwar.exe): tebak gambar live realtime bergaya MS Paint dengan 16 palet warna Win98, flood fill, undo, dan word bank istilah IT & kantor.",
      "Integrasi Game Center (game.exe) sebagai launcher koleksi game retro tim menggantikan posisi ikon team.exe di desktop.",
      "Perbaikan normalisasi resolusi ikon retro pada RetroIcon component untuk mencegah error load asset PNG.",
      "Penambahan interceptor konfirmasi keluar retro (ConfirmDialog KELUAR_GAME.EXE) saat tombol close ditekan agar sesi permainan tidak sengaja tertutup.",
      "Pembersihan status kehadiran online (is_online) secara otomatis saat pemain menutup game atau browser untuk mencegah ghost player.",
      "Optimalisasi broadcast goresan gambar (throttling 50ms) dan debounced canvas snapshot ke Supabase Realtime.",
    ],
  },
  {
    version: "v2.3.8",
    date: "12 Sep 2026",
    codename: "Mobile Responsive Overhaul — Taskbar, Pantry Card View & Auth Modals",
    changes: [
      "Taskbar mobile: ticker promo, badge versi, nama & role user disembunyikan di layar < md agar tidak terpotong.",
      "Pantry katalog: tampilan card list khusus mobile (< sm) menggantikan tabel — stok, progress kuota, dan tombol ambil nyaman di-tap.",
      "Tab navigasi Pantry kini scrollable horizontal (overflow-x-auto) dan tidak wrapping di layar sempit.",
      "Google Login Modal: tambah tombol close (×) di title bar dengan touch target min 32px.",
      "global.css: overflow-x hidden + overscroll-behavior none untuk mencegah horizontal scroll tak disengaja.",
      "RetroActionButton: hit area icon mode diperluas ke minimal 32px untuk kenyamanan tap mobile.",
      "Sticky note widget: batas posisi dan max-width diperbaiki agar tidak menimpa ikon desktop di viewport sempit.",
    ],
  },
  {
    version: "v2.3.7",
    date: "12 Sep 2026",
    codename: "Split Bill Suite, Realtime Database Sync & Deterministic Member Order",
    changes: [
      "Peluncuran modul Split Bill (splitbill.exe) dengan kalkulasi otomatis (bagi rata & itemized), ongkir, pajak, dan diskon.",
      "Integrasi Supabase Realtime & RLS: izin kelola eksklusif untuk Pembuat Sesi dan Admin.",
      "Pembersihan otomatis data tagihan setelah 7 hari via pg_cron untuk menjaga performa database.",
      "Format input nominal otomatis dengan masking titik Rupiah dan opsi simpan rekening default per pengguna.",
      "Kunci urutan peserta deterministik dan stabil agar daftar anggota tidak meloncat saat konfirmasi pembayaran.",
    ],
  },
  {
    version: "v2.3.6",
    date: "12 Sep 2026",
    codename: "Internet Explorer 98, Pantry Navigation Split & Clean Counter Badges",
    changes: [
      "Peluncuran aplikasi Internet Explorer (iexplore.exe) dengan YouTube video player retro, background audio persistence, pencarian video, dan preset kategori.",
      "Pemisahan navigasi pemilih bulan di Pantry ke Tab Rekap dan Riwayat, mengunci Tab Katalog pada konsumsi bulan berjalan secara real-time.",
      "Standarisasi badge counter notifikasi ikon desktop (Vote, Pantry) menjadi angka ringkas polos tanpa embel-embel teks.",
      "Perbaikan handling virtual keyboard dan taskbar viewport pada perangkat mobile.",
      "Integrasi skill workflow otomatisasi rilis untuk percepatan build, versioning, commit, dan push.",
    ],
  },
  {
    version: "v2.3.5",
    date: "11 Sep 2026",
    codename: "Aesthetic Wallpaper Expansion & Mobile Chat Polish",
    changes: [
      "Ekspansi galeri Display Properties dengan 21 preset wallpaper beresolusi tinggi (Retro 98, Aesthetic & Scene, Modern Gradient).",
      "Kategori filter interaktif pada Properti Tampilan untuk mempermudah pemilihan tema wallpaper.",
      "Optimasi tampilan mobile untuk jendela desktop dan chat input mengikuti viewport virtual keyboard.",
      "Perbaikan urutan React Hook pada Display Properties dialog untuk stabilitas render.",
      "Operasi hening tanpa efek suara retro saat minimize/restore desktop dan ganti wallpaper.",
    ],
  },
  {
    version: "v2.3.4",
    date: "11 Sep 2026",
    codename: "Kas Google Sheets Portal & Dues Mechanism",
    changes: [
      "Integrasi portal resmi Google Spreadsheet pada Kas.exe dengan direct launch tab baru dan tombol salin link cepat.",
      "Pengumuman mekanisme iuran resmi divisi IT dengan tarif berjenjang (TKO: Rp 100.000, TKNO: Rp 50.000) dan jadwal gajian (tgl 8 & 25).",
      "Pembersihan form transaksi lokal dan dummy ledger agar pencatatan terpusat 100% pada Google Sheets.",
      "Pelepasan flag isComingSoon pada Kas.exe untuk peluncuran resmi dari Desktop dan Start Menu.",
      "Perbaikan layout card tarif iuran retro Windows 98 agar rapi, proporsional, dan bebas wrapping teks berlebih.",
    ],
  },
  {
    version: "v2.3.3",
    date: "11 Sep 2026",
    codename: "Display Properties & Show Desktop Suite",
    changes: [
      "Fitur Quick Launch toolbar di Taskbar dengan tombol Show Desktop (Minimize & Restore Semua Jendela) otentik Windows 98 serta shortcut Alt+D.",
      "Fitur kustomisasi wallpaper desktop ala Windows 98 (Display Properties / desk.cpl).",
      "Preview visual monitor CRT tabung interaktif real-time dengan efek scanline dan simulasi ikon desktop.",
      "Koleksi preset retro legendaris (Windows 98 Classic Teal, Windows 2000 Pro Blue, Matrix Terminal, XP Bliss, Synthwave, dll).",
      "Dukungan kustomisasi lengkap: upload berkas gambar lokal otomatis kompresi, URL gambar web, dan palet warna solid hex.",
      "Menu klik kanan retro (Context Menu) pada area desktop kosong untuk akses instan ke Properti Tampilan dan Show Desktop.",
      "Penyimpanan preferensi persisten di browser (localStorage) dengan mode tampilan (Fill, Fit, Tile, Center) serta toggle efek tekstur & watermark.",
    ],
  },
  {
    version: "v2.3.2",
    date: "11 Sep 2026",
    codename: "Lapak Teman & Smart Rupiah Price Masking",
    changes: [
      "Modul Lapak_Teman.exe untuk katalog promosi usaha, jastip, kuliner, dan jasa IT rekan tim dengan integrasi direct WhatsApp.",
      "Running Ticker Marquee emas retro (Glowing Gold LED Ticker) di Taskbar dengan highlight promo berputar dan pause-on-hover.",
      "Tab Lapak Teman pada widget Sticky Note desktop dengan kartu promo mini dan navigasi carousel.",
      "Input harga cerdas dengan auto-masking titik Rupiah realtime (Harga Pas, Mulai Dari, Rentang Min-Max, Nego/Custom).",
      "Penyelarasan icon harga netral (Price Tag 🏷️) menggantikan simbol dollar.",
    ],
  },
  {
    version: "v2.3.1",
    date: "11 Sep 2026",
    codename: "Chat Realtime Resilience & Mute Protocol",
    changes: [
      "Sinkronisasi otomatis obrolan chat lintas perangkat saat tab aktif kembali, bangun dari sleep, dan online (visibilitychange/focus).",
      "Bridge event realtime dari channel notifikasi global ke store obrolan untuk mencegah chat out-of-sync.",
      "Penanganan sesi token Supabase kedaluwarsa dengan auto-refresh & auto-retry otomatis pada pengiriman pesan.",
      "Perbaikan fitur mode Bisu: menonaktifkan suara retro, menyenyapkan suara native Windows OS (silent: true), dan menahan pop-up notifikasi.",
    ],
  },
  {
    version: "v2.3.0",
    date: "11 Sep 2026",
    codename: "Dynamic Multi-PIC & Lapak Usaha Suite",
    changes: [
      "Sistem penunjukan Dynamic Multi-PIC (PIC Kas & PIC Pantry) dengan delegasi realtime langsung dari antarmuka Team App.",
      "Penghapusan static role Bendahara (treasurer) dan standarisasi ke peran bersih Admin & Member berdasar hak akses PIC dinamis.",
      "Modul Lapak Teman (lapak.exe) untuk etalase dan promosi usaha kuliner/jasa internal tim dengan taskbar running ticker.",
      "Optimasi responsive layout form penunjukan PIC dan perbaikan batas overflow pada elemen retro Windows 98.",
    ],
  },
  {
    version: "v2.2.6",
    date: "11 Sep 2026",
    codename: "Desktop Sticky Note Announcement",
    changes: [
      "Fitur Desktop Sticky Note (MEMO.TXT) untuk papan pengumuman tim interaktif di wallpaper desktop.",
      "Dukungan drag & drop bebas dengan penyimpanan posisi koordinat otomatis di browser (localStorage).",
      "Sinkronisasi realtime via Supabase Realtime dengan proteksi role (hanya Admin dan Bendahara yang dapat mengedit).",
      "Normalisasi format baris baru (newline) dan tombol reset posisi ke default.",
    ],
  },
  {
    version: "v2.2.5",
    date: "10 Sep 2026",
    codename: "Single Reaction Enforcer",
    changes: [
      "Pembatasan reaksi pesan obrolan maksimal satu emoji per pengguna (enforced via database unique constraint).",
      "Otomatis mengganti (replace) emoji sebelumnya saat pengguna memilih emoji berbeda.",
      "Mendukung toggle off / menghapus reaksi jika mengklik emoji yang sama.",
      "Penambahan listener realtime UPDATE dan policy Row-Level Security pada chat_reactions.",
    ],
  },
  {
    version: "v2.2.4",
    date: "10 Sep 2026",
    codename: "Onboarding & README System Guide",
    changes: [
      "Penambahan aplikasi Notepad retro (README.txt) di desktop dengan panduan lengkap pengenalan IT-THINGS.",
      "Panel interaktif ringkasan fungsi web ('Web ini untuk apa?') di layar Passcode sebelum login.",
      "Badge status INFO pada ikon README.txt dan penataan ulang grid ikon desktop.",
      "Penyempurnaan branding & tagline portal di wallpaper desktop dan layar security gate.",
    ],
  },
  {
    version: "v2.2.3",
    date: "10 Sep 2026",
    codename: "LiveChat Security & Input Sanitization",
    changes: [
      "Sanitasi ketat input teks chat untuk mencegah pesan kosong, spasi/enter saja, dan Unicode zero-width/invisible chars.",
      "Database CHECK constraint pada tabel chat_messages & chat_reactions di Supabase (max 1000 char, no empty space).",
      "Penghitung karakter real-time di textarea dengan batas tegas maksimal 1000 karakter.",
      "Proteksi anti-flood cooldown pada pengiriman pesan obrolan.",
      "Validasi keamanan URL avatar (hanya protokol aman) & pencegahan ReDoS pada regex mention.",
    ],
  },
  {
    version: "v2.2.2",
    date: "10 Sep 2026",
    codename: "Desktop Icon Activity Badges",
    changes: [
      "Badge chip retro pada ikon desktop Vote.exe jika ada polling/vote aktif.",
      "Badge chip retro dengan animasi pulse pada ikon desktop Chat.exe jika ada pesan belum dibaca.",
      "Sinkronisasi realtime untuk jumlah vote aktif dan unread chat lintas jendela.",
      "Perbaikan integritas hak akses Admin (database & client) agar penghapusan/moderasi pesan chat selalu berfungsi.",
    ],
  },
  {
    version: "v2.2.1",
    date: "10 Sep 2026",
    codename: "Windows OS Notifications & Auto-Permission",
    changes: [
      "Permintaan izin notifikasi browser otomatis saat unlock passcode dan interaksi pertama.",
      "Banner pemicu perizinan notifikasi di header Chat.exe untuk kemudahan aktivasi manual.",
      "Notifikasi native Windows OS (Action Center) aktif saat obrolan baru masuk.",
    ],
  },
  {
    version: "v2.2.0",
    date: "10 Sep 2026",
    codename: "Retro Notification Suite",
    changes: [
      "Fitur notifikasi in-app retro (balon pop-up Windows 98 di pojok taskbar).",
      "Efek suara retro chime ding sintetis via Web Audio API tanpa aset eksternal.",
      "Kontrol mute/bisu di System Tray Taskbar dan header Chat.exe.",
      "Indikator unread badge & animasi kedip pada tombol taskbar Chat.exe.",
    ],
  },
  {
    version: "v2.1.1",
    date: "10 Sep 2026",
    codename: "Mobile Chat & Admin Moderation",
    changes: [
      "Perbaikan hak akses admin & policy RLS untuk moderasi/hapus pesan di Chat.exe.",
      "Peningkatan UX Chat di mobile: interaksi tap-to-activate & floating action toolbar di atas pesan.",
      "Penyempurnaan posisi popover emoji reaksi agar tidak terpotong di layar HP.",
      "Peningkatan lapisan z-index dialog konfirmasi agar selalu tampil di depan pada mobile.",
    ],
  },
  {
    version: "v2.1.0",
    date: "10 Sep 2026",
    codename: "Chat & Security Gate",
    changes: [
      "Fitur Live Team Chat (Chat.exe) realtime dengan mention, reaksi emoji, & edit pesan.",
      "Passcode Security Gate 4-digit & mode akses Tamu (Read-Only).",
      "Edit Profil & Sinkronisasi Nama/Avatar internal.",
      "Dialog Tentang Sistem (winver.exe) & tampilan versioning terpusat.",
    ],
  },
  {
    version: "v2.0.0",
    date: "1 Sep 2026",
    codename: "Retro Desktop Suite",
    changes: [
      "Perombakan antarmuka bergaya Windows 98 Retro Desktop.",
      "Modul Vote.exe dengan sinkronisasi Supabase Realtime.",
      "Taskbar retro, Start menu, window manager multi-tasking.",
      "Indikator konektivitas live/demo & fallback local storage.",
    ],
  },
  {
    version: "v1.0.0",
    date: "15 Agu 2026",
    codename: "Initial Release",
    changes: [
      "Rilis perdana aplikasi utilitas internal tim IT.",
      "Manajemen grup polling dan voting dasar.",
    ],
  },
]
