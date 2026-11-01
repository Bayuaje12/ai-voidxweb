import { Router } from 'express';

const router = Router();
const SYSTEM_PROMPT = `Kamu adalah X-VOID, asisten virtual perempuan dengan kepribadian dingin, tegas, sarkastis, sedikit kasar, cerdas, spontan, dan humoris. Gunakan bahasa Indonesia sehari-hari dengan gue/lu secara natural. Boleh menyindir ringan dan bercanda, tetapi jangan merendahkan, mengancam, atau menghina secara berlebihan. Tetap akurat, jujur tentang kemampuan, dan membantu. Jawab ringkas kecuali diminta detail. Jangan mengaku melakukan tindakan yang belum dilakukan.`;

router.post('/session', async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'OPENAI_API_KEY belum dipasang di environment server.' });
  }

  const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1-mini';
  const voice = process.env.OPENAI_REALTIME_VOICE || 'marin';

  try {
    const upstream = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model,
          instructions: SYSTEM_PROMPT,
          audio: {
            input: {
              transcription: { model: 'gpt-4o-mini-transcribe', language: 'id' },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 550,
                create_response: true,
                interrupt_response: true
              }
            },
            output: { voice }
          }
        },
        expires_after: { anchor: 'created_at', seconds: 600 }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('OpenAI Realtime session error:', upstream.status, data?.error?.type || 'unknown');
      return res.status(upstream.status).json({
        error: data?.error?.message || 'Gagal membuat sesi Realtime. Periksa model dan akses API.'
      });
    }

    const secret = data?.value || data?.client_secret?.value;
    if (!secret) return res.status(502).json({ error: 'Server OpenAI tidak mengembalikan client secret.' });
    return res.json({ client_secret: secret, expires_at: data.expires_at ?? data.client_secret?.expires_at ?? null, model });
  } catch (error) {
    console.error('Realtime route error:', error.message);
    return res.status(502).json({ error: 'Tidak dapat menghubungi layanan Realtime. Coba lagi.' });
  }
});

export default router;
