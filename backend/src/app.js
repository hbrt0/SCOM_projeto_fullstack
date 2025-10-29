import express from 'express';                 //framework HTTP
import session from 'express-session';         //gerenciamento de sessão
import pgSession from 'connect-pg-simple';     //store de sessões no Postgres
import dotenv from 'dotenv';                   //carrega .env para process.env
import helmet from 'helmet';                   //cabeçalhos de segurança HTTP
import morgan from 'morgan';                   //logger de requisições HTTP
import csrf from 'csurf';                      //proteção CSRF
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';                //pool de conexões com Postgres
import { apiLimiter } from './middleware/rateLimit.js'; //middleware de rate limiting
import { notFound, errorHandler } from './middleware/errors.js'; //middlewares de erro
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import profileRoutes from './routes/profile.js';
import commentsRouter from './routes/comments.js';

dotenv.config();                                //carrega variáveis do arquivo .env
const PgSession = pgSession(session);           //inicializa o adaptador de sessão
export const app = express();                   //instância do Express usada pelo server

//Segurança: configurações do helmet para reforçar cabeçalhos HTTP
//- contentSecurityPolicy reduz risco de XSS/controla fontes de scripts/estilos/imagens
//- crossOriginEmbedderPolicy desabilitado para compatibilidade com alguns recursos estáticos
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      //permite carregar imagens do mesmo host, data URI e fontes externas (CDNs)
      "img-src": ["'self'", "data:", "https:", "http:"],
      //permite iframes apenas do mesmo host e YouTube
      "frame-src": ["'self'", "https://www.youtube.com"],
      //scripts apenas do mesmo host; 'unsafe-inline' está presente por compatibilidade (evitar quando possível)
      "script-src": ["'self'", "'unsafe-inline'"],
      //estilos permitidos do mesmo host, inline (por compatibilidade) e Google Fonts
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      //fontes permitidas do mesmo host, Google Fonts e data URI
      "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    }
  },
  crossOriginEmbedderPolicy: false
}));

//Parsers: aceita JSON e dados de formulário x-www-form-urlencoded
//limit evita payloads muito grandes
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));

//Logger de requisições em modo 'dev' (morgan)
app.use(morgan('dev'));

//Configuração de sessão, armazenada em Postgres via connect-pg-simple
//- store: utiliza pool do Postgres e tabela 'session'
//- name: nome do cookie de sessão
//- secret: chave para assinar o cookie (usar variável de ambiente na produção)
//- resave/saveUninitialized: padrões seguros para evitar regravações desnecessárias
//- cookie: httpOnly impede acesso via JS, sameSite ajuda contra CSRF, secure deve ser true em HTTPS
app.use(session({
  store: new PgSession({ pool, tableName: 'session' }),
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: false }
}));

//CSRF protection: cria middleware de proteção e aplica nas requisições
//Nota: rota /api/auth/csrf é usada para entregar o token ao cliente
const csrfProtection = csrf();
app.use((req, res, next) => {
  //aqui o código chama o csrfProtection para todas as rotas;
  //a distinção por método foi mantida (GET/HEAD/OPTIONS) — middleware lançará token para GETs
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return csrfProtection(req, res, next);
  }
  return csrfProtection(req, res, next);
});

//Aplica rate limiter apenas nas rotas que começam com /api/
app.use('/api/', apiLimiter);

//Monta rotas da API: autenticação, usuários, perfil e comentários
//Cada rota é responsável por validação/autorização e lógica específica
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/comments', commentsRouter);

//Servir arquivos estáticos do frontend (produção/local)
//resolve o caminho relativo entre backend/src e frontend build/output
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.resolve(__dirname, '../../frontend')));

//Middlewares finais: tratamento de 404 e middleware centralizado de erros
//-> notFound: responde 404 para rotas não encontradas
//-> errorHandler: captura erros lançados e retorna respostas consistentes (logs, status, mensagem)
app.use(notFound);
app.use(errorHandler);
