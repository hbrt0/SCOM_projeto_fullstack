# RELATÓRIO — Projeto SCOM (Parte 2)

## 1. Estrutura do Projeto (1 pt)
- **Front‑end** e **Back‑end** separados.
- Padrão estrutural inspirado em **MVC**: rotas (controllers), validações (rules), acesso a dados (`db.js`), middlewares e camada de visualização no front.

## 2. Autenticação (1 pt)
- **Sessões** com `express-session` + `connect-pg-simple` (cookie **HttpOnly**).
- Níveis de acesso: `user` e `admin` (middleware `requireAdmin`).

## 3. Cadastro & Validação (1 pt)
- Front‑end: HTML5 (`required`, `pattern`, `minlength`) e mensagens de erro.
- Back‑end: `express-validator` valida e sanitiza campos; erros agregados retornam em JSON.

## 4. Admin — CRUD de Perfis/Usuários (1 pt)
- Interface `admin.html` lista paginado, **cria**, **edita** e **exclui** usuários.
- Operações somente para **admin** (403 para demais).

## 5. Segurança & HTTPS (1 pt)
- **HTTPS** suportado no `server.js` (chaves locais ou produção).
- **CSRF** (`csurf`), **CSP e cabeçalhos** (`helmet`), **rate limiting** e **bcrypt**.
- Prepared statements (parametrização) eliminam **SQL Injection**.
- Escapamos HTML no front para evitar **XSS** ao renderizar dados dinâmicos.
- Cookie `HttpOnly` impede acesso JS ao identificador de sessão.

## 6. Banco Relacional (1 pt)
- **PostgreSQL** com tabelas `users`, `profiles` (1:1) e `session`.
- Constraints: `UNIQUE username/email`, `CHECK role`, FK, índices.

## 7. Back‑end & Performance (1 pt)
- **Paginação** em listagem de usuários; **índices** em colunas de busca.
- **Logs** e **tratamento central de erros**; **limite de payload**.
- Transações em operações de admin (`BEGIN/COMMIT/ROLLBACK`).

## 8. Feedback ao Usuário (1 pt)
- Mensagens claras de erro/sucesso no front (`.form-error`, `#feedback`).
- Códigos HTTP consistentes (400, 401, 403, 404, 409).

## 9. Testes de Segurança (1 pt)
- `tests/security.test.js` cobre:
  - **CSRF**: bloqueia mutações sem token.
  - **Validação**: rejeita e‑mails inválidos e XSS em `username`.
  - **Fluxo básico**: cadastro e login com sessão.
- (Sugerido) rodar manualmente tentativa de brute force e observar rate limit.

## 10. Documentação do Código (1 pt)
- Comentários explicativos nos **middlewares**, **rotas** e **validators**.
- README com passos de execução, HTTPS e racional de segurança.

## Uso de IA e fontes de terceiros
- Partes do código e documentação foram geradas com auxílio de **IA generativa**. Todo o código foi **contextualizado** para cumprir os requisitos de SCOM, incluindo camadas, middleware de segurança, validação e integração front‑back.
- Bibliotecas utilizadas e doc. oficial: `express`, `pg`, `express-session`, `connect-pg-simple`, `csurf`, `helmet`, `express-validator`, `express-rate-limit`, `bcryptjs` (vide `package.json`).

## Dificuldades e decisões
- Opção por **sessão + CSRF** em vez de JWT: facilita proteção **CSRF** e mantém token fora do `localStorage`.
- **CSP** precisa permitir YouTube e fontes Google usados no site.
- Admin UI simples e responsiva reaproveitando o tema existente.
