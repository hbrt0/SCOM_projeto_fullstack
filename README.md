# SCOM • Dark Souls Wiki — Full‑Stack Seguro

Backend em Node.js/Express com autenticação **baseada em sessão** + CSRF; PostgreSQL relacional; rotas de **admin** (CRUD de usuários) e **perfil**; front‑end integrado e validado.

## Rodando localmente

### 1) Pré‑requisitos
- Node.js 18+ e npm
- Docker (opcional, para subir PostgreSQL rapidamente)

### 2) Banco de dados
Suba o Postgres com Docker:

```bash
docker compose up -d
```

Isso cria um Postgres com DB `scomdb` e aplica `backend/sql/init/01_schema.sql` automaticamente.

> Se preferir seu próprio Postgres, aponte `DATABASE_URL` no `.env` e rode o schema:
>
> ```bash
> psql $DATABASE_URL -f backend/sql/01_schema.sql
> ```

### 3) Backend
```bash
cp .env.example .env
npm --prefix backend i
npm --prefix backend run dev
```

Servidor em `http://localhost:3000`.

### 4) HTTPS opcional (requisito do trabalho)
Gere certificados locais (ex.: `mkcert` ou `openssl`) e habilite no `.env`:

```
HTTPS_ENABLED=true
HTTPS_KEY=./certs/key.pem
HTTPS_CERT=./certs/cert.pem
```

Crie a pasta `backend/certs` e coloque os arquivos. Reinicie o servidor.

### 5) Front‑end
Coloque seus arquivos HTML/CSS/JS em `frontend/` (já existem modelos). O Express serve essa pasta estaticamente.

### 6) Criar usuário admin
Crie uma conta via **Cadastro** e depois promova no DB:

```sql
UPDATE users SET role='admin' WHERE username='seuUsuario';
```

Depois acesse `admin.html` para gerenciar usuários.

## Estrutura

```
backend/
  src/
    app.js            # app Express + middlewares de segurança
    server.js         # HTTP/HTTPS
    db.js, logger.js
    middleware/       # requireAuth, requireAdmin, rate limit, errors
    routes/           # auth, users (admin), profile
    validators/       # express-validator rules
  sql/
    schema.sql        # tabelas + constraints
frontend/
  login.html          # login/cadastro chamando a API
  admin.html/.js      # interface admin para CRUD de usuários
  main.js             # integra com sessão do backend
tests/
  security.test.js    # testes de CSRF, validação, fluxo básico
```

## Segurança implementada (overview)
- **Sessão + cookie HttpOnly** (protege o token contra JS).
- **CSRF tokens** para mutações (`/api/auth/csrf` fornece o token).
- **Validação e sanitização** no front e **no back** (express-validator).
- **Senhas com bcrypt** e **prepared statements** (pg) -> sem SQL injection.
- **Helmet** (CSP, X-Frame, X-Content-Type, etc.).
- **Rate limiting**: tentativas de login (brute force) e para toda API.
- **Limite de payload (100kb)** e feedback claro de erros.
- **Logs** (Winston + morgan), **tratamento central de erros**.
- **Paginação** no admin.
- **Constraints** no banco (UNIQUE, CHECK, FK).

## Scripts
- `npm --prefix backend run dev` – hot reload
- `npm test` – roda testes (ajuste banco e .env para ambiente de teste)
