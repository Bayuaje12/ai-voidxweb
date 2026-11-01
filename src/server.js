import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chatRouter from './routes/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(value => value.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", 'https://generativelanguage.googleapis.com'],
      mediaSrc: ["'self'", 'blob:'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  }
}));

if (allowedOrigins.length) {
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
      return callback(new Error('Origin tidak diizinkan oleh CORS.'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
  }));
}

app.use(express.json({ limit: '32kb' }));
app.use('/api/', rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Terlalu banyak request. Tunggu sebentar.' }
}));

app.get('/health', (_req, res) => res.json({
  ok: true,
  app: 'X-VOID AI',
  status: 'online',
  engine: 'Gemini',
  timestamp: new Date().toISOString()
}));
app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'X-VOID AI', status: 'online', engine: 'Gemini' }));

app.use('/api/chat', chatRouter);
app.use(express.static(path.join(root, 'public'), { extensions: ['html'] }));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(root, 'public', 'index.html'));
});

app.use((req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

app.use((err, _req, res, _next) => {
  console.error('[X-VOID SERVER]', err.message);
  if (res.headersSent) return;
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Terjadi kesalahan pada server.' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log('================================');
  console.log('       X-VOID AI / GEMINI');
  console.log('================================');
  console.log(`Status   : ONLINE`);
  console.log(`Port     : ${port}`);
  console.log(`Engine   : Gemini`);
  console.log(`API Key  : ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
  console.log(`Health   : http://localhost:${port}/health`);
  console.log('================================');
});

function shutdown(signal) {
  console.log(`[X-VOID] ${signal} diterima.`);
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
