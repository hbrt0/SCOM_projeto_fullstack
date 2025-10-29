import rateLimit from 'express-rate-limit';

// Limiter específico para endpoint de login.
// Objetivo: mitigar ataques de força-bruta ao limitar tentativas de autenticação por IP.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // janela de 15 minutos
  max: 10,                  // máximo de 10 requisições permitidas por janela por IP
  standardHeaders: true,    // inclui cabeçalhos RateLimit-... padrão na resposta
  legacyHeaders: false,     // desativa cabeçalhos X-RateLimit-... legados
  message: { error: 'Muitas tentativas de login. Tente novamente em alguns minutos.' } // resposta quando excede
});

// Limiter geral para rotas da API.
// Objetivo: proteger a API contra abuso/DoS leve limitando taxa por IP.
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // janela de 1 minuto
  max: 120,                // máximo de 120 requisições por minuto por IP
  standardHeaders: true,
  legacyHeaders: false
});