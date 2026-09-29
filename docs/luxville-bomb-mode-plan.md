# Plan implementasi Bomb Mission — Luxville

Status: rencana, belum diimplementasikan.

## Target dan batas scope

Tambahkan mode `bomb` di DOODLE.EXE untuk multiplayer Luxville, menggunakan lobby, transport jaringan, dan pemilihan tim yang sudah ada. Tero menyerang site A/B; CT mempertahankannya. Match menggunakan ronde tanpa respawn.

FFA, TDM, dan solo tetap memakai aturan masing-masing. Tidak ada perubahan layout Luxville dalam pekerjaan ini, kecuali penetapan area plant dan penempatan objek bom. Tidak menambah ekonomi senjata, defuse kit, ranked, bot Bomb Mission, pergantian sisi otomatis, atau migrasi host.

Pengujian gameplay/manual dilakukan pengguna. Implementasi tidak menjalankan testing otomatis atau browser tanpa permintaan baru.

## Aturan awal yang disepakati

| Pengaturan | Nilai awal |
| --- | --- |
| Persiapan ronde | 5 detik; gerak, tembakan, dan damage dikunci |
| Waktu menyerang | 150 detik setelah persiapan |
| Plant | Tahan interaksi 3 detik |
| Waktu bom | 40 detik sejak plant selesai |
| Defuse | Tahan interaksi 5 detik |
| Jeda hasil ronde | 5 detik |
| Menang match | Pertama mencapai 5 kemenangan |
| Pemain mulai | Minimal satu pemain per tim |
| Respawn | Hanya pada ronde berikutnya |
| Pemain terlambat masuk | Spectator sampai ronde berikutnya |
| Friendly fire | Nonaktif dalam mode bom |

Simpan angka dalam satu konfigurasi mode agar mudah disesuaikan setelah pengguna bermain. Senjata memakai sistem yang sudah ada; HP, ammo, efek, proyektil, pickup, dan benda pecah direset setiap ronde. Jangan membawa aturan timer, kill target, respawn, atau regenerasi khusus TDM ke mode ini secara tidak sengaja.

## Siklus ronde

`lobby → preparing → live → planted → round_end → preparing / match_end`

- Host mengunci roster dan tim untuk ronde yang dimulai.
- Pilih satu Tero hidup sebagai pembawa bom; rotasi antar pemain aktif tiap ronde agar tidak selalu pemain pertama.
- Spawn mengikuti `teamSpawns` Luxville, tanpa overlap antar anggota tim. Jika slot tim melebihi titik spawn, tambahkan titik aman sebelum menaikkan kapasitas.
- Saat `live`, Tero dapat plant pada salah satu site yang valid.
- Setelah `planted`, timer bom menjadi satu-satunya timer kemenangan karena waktu; timer serang tidak lagi menentukan hasil.
- Pemain mati tidak dapat menembak, mengambil bom, plant, atau defuse. Spectator hanya mengikuti rekan satu tim yang hidup.
- Saat `round_end`, kunci aksi, tampilkan alasan menang, tambah skor sekali, lalu reset atau akhiri match.

## Aturan hasil dan kejadian bersamaan

| Kondisi | Hasil |
| --- | --- |
| Bom meledak | Tero menang |
| Defuse selesai sebelum deadline ledakan | CT menang |
| Semua CT mati | Tero menang |
| Semua Tero mati, bom belum terpasang | CT menang |
| Semua Tero mati, bom sudah terpasang | Ronde lanjut; CT harus defuse |
| Timer serang habis, bom belum terpasang | CT menang |
| Kedua tim habis sebelum plant | CT menang |
| Kedua tim habis setelah plant | Tero menang karena CT tidak tersisa |

Host memakai waktu monoton dan deadline absolut, bukan mengurangi timer berdasarkan jumlah frame. Plant harus selesai sebelum deadline ronde; defuse harus selesai sebelum deadline bom. Pada waktu tepat sama dengan deadline, timeout/ledakan menang. Jika kematian dan penyelesaian interaksi memiliki waktu sama, kematian membatalkan interaksi terlebih dahulu. Untuk kejadian pada tick berbeda, urutan kejadian yang sudah diterima host berlaku; tidak membalik hasil yang sudah final.

Satu fungsi finalisasi ronde harus idempotent dan memeriksa `matchId`, `roundId`, serta fase agar event terlambat atau duplikat tidak memberi skor ganda.

## Bom dan interaksi

Status bom: `carried`, `dropped`, `planted`, `defused`, atau `exploded`.

- Satu bom per ronde; kepemilikan hanya boleh berubah lewat host.
- Pembawa mati/keluar: jatuhkan di permukaan lantai valid terdekat dari posisi terakhir. Jika titik jatuh tidak dapat diakses, gunakan titik aman terakhir pembawa, lalu fallback spawn Tero.
- Hanya Tero hidup yang boleh mengambil bom jatuh. Host memilih permintaan valid pertama ketika dua pemain mengambil bersamaan.
- CT tidak dapat mengambil bom yang belum dipasang.
- Plant memerlukan bom, site valid, pemain hidup, dan posisi menapak lantai plant.
- Gunakan volume site dengan batas X/Z **dan Y**. Marker lingkaran `siteA/siteB` saat ini tidak cukup: pemain di balkon atas A tidak boleh plant menembus lantai.
- Posisi plant harus berada pada lantai yang dapat dipijak dan di luar cover/rak/peti. Bom menempel pada posisi yang disahkan host.
- Defuse memerlukan jarak dekat, beda tinggi yang wajar, serta jalur interaksi yang tidak terhalang dinding/lantai. Hanya satu CT menjadi defuser aktif.
- Plant/defuse batal saat tombol dilepas, pemain bergerak dari posisi interaksi, melompat, keluar area/jangkauan, mati, atau disconnect. Progres kembali nol. Terkena damage tanpa mati tidak otomatis membatalkan.
- Selama interaksi, tembakan, melee, grenade, grapple, dan dash dinonaktifkan. Gerakan untuk membatalkan tetap diterima.
- Audit key bindings sebelum memilih tombol. Jangan mengambil `E` begitu saja karena terkait grapple. Tampilkan tombol yang benar di HUD dan sediakan padanan gamepad; kontrol touch mengikuti dukungan input game yang tersedia.

## Sinkronisasi multiplayer

Host menjadi sumber status ronde dan bom. Ini otoritas dalam sesi peer-to-peer, bukan jaminan anti-cheat setara dedicated server.

Snapshot minimal:

```text
matchId, roundId, revision, phase
roster, teams, alivePlayerIds, scores
hostNow, phaseEndsAt
bomb: state, carrierId, position, siteId, explodesAt
interaction: kind, playerId, startedAt, completesAt
winner, reason
```

- Client mengirim intent: mulai/batal interaksi, heartbeat tombol ditahan, ambil bom, dan permintaan snapshot.
- Host memvalidasi identitas pengirim terhadap koneksi, tim, status hidup, posisi terbaru yang diterima, jangkauan, fase, dan kepemilikan. Abaikan posisi/tim arbitrer yang disertakan dalam intent.
- Interaksi memakai token/id; pembatalan atau heartbeat lama tidak boleh memengaruhi interaksi berikutnya. Heartbeat yang kedaluwarsa membatalkan hold agar putus koneksi tidak menyelesaikan plant otomatis.
- Gunakan transport reliable yang sudah tersedia untuk perubahan status. Broadcast hanya sesudah perubahan dan lakukan snapshot berkala untuk pemulihan; hindari event reliable per frame.
- Client menghitung tampilan countdown dari deadline host dan estimasi offset waktu. Angka client mencapai nol tidak boleh menyelesaikan ronde sendiri.
- Abaikan snapshot/event dari match atau ronde lama dan revision yang sudah diterapkan. Terapkan snapshot lengkap ketika masuk atau pulih koneksi.
- Host disconnect: hentikan match, tampilkan alasan, kembali ke lobby/menu yang aman. Tidak memilih host baru pada versi pertama.
- Pemain keluar dianggap tidak aktif untuk evaluasi eliminasi. Jika semua pemain pada satu tim meninggalkan match, tim lawan menang karena forfeit; jangan mengulang ronde kosong. Jika tidak ada pemain tersisa, sesi ditutup.
- Pemain reconnect diperlakukan sebagai late join untuk ronde berjalan. Tidak mendapat nyawa tambahan.

## Integrasi kode

| Area | Pekerjaan |
| --- | --- |
| `public/games/doodle/game.js` | Lobby `bomb`, routing event, input, kematian, reset, spectator, integrasi render/update |
| `public/games/doodle/bomb-mode.js` (baru) | State machine, deadline, validasi intent, kepemilikan bom, finalisasi ronde |
| `public/games/doodle/bomb-hud.js` (baru, bila perlu) | Prompt, progres, timer, hasil ronde, objek bom dan cleanup |
| `public/games/doodle/minimap.js` | Marker bom dan site sesuai aturan visibilitas |
| `public/games/doodle/style.css` | Tampilan HUD responsif mengikuti gaya doodle |
| `components/apps/doodle-app.tsx` | Teruskan metadata mode pada daftar/lobby room jika diperlukan |
| `app/actions/doodle.ts` | Audit whitelist/normalisasi metadata room; ubah hanya bila mode baru memerlukannya |

Pisahkan logika baru dari bundle `game.js` yang sebagian besar minified. Pertahankan perubahan lokal lain. Audit kontrak event dan alur kematian yang aktual sebelum menyambungkan mode; jangan membuat transport jaringan baru. Tidak merencanakan tabel database baru untuk state ronde.

## Tahapan implementasi dan hasil yang harus tersedia

### 1. Fondasi lobby dan state ronde

- [ ] Audit mode FFA/TDM, pemilihan tim, event jaringan, timer, death/respawn, dan input.
- [ ] Tambahkan `bomb` pada lobby serta metadata room yang relevan.
- [ ] Kunci map ke Luxville saat Bomb Mission dipilih dan cegah mulai dengan tim kosong.
- [ ] Buat konfigurasi, state machine, identitas match/ronde, dan reset yang membersihkan listener/timer lama.
- [ ] Implementasikan persiapan, waktu ronde, skor, hasil, dan match selesai.

Hasil: match dapat memulai dan mengulang ronde tanpa mengganggu mode lain.

### 2. Kehidupan pemain dan spectator

- [ ] Nonaktifkan respawn selama ronde dan pisahkan evaluasi eliminasi dari TDM.
- [ ] Terapkan spawn tim, reset perlengkapan, dan kunci damage saat persiapan/hasil.
- [ ] Tambahkan spectator rekan, termasuk keadaan tidak ada rekan hidup.
- [ ] Masukkan late join ke antrean ronde berikutnya.

Hasil: setiap peserta hanya punya satu nyawa per ronde.

### 3. Siklus bom

- [ ] Definisikan volume plant A/B dan batas tinggi lantai.
- [ ] Tambahkan pemilihan pembawa, drop, pickup atomik, dan pemulihan bom jatuh tidak terjangkau.
- [ ] Implementasikan plant/defuse tahan tombol dan seluruh kondisi pembatalan.
- [ ] Implementasikan ledakan dan finalisasi hasil sesuai prioritas kejadian.

Hasil: satu ronde dapat diselesaikan lewat plant–ledakan atau plant–defuse.

### 4. Jaringan dan pemulihan sesi

- [ ] Intent tervalidasi host, revision, token interaksi, dan snapshot untuk late join.
- [ ] Timer berbasis deadline serta heartbeat interaksi.
- [ ] Penanganan disconnect pembawa/defuser, forfeit tim, dan host keluar.
- [ ] Abaikan event duplikat, event ronde lama, dan input setelah ronde selesai.

Hasil: semua peer menerima kepemilikan bom, skor, dan hasil yang sama.

### 5. HUD, audio, dan penyerahan

- [ ] Skor tim, nomor ronde, waktu persiapan/serang/bom, serta status spectator.
- [ ] Prompt kontekstual plant/defuse/pickup dan progres dari status host.
- [ ] Indikator pembawa; bom jatuh hanya pada minimap Tero, site terpasang pada kedua tim. Tidak menampilkan musuh tersembunyi.
- [ ] Bunyi plant, detak bom yang makin cepat, defuse, ledakan, dan hasil ronde; hormati pengaturan audio.
- [ ] Pastikan dari struktur layout HUD tetap muat pada 360–390px; pemeriksaan visual/manual diserahkan ke pengguna.
- [ ] Berikan ringkasan file berubah, batasan yang tersisa, dan checklist manual berikut. Jangan menyatakan pengujian sudah lulus.

## Checklist manual untuk pengguna

Gunakan dua browser/perangkat untuk lawan tim; gunakan tiga atau lebih untuk spectator dan persaingan mengambil/defuse.

1. Pilih Bomb Mission: map menjadi Luxville, kedua tim harus terisi, lalu mulai.
2. Persiapan menahan gerak/tembakan; timer serang baru berjalan setelahnya.
3. Plant di A dan B berhasil; plant di luar site atau balkon atas site ditolak.
4. Lepas tombol, berjalan, melompat, atau mati saat interaksi: progres batal.
5. Pembawa mati/keluar: bom jatuh; Tero lain dapat mengambil; CT tidak bisa.
6. Dua Tero mengambil bersamaan: hanya satu menjadi pembawa.
7. Bom terpasang: timer menjadi 40 detik pada semua peer; timer serang tidak mengakhiri ronde.
8. Defuse dekat bom berhasil; dari balik tembok/lantai lain ditolak; dua CT tidak dapat defuse bersamaan.
9. Seluruh Tero mati setelah plant: countdown tetap berjalan.
10. Periksa eliminasi, timer habis, ledakan, dan defuse masing-masing memberi skor tepat sekali.
11. Coba defuse/plant mendekati deadline: hasil semua peer sama.
12. Mati: tidak respawn, hanya menonton rekan; ronde baru memulihkan HP/ammo dan map.
13. Late join/reconnect: menerima status terkini, menunggu ronde berikutnya untuk bermain.
14. Defuser keluar, satu tim keluar seluruhnya, dan host keluar: tidak ada ronde macet.
15. Setelah 5 kemenangan, match berhenti dan hasil tampil; dapat kembali ke lobby.
16. Coba ulang FFA, TDM, serta solo untuk memastikan aturan bom tidak terbawa.

## Batasan yang tetap dinyatakan

- Luxville dan elevasinya masih adaptasi referensi, bukan replika Point Blank 1:1.
- Peer host menentukan hasil, tetapi validasi gerak/damage keseluruhan masih mengikuti kemampuan game saat ini.
- Pengujian lintas jaringan, visual mobile, dan balancing belum dilakukan; checklist ini adalah rencana pemeriksaan, bukan bukti kelulusan.
