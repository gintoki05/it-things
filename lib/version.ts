export interface VersionRelease {
  version: string
  date: string
  codename?: string
  changes: string[]
}

export const APP_VERSION = "v2.3.1"
export const APP_BUILD = "2026.09.11"
export const APP_NAME = "IT-THINGS 98"
export const APP_EDITION = "Second Edition (SE)"

export const APP_CHANGELOG: VersionRelease[] = [
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
