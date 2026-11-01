import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import realtimeRouter from './routes/realtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const app = express();
const port = Number(process.env.PORT || 3000);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://api.openai.com', 'https://*.openai.com'],
      mediaSrc: ["'self'", 'blob:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin tidak diizinkan oleh CORS.'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '12kb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Terlalu banyak request. Tunggu sebentar.' } }));

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'X-VOID AI', status: 'online' }));
app.use('/api/realtime', realtimeRouter);
app.use(express.static(path.join(root, 'public'), { extensions: ['html'] }));
app.get('*', (_req, res) => res.sendFile(path.join(root, 'public', 'index.html')));

app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(port, '0.0.0.0', () => console.log(`X-VOID AI running on port ${port}`));
