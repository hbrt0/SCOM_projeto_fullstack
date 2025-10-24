import fs from 'fs';
import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import { app } from './app.js';
import logger from './logger.js';

dotenv.config();
const PORT = process.env.PORT || 3000;

if (process.env.HTTPS_ENABLED === 'true') {
  const key = fs.readFileSync(process.env.HTTPS_KEY);
  const cert = fs.readFileSync(process.env.HTTPS_CERT);
  https.createServer({ key, cert }, app).listen(PORT, () => {
    logger.info(`HTTPS server rodando em https://localhost:${PORT}`);
  });
} else {
  http.createServer(app).listen(PORT, () => {
    logger.info(`HTTP server rodando em http://localhost:${PORT}`);
  });
}
