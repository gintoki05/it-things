---
name: release
description: >-
  Use this skill when the user asks to release, ship, bump version, build, commit, and push changes to the repository.
  Executes pre-flight build/typecheck, bumps version in package.json and lib/version.ts, generates changelog entries, commits, and pushes to git.
---

# Release Workflow Skill (Build, Versioning, Commit & Push)

Gunakan skill ini untuk merilis versi baru aplikasi IT-THINGS secara otomatis dan konsisten.

## Alur Prosedur Eksekusi

Skill ini terdiri dari 4 tahapan berurutan:

```
[1. Pre-flight & Build] ──> [2. Versioning & Changelog] ──> [3. Git Commit] ──> [4. Git Push]
```

---

### Langkah 1: Pre-Flight & Verifikasi Build

1. Cek status git saat ini:
   ```bash
   git status -s
   ```
2. Jalankan typecheck TypeScript untuk memastikan tidak ada error kompilasi:
   ```bash
   npm run typecheck
   ```
3. Jalankan build produksi Next.js untuk memvalidasi bundling dan SSR/Turbopack:
   ```bash
   npm run build
   ```
   *Jika typecheck atau build gagal, HENTIKAN proses dan selesaikan perbaikan kode terlebih dahulu sebelum melanjutkan rilis.*

---

### Langkah 2: Versioning & Changelog

1. **Tentukan Versi Baru**:
   - Cek versi terkini di `package.json` dan `lib/version.ts`.
   - Default: **Patch bump** (misal `2.3.5` -> `2.3.6`), kecuali user secara eksplisit meminta minor (`2.4.0`) atau major.
   - Format tanggal build: `YYYY.MM.DD` (contoh: `2026.09.12`).

2. **Perbarui `package.json`**:
   - Ubah kolom `"version"` ke nomor versi baru (tanpa huruf `v`, contoh `"2.3.6"`).

3. **Perbarui `lib/version.ts`**:
   - `export const APP_VERSION = "vX.Y.Z"` (dengan awalan `v`).
   - `export const APP_BUILD = "YYYY.MM.DD"`
   - Tambahkan entri baru di bagian teratas array `APP_CHANGELOG`:
     ```ts
     {
       version: "vX.Y.Z",
       date: "DD Mmm YYYY", // contoh: "12 Sep 2026"
       codename: "Judul Rilis / Fitur Utama",
       changes: [
         "Rangkuman fitur atau perbaikan 1...",
         "Rangkuman fitur atau perbaikan 2...",
       ],
     },
     ```
     *(Rangkum poin perubahan secara padat dan jelas berdasarkan `git diff` atau fitur yang baru dikerjakan).*

---

### Langkah 3: Git Commit

1. Stage seluruh perubahan yang relevan:
   ```bash
   git add package.json lib/version.ts
   # Tambahkan juga file source code / komponen yang baru dimodifikasi jika belum di-commit
   git add .
   ```
2. Buat commit terstandarisasi dengan format conventional commit:
   ```bash
   git commit -m "chore(release): vX.Y.Z - <Codename Rilis>" -m "<Poin ringkas perubahan>"
   ```

---

### Langkah 4: Git Push & Konfirmasi

1. Cek branch aktif:
   ```bash
   git branch --show-current
   ```
2. Lakukan push ke remote repository:
   ```bash
   git push origin <current-branch>
   ```
3. Berikan konfirmasi ringkas dan to-the-point kepada user berisi:
   - Versi rilis baru (`vX.Y.Z`).
   - Ringkasan changelog yang dicatat.
   - Status commit hash dan remote push.
