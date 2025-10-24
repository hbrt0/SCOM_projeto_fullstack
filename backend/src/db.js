import pkg from 'pg';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('error', (err) => {
  logger.error('Erro inesperado no pool do Postgres: ' + err.message);
});

export async function query(text, params) {
  return pool.query(text, params);
}
