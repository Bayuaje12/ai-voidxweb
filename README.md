# X-VOID AI — Web Edition

Asisten suara berbahasa Indonesia dengan karakter X-VOID, avatar SVG lokal delapan ekspresi, transkrip sesi, dan percakapan suara realtime via WebRTC.

## Kebutuhan
- Node.js 20 atau lebih baru
- API key OpenAI dengan akses dan billing API yang aktif
- Browser modern. Mikrofon membutuhkan HTTPS (localhost juga diizinkan untuk pengembangan)

## Jalankan lokal
1. Download dan ekstrak ZIP.
2. Buka folder proyek di terminal/Termux.
3. Jalankan `npm install`.
4. Salin `.env.example` menjadi `.env` lalu isi `OPENAI_API_KEY` sendiri. Jangan kirim key ke siapa pun dan jangan commit file `.env`.
5. Jalankan `npm start`.
6. Buka `http://localhost:3000`.

## Deploy dari HP Android melalui GitHub dan Render

### A. Upload ke GitHub
1. Ekstrak ZIP menggunakan aplikasi pengelola file Android.
2. Buka GitHub di Chrome dan login.
3. Buat repository baru, misalnya `x-void-ai-web`.
4. Pilih **Add file → Upload files**. Unggah isi folder proyek (termasuk `package.json`, `src`, `public`, `render.yaml`, dan README). Jangan unggah `.env` atau `node_modules`.
5. Commit perubahan.

### B. Deploy ke Render
1. Buka https://render.com dan login.
2. Pilih **New + → Blueprint** (atau Web Service jika Blueprint tidak tersedia).
3. Hubungkan GitHub lalu pilih repository `x-void-ai-web`.
4. Render membaca `render.yaml`. Pastikan build command `npm install` dan start command `npm start`.
5. Di Environment, tambahkan `OPENAI_API_KEY` dengan API key milik sendiri. Jangan masukkan key ke source code.
6. Pastikan `OPENAI_REALTIME_MODEL` dan `OPENAI_REALTIME_VOICE` sesuai model/voice yang tersedia di project API. Deploy.
7. Buka URL `https://...onrender.com` setelah status Live.

### C. Mikrofon Chrome Android
1. Buka URL Render menggunakan Chrome (HTTPS wajib).
2. Tekan **Mulai percakapan**.
3. Pilih **Izinkan** saat Chrome meminta akses mikrofon.
4. Jika pernah menolak: ketuk ikon pengaturan situs di address bar → Permissions/Izin → Microphone → Allow, lalu reload.
5. Gunakan headset bila ada untuk mengurangi gema. Browser harus tetap membuka halaman saat sesi berlangsung.

### D. Memperbarui website
Edit file lewat GitHub (ikon pensil atau upload file), lalu commit. Render akan otomatis deploy ulang jika auto-deploy aktif.

## Konfigurasi
| Variable | Kegunaan |
|---|---|
| `OPENAI_API_KEY` | Secret API backend, wajib |
| `OPENAI_REALTIME_MODEL` | Default `gpt-realtime-2.1-mini` |
| `OPENAI_REALTIME_VOICE` | Default `marin`; pilih voice yang didukung model/project |
| `ALLOWED_ORIGINS` | Opsional, daftar origin lintas-domain dipisah koma. Kosong berarti hanya same-origin yang dipakai |
| `PORT` | Port server, disediakan Render otomatis |

## Cara kerja teknis
- Backend `POST /api/realtime/session` membuat short-lived client secret melalui `POST https://api.openai.com/v1/realtime/client_secrets`. API key permanen hanya ada di server.
- Browser memakai ephemeral secret untuk mengirim SDP offer ke `https://api.openai.com/v1/realtime/calls`, lalu membuat WebRTC peer connection dan data channel `oai-events`.
- Server VAD memakai `server_vad`, `create_response: true`, dan `interrupt_response: true` untuk pergantian giliran dan interupsi.
- Audio input transcription diaktifkan agar transkrip pengguna dapat ditampilkan. Teks balasan suara ditampilkan dari event transcript.
- Riwayat percakapan hanya berada di DOM selama halaman terbuka; tidak disimpan ke database.

## Pemeriksaan dan batasan yang perlu diketahui
- Jalankan `npm run check` untuk pemeriksaan sintaks JavaScript.
- `npm start` membutuhkan `OPENAI_API_KEY` hanya saat endpoint sesi dipanggil; server tetap dapat start tanpa key agar health check dapat berjalan.
- Belum ada pengujian pada perangkat Android fisik atau deployment Render dari proyek ini. Uji pertama memerlukan API key valid dan HTTPS.
- Nama voice hanya preset yang tersedia pada API, bukan jaminan karakter suara feminin tertentu. Ubah `OPENAI_REALTIME_VOICE` bila voice tersebut tidak tersedia di akun/model.
- Realtime API dan audio dikenai biaya API sesuai model dan pemakaian. Periksa halaman pricing OpenAI sebelum penggunaan berkelanjutan.
- Rate limit 20 request per menit per IP diterapkan pada endpoint API. Untuk website publik berskala besar, tambahkan autentikasi, batas sesi per pengguna, observability, dan proteksi abuse.

## Troubleshooting
- **503 API key belum dipasang:** tambahkan `OPENAI_API_KEY` di Render Environment lalu redeploy.
- **401/403 dari OpenAI:** cek key, project, billing, dan izin model.
- **404/400 model atau voice:** pilih model dan voice Realtime yang aktif di project API.
- **Mikrofon tidak muncul:** gunakan HTTPS, izinkan microphone di Chrome, dan pastikan tidak sedang dipakai aplikasi lain.
- **WebRTC gagal:** cek jaringan, matikan VPN/adblock sementara, refresh, dan coba jaringan lain.
- **Tidak terdengar audio:** naikkan volume media, ketuk layar untuk membuka playback, atau sambungkan headset.

## Referensi resmi
- Realtime client secrets: https://developers.openai.com/api/reference/resources/realtime/subresources/client_secrets/methods/create
- Realtime WebRTC guide: https://developers.openai.com/api/docs/guides/realtime-webrtc
- API pricing: https://platform.openai.com/pricing
