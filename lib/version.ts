export interface VersionRelease {
  version: string
  date: string
  codename?: string
  changes: string[]
}

export const APP_VERSION = "v2.2.0"
export const APP_BUILD = "2026.09.10"
export const APP_NAME = "IT-THINGS 98"
export const APP_EDITION = "Second Edition (SE)"

export const APP_CHANGELOG: VersionRelease[] = [
  {
    version: "v2.2.0",
    date: "10 Sep 2026",
    codename: "Retro Notification Suite",
    changes: [
      "Fitur notifikasi in-app retro (balon pop-up Windows 98 di pojok taskbar).",
      "Efek suara retro chime ding sintetis via Web Audio API tanpa aset eksternal.",
      "Integrasi Browser & Windows OS Notification (Action Center) dengan permintaan izin otomatis saat unlock.",
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
