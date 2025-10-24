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
