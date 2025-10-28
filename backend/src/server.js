// Importa módulo de filesystem para ler arquivos (usado para certificados TLS)
import fs from 'fs';
// Importa módulo HTTP nativo do Node.js para criar servidor não seguro
import http from 'http';
// Importa módulo HTTPS nativo do Node.js para criar servidor seguro (TLS)
import https from 'https';
// Carrega variáveis de ambiente a partir de um arquivo .env
import dotenv from 'dotenv';
// Importa a instância do app (por exemplo um express app) que trata as rotas/requests
import { app } from './app.js';
// Importa um logger (pode ser winston/pino/etc.) para registrar mensagens de startup/erro
import logger from './logger.js';

// Carrega as variáveis definidas no arquivo .env para process.env
dotenv.config();
// Define a porta: usa PORT do .env ou padrão 3000
const PORT = process.env.PORT || 3000;

// Se a variável de ambiente HTTPS_ENABLED for 'true', inicia um servidor HTTPS
if (process.env.HTTPS_ENABLED === 'true') {
  // Lê a chave privada e o certificado a partir dos caminhos definidos nas variáveis de ambiente
  // Obs: readFileSync lança erro se o arquivo não existir ou permissões estiverem incorretas
  const key = fs.readFileSync(process.env.HTTPS_KEY);
  const cert = fs.readFileSync(process.env.HTTPS_CERT);

  // Cria o servidor HTTPS passando key/cert e a aplicação (app) que processa as requisições
  https.createServer({ key, cert }, app).listen(PORT, () => {
    // Registra que o servidor HTTPS iniciou e informa a URL local
    logger.info(`HTTPS server rodando em https://localhost:${PORT}`);
  });
// Caso contrário, inicia um servidor HTTP simples
} else {
  // Cria o servidor HTTP com a mesma app e escuta na porta configurada
  http.createServer(app).listen(PORT, () => {
    // Registra que o servidor HTTP iniciou e informa a URL local
    logger.info(`HTTP server rodando em http://localhost:${PORT}`);
  });
}
