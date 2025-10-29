import winston from 'winston';

// Cria uma instância do logger usando Winston.
// - level: nível mínimo de logs que serão emitidos (info, warn, error, debug, etc.)
// - format: combina um timestamp e uma função printf para serializar a mensagem de log
// - transports: destinos onde os logs serão enviados (aqui, apenas o console)
const logger = winston.createLogger({
  level: 'info', // nível padrão; pode ser sobrescrito por configuração de ambiente
  format: winston.format.combine(
    // Adiciona um timestamp ISO em cada entrada de log
    winston.format.timestamp(),
    // Formata a saída em uma string legível: "<timestamp> [<level>] <message>"
    winston.format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    // Transport padrão que envia logs para stdout/stderr
    new winston.transports.Console()
  ],
});

// Exporta o logger para ser usado em outros módulos (ex.: logger.info(...), logger.error(...))
export default logger;
