// Importa o pacote 'pg' (driver do Postgres), dotenv para carregar variáveis de ambiente
// e um logger local para registrar erros.
import pkg from 'pg';
import dotenv from 'dotenv';
import logger from './logger.js';

// Carrega variáveis do arquivo .env para process.env
dotenv.config();

// Extrai Pool do pacote 'pg' para criar um pool de conexões reutilizável
const { Pool } = pkg;

// Cria e exporta um pool de conexões com a string de conexão definida em DATABASE_URL.
// O Pool gerencia conexões para melhorar performance e evitar abrir/fechar conexões a cada query.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Tratador global de erros do pool: registra erros inesperados (ex.: perda de conexão).
// É importante para evitar que erros silenciosos deixem a aplicação em estado inconsistente.
pool.on('error', (err) => {
  logger.error('Erro inesperado no pool do Postgres: ' + err.message);
});

// Função utilitária que delega chamadas ao pool.query.
// Facilita uso em outros módulos (import { query } from './db.js') e permite
// centralizar comportamento futuro (logs, métricas, retries, etc.).
export async function query(text, params) {
  return pool.query(text, params);
}
