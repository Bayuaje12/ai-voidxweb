# X-VOID AI — Gemini Free Edition

Versi upgrade dari X-VOID AI Web Edition. UI gelap ungu, SVG avatar dan sistem 8 ekspresi dipertahankan. OpenAI Realtime diganti dengan Gemini API melalui backend Node.js. Input suara menggunakan Web Speech Recognition Chrome; jawaban dibacakan melalui SpeechSynthesis bawaan perangkat.

## Fitur
- Gemini API dengan model default `gemini-2.5-flash-lite`.
- API key hanya berada di backend (`GEMINI_API_KEY`).
- Chat teks dan input suara Bahasa Indonesia.
- Suara jawaban menggunakan voice Bahasa Indonesia yang tersedia di browser/perangkat. Pemilihan voice perempuan hanya best-effort; ketersediaan tergantung Android/Chrome dan paket TTS.
- Riwayat percakapan disimpan lokal di browser (`localStorage`).
- Delapan ekspresi avatar SVG/CSS lokal.
- Rate limit, Helmet, validasi input, health check.
- Tidak memakai OpenAI API, WebRTC, atau layanan TTS berbayar.

## Jalankan di Termux Android
1. Install Node.js dan Git: `pkg update && pkg upgrade -y && pkg install nodejs git nano -y`
2. Clone repo atau ekstrak ZIP, lalu masuk ke folder proyek.
3. Jalankan `npm install`.
4. Salin env: `cp .env.example .env`
5. Edit `.env` dengan `nano .env`, isi `GEMINI_API_KEY=API_KEY_MILIK_SENDIRI`. Jangan commit `.env`.
6. Jalankan `npm run check`.
7. Jalankan `npm start`.
8. Buka `http://127.0.0.1:3000`.

## Mendapatkan Gemini API key
1. Buka https://aistudio.google.com/ dan login Google.
2. Buat API key dari menu Get API key.
3. Simpan key hanya pada `.env` lokal atau Environment Variables Render.
4. Jangan mengirim key melalui chat atau memasukkannya ke frontend/GitHub.

Gemini API memiliki Free Tier untuk model tertentu, tetapi kuota, ketersediaan model, dan batas permintaan bisa berbeda menurut akun/region serta dapat berubah. Free Tier bukan penggunaan tanpa batas. Periksa https://ai.google.dev/gemini-api/docs/pricing dan https://ai.google.dev/gemini-api/docs/rate-limits. Data Free Tier dapat dipakai Google untuk peningkatan produk sesuai ketentuan mereka; jangan kirim data sensitif.

## Deploy ke Render
1. Upload isi folder proyek ke repository GitHub (jangan upload `.env` dan `node_modules`).
2. Di Render pilih New > Blueprint atau Web Service dan hubungkan repository.
3. Build command: `npm install`; Start command: `npm start`.
4. Tambahkan Environment Variable `GEMINI_API_KEY` dengan key dari AI Studio.
5. Pastikan `GEMINI_MODEL=gemini-2.5-flash-lite`, lalu deploy.
6. Buka URL HTTPS Render. Mikrofon browser memerlukan HTTPS atau localhost.

## Catatan suara
- Browser Speech Recognition tidak didukung merata di semua browser. Gunakan Chrome Android terbaru dan izinkan mikrofon.
- Suara perempuan tidak dijamin; aplikasi memilih voice Bahasa Indonesia yang tersedia, dengan fallback ke voice lain/default sistem. Tambahkan/aktifkan paket Text-to-Speech Bahasa Indonesia di pengaturan Android jika voice tidak muncul.
- Ini bukan audio realtime full-duplex: pola percakapan adalah dengar -> kirim teks ke Gemini -> baca jawaban. Tidak ada barge-in audio seperti Realtime WebRTC.
- Jika mikrofon gagal, chat teks tetap bisa dipakai.

## Endpoint
- `GET /health` — status server.
- `GET /api/health` — status API.
- `POST /api/chat` — body JSON `{ "message": "...", "history": [] }`.

## Pengujian
Jalankan `npm run check` untuk pemeriksaan sintaks. Uji integrasi Gemini memerlukan API key yang valid dan kuota Free Tier yang tersedia. Belum diklaim diuji pada perangkat Android fisik atau deployment Render.
