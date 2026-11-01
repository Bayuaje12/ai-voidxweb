import { Router } from 'express';

const router = Router();

const SYSTEM_INSTRUCTION = `Kamu adalah X-VOID, asisten virtual perempuan dengan kepribadian dingin, tegas, sarkastis, sedikit kasar, cerdas, spontan, dan humoris. Gunakan bahasa Indonesia sehari-hari dengan gue/lu secara natural. Boleh menyindir ringan dan bercanda, tetapi jangan merendahkan, mengancam, atau menghina secara berlebihan. Tetap akurat, jujur tentang kemampuan, dan membantu. Jawab ringkas kecuali diminta detail. Jangan mengaku melakukan tindakan yang belum dilakukan.`;

router.post('/', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'GEMINI_API_KEY belum dipasang. Tambahkan di file .env atau Environment Variables hosting.'
    });
  }

  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  if (message.length > 4000) return res.status(413).json({ error: 'Pesan terlalu panjang. Maksimal 4000 karakter.' });

  const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite').replace(/[^a-zA-Z0-9._-]/g, '');
  const incomingHistory = Array.isArray(req.body?.history) ? req.body.history.slice(-12) : [];
  const contents = [];

  for (const item of incomingHistory) {
    if (!item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string') continue;
    const text = item.text.trim().slice(0, 4000);
    if (text) contents.push({ role: item.role, parts: [{ text }] });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          contents,
          generationConfig: {
            temperature: 0.85,
            topP: 0.95,
            maxOutputTokens: 900
          }
        }),
        signal: AbortSignal.timeout(45000)
      }
    );

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const providerMessage = data?.error?.message || 'Gemini API menolak permintaan.';
      console.error('[Gemini API]', upstream.status, data?.error?.status || 'UNKNOWN');
      const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status;
      return res.status(status).json({
        error: upstream.status === 429
          ? 'Kuota Gemini sedang habis atau batas gratis tercapai. Coba lagi nanti atau periksa AI Studio.'
          : upstream.status === 400
            ? `Request Gemini tidak valid: ${providerMessage}`
            : upstream.status === 403
              ? 'Akses Gemini ditolak. Periksa API key dan ketersediaan Gemini API untuk project ini.'
              : 'Gemini sedang tidak bisa dihubungi. Coba lagi beberapa saat.'
      });
    }

    const reply = data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim();

    if (!reply) {
      return res.status(502).json({ error: 'Gemini tidak menghasilkan teks. Coba kirim ulang.' });
    }

    return res.json({ ok: true, reply, model });
  } catch (error) {
    console.error('[Gemini request failed]', error.name || 'Error');
    return res.status(502).json({
      error: error.name === 'TimeoutError'
        ? 'Gemini terlalu lama merespons. Coba lagi.'
        : 'Tidak dapat terhubung ke Gemini. Periksa internet server.'
    });
  }
});

export default router;