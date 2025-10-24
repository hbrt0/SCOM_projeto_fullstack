import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import csrf from 'csurf';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import profileRoutes from './routes/profile.js';
import commentsRouter from './routes/comments.js';

dotenv.config();
const PgSession = pgSession(session);
export const app = express();

// Segurança
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "img-src": ["'self'", "data:", "https:", "http:"],
      "frame-src": ["'self'", "https://www.youtube.com"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Sessão em Postgres
app.use(session({
  store: new PgSession({ pool, tableName: 'session' }),
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

// CSRF — usaremos rota /api/auth/csrf para entregar o token
const csrfProtection = csrf();
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  return csrfProtection(req, res, next);
});

// Rate limit só na API
app.use('/api/', apiLimiter);

// Rotas API
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/comments', commentsRouter);

// Servir frontend estático
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.resolve(__dirname, '../../frontend')));

// 404 + erros
app.use(notFound);
app.use(errorHandler);
