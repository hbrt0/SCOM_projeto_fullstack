-- Habilita extensão UUID (em Postgres)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(32) NOT NULL UNIQUE,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Perfil (1-para-1 com users)
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(120),
  bio TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Tabela de sessões (para connect-pg-simple)
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Use UMA das extensões abaixo (a que seu servidor permitir):
-- Tente primeiro uuid-ossp:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Se não puder, use pgcrypto:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Com uuid-ossp:
CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_slug  TEXT NOT NULL,
  author     TEXT NOT NULL CHECK (length(author) BETWEEN 1 AND 50),
  message    TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash    TEXT
);
CREATE INDEX IF NOT EXISTS idx_comments_page_created ON comments(page_slug, created_at DESC);

/* --- ALTERNATIVA se você usou pgcrypto:
CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug  TEXT NOT NULL,
  author     TEXT NOT NULL CHECK (length(author) BETWEEN 1 AND 50),
  message    TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash    TEXT
);
CREATE INDEX IF NOT EXISTS idx_comments_page_created ON comments(page_slug, created_at DESC);
*/
