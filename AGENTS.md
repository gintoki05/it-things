<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:supabase-rules -->
# Supabase: RLS, Security & Migration

## Row Level Security (RLS)

- **Selalu enable RLS** pada setiap tabel baru yang dibuat: `ALTER TABLE public.<tabel> ENABLE ROW LEVEL SECURITY;`
- **SELECT policy default = `USING (true)`** kecuali data bersifat sensitif/private — data di app ini bersifat internal tim, boleh dibaca semua authenticated user.
- **INSERT policy** harus selalu memvalidasi `auth.uid() IS NOT NULL` dan kolom `user_id` / `created_by_id` = `auth.uid()::text`.
- **UPDATE/DELETE policy** hanya boleh dilakukan oleh pemilik row (`created_by_id = auth.uid()::text`) ATAU admin (`public.is_admin()`). Jangan buat policy UPDATE/DELETE terbuka.
- **Gunakan helper functions** `public.is_admin()` dan `public.is_treasurer()` yang sudah ada di database — jangan hardcode role check di setiap policy.
- **Jangan gunakan** `FORCE ROW LEVEL SECURITY` atau `SECURITY DEFINER` pada fungsi kecuali benar-benar diperlukan dan dipahami risikonya.
- **Selalu sertakan policy** di `supabase/schema.sql` untuk setiap tabel yang dibuat — jangan biarkan tabel tanpa policy setelah RLS diaktifkan (akan block semua akses).

## Keamanan Umum

- **user_id di tabel** selalu bertipe `TEXT` (bukan UUID) karena Supabase Google OAuth menggunakan sub/UID yang bisa berupa string arbitrer.
- **Jangan simpan secret** apapun di client-side code, .env.local boleh menyimpan `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key memang public by design — dilindungi RLS).
- **Optimistic UI**: Selalu lakukan update state lokal dulu sebelum call Supabase, lalu rollback jika error — lihat pola di `lib/vote-store.ts` sebagai referensi.
- **Error handling tabel belum ada**: Tangani error code `PGRST205`, `PGRST204`, `42P01` sebagai sinyal tabel belum di-migrate — tampilkan warning UI, jangan crash app.

## Migrasi & Schema

- **Schema SQL** selalu disimpan di `supabase/schema.sql` sebagai source of truth.
- **Setelah mengubah schema**, langsung eksekusi migration ke Supabase menggunakan **Supabase MCP** (`execute_sql`) — jangan hanya update file SQL lokal dan minta user untuk menjalankan manual.
- **Urutan migrasi yang benar**:
  1. `DROP TABLE IF EXISTS ... CASCADE` untuk tabel lama (jika ada rename/replace)
  2. `CREATE TABLE IF NOT EXISTS ...` untuk tabel baru
  3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
  4. `CREATE POLICY ...` untuk setiap tabel
  5. `CREATE INDEX IF NOT EXISTS ...` untuk kolom yang sering di-query
  6. `GRANT ALL ON ... TO anon, authenticated, service_role`
  7. `ALTER PUBLICATION supabase_realtime ADD TABLE ...` untuk tabel yang butuh realtime
- **Selalu verifikasi** setelah migrasi dengan `list_tables` MCP tool untuk memastikan tabel ada dan RLS enabled.
- **Jangan jalankan** `DROP TABLE` production tanpa konfirmasi user terlebih dahulu jika ada data penting di dalamnya.
- **Project Supabase aktif**: `it-things` (ref: `pdftwetkgslpvwissyik`, region: ap-northeast-1)

## Realtime

- Setiap tabel yang membutuhkan sync antar user **harus ditambahkan** ke `supabase_realtime` publication.
- Di client, subscribe menggunakan channel name yang unik per fitur: `"<fitur>-realtime"` (contoh: `"vote-realtime"`).
- Cleanup channel di `useEffect` return function: `supabase.removeChannel(channel)`.
<!-- END:supabase-rules -->

<!-- BEGIN:communication-rules -->
# Gaya Komunikasi & Anti-AI-Slop

## Tone & Bahasa (Gen Z & To The Point)
- **Gaya bahasa**: Pake gaya santai / Gen Z (santai, lu-gue/fleksibel, gak usah kaku atau formal birokratis).
- **No Yap / No AI Slop**: Jangan bertele-tele, jangan ngasih paragraf pembuka/penutup klise ala AI ("Tentu! Saya sangat senang membantu...", dsb). Langsung to the point ke inti masalah & solusinya.
- **Cut unnecessary explanation**: Gak perlu ngejelasin kode baris demi baris kalau gak diminta atau gak esensial. Keep it punchy & clear.

## UI Copywriting & Desain (Less is More)
- **Anti-redundansi teks di UI**: Hindari nampilin info/teks yang sama berulang-ulang di area yang berdekatan (contoh: jangan ulang "total suara", status, atau tanggal berkali-kali di header & card).
- **Sleek & Clean**: Jaga layout tetap lega dan rapi, hindari teks panjang yang bikin komponen sempit atau wrapping berantakan.
<!-- END:communication-rules -->

<!-- BEGIN:ui-dialog-rules -->
# Standar Modal & Dialog (Anti-Native Alert)

- **DILARANG MENGGUNAKAN NATIVE BROWSER DIALOG** (`window.confirm()`, `window.alert()`, `window.prompt()`):
  - Browser dialog bawaan merusak tampilan tema retro Windows 98 dan terasa out-of-place.
- **SELALU GUNAKAN `<ConfirmDialog>`**:
  - Gunakan komponen terstandarisasi `@/components/ui/confirm-dialog` untuk semua aksi konfirmasi (hapus data, batalkan transaksi, reset).
  - Beri judul jendela retro yang khas (contoh: `title="HAPUS_ITEM.EXE"`, `title="BATAL_AMBIL.EXE"`).
  - Gunakan `variant="destructive"` untuk aksi penghapusan permanen, dan `variant="warning"` untuk pembatalan/undo.
- **Untuk Notifikasi Ringan**:
  - Gunakan banner status inline dengan feedback suara retro (`playRetroNotificationSound()`), jangan pernah memanggil `alert()`.
<!-- BEGIN:ui-action-buttons-rules -->
# Standar Button & Icon Aksi (Konsistensi Antar Menu)

- **SELALU GUNAKAN `<RetroActionButton>`**:
  - Gunakan komponen terstandarisasi `@/components/ui/retro-action-button` untuk semua tombol aksi (edit, delete, undo/batal, add/tambah, refresh, restock).
  - DILARANG membuat button/icon manual dengan styling ad-hoc yang bikin UI antar modul belang-belang.
- **Daftar Action & Standar Visual**:
  - `action="edit"`: Icon `Edit3`, aksen amber/kuning hangat. Tooltip default "Ubah / Edit data".
  - `action="delete"`: Icon `Trash2`, aksen merah/destructive. Tooltip default "Hapus data". Selalu hubungkan dengan `<ConfirmDialog>` jika ada konfirmasi.
  - `action="undo"`: Icon `Undo2`, aksen netral/amber. Digunakan untuk batal ambil, rollback, undo aksi.
  - `action="add"`: Icon `Plus`, tombol retro biru tua Win98 dengan border khas.
  - `action="refresh"`: Icon `RotateCw`, abu-abu netral. Otomatis berputar (`animate-spin`) saat `isLoading={true}`.
  - `action="restock"`: Icon `PlusCircle`, aksen biru muda/stok.
- **Mode Tampilan (`visual`)**:
  - `visual="icon"`: Khusus aksi di dalam row tabel, card action corner, atau tempat compact lainnya.
  - `visual="button"`: Untuk tombol aksi utama dengan label teks dan bevel retro Windows 98 yang konsisten.
<!-- END:ui-action-buttons-rules -->

<!-- BEGIN:ui-badge-rules -->
# Standar Badge & Counter Notifikasi (Desktop & Komponen)

- **HANYA ANGKA POLOS UNTUK COUNTER**:
  - Badge counter jumlah pada ikon desktop (misal: Vote, Pantry, dll.) **HANYA boleh menampilkan angka saja** (contoh: `1`, `3`, `99+`).
  - **DILARANG** menambahkan teks status pendamping seperti `AKTIF`, `ITEM`, atau sejenisnya di dalam badge angka (hindari `1 AKTIF`, `3 AKTIF`).
  - Keterangan detail status disimpan pada atribut `title` (tooltip hover), contoh: `title="3 Poll Aktif"`.
- **Badge Teks Khusus**:
  - Badge teks hanya diperbolehkan untuk status non-angka yang memang berupa label sistem statis (contoh: `SOON`, `INFO`).
<!-- END:ui-badge-rules -->

<!-- BEGIN:ui-responsive-mobile-rules -->
# Standar Desain Responsif & Mobile View (Retro Win98)

## Breakpoint & Mobile Detection
- **Breakpoint Utama**: Gunakan patokan `< 768px` (`md:` pada Tailwind) untuk membedakan mode desktop vs mobile.
- **Mobile First & Adaptif**: Semua window, dialog, dan komponen baru harus diuji/dipastikan tetap utuh dan fungsional di layar mobile sekecil `360px - 390px`.

## Jendela (Window) & Dialog di Mobile
- **No Overflow Horizontal**: Jangan pernah hardcode fixed width yang melebihi viewport mobile (hindari `w-[600px]`, gunakan `w-full max-w-lg` atau `max-w-[95vw]`).
- **Modal & ConfirmDialog**: Pada mobile, modal harus otomatis mengisi lebar layar secara aman (`w-[92vw]` sampai `w-[95vw]`) dengan margin yang cukup dari tepi layar.
- **Virtual Keyboard Awareness**: Form input dan textarea di dalam window tidak boleh tertutup keyboard virtual. Pastikan body window memiliki `overflow-y-auto` yang scrollable.

## Tabel & Grid Data
- **Tabel Responsif**: Seluruh data tabular (tabel kas, pantry, polling, dll.) **WAJIB dibungkus** kontainer `overflow-x-auto` agar tidak merusak lebar parent window di mobile.
- **Grid Collapse**: Kolom grid multi-kolom desktop harus runtuh (collapse) ke 1 atau 2 kolom pada mobile (misal: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`).

## Touch Target & Interaksi
- **Ukuran Tap Minimal**: Tombol dan icon aksi retro (`RetroActionButton`, icon navigasi) harus nyaman di-tap pada layar sentuh (minimal target `32px` s.d. `40px` dengan hit area memadai).
- **Text Truncation & Wrap**: Header window, judul item, dan teks panjang harus menggunakan `truncate`, `line-clamp`, atau `break-words` agar tidak memaksa window melebar ke samping.
<!-- END:ui-responsive-mobile-rules -->


