# Relatório Técnico – Projeto SCOM (Dark Souls Wiki Seguro)

Este relatório documenta como o projeto atende aos requisitos definidos na disciplina de Segurança Computacional. Para cada item, descrevemos a implementação, arquivos envolvidos, decisões de tecnologia e evidências (testes ou procedimentos). Ao final, há um resumo do processo, dificuldades e uso eventual de IA ou referências externas.

---

## 1. Estrutura do Projeto (1 pt)

- **Separação front/back:** O repositório possui duas pastas principais: `backend/` (API Express, regras de negócio, testes) e `frontend/` (HTML/CSS/JS consumindo a API).  
- **Organização do backend:** Dentro de `backend/src/` o código segue uma estrutura modular que lembra o padrão MVC: `routes/` atuam como controllers; a camada de dados fica em `db.js` e as queries parametrizadas; validações e middlewares são desacoplados em `validators/` e `middleware/`; `app.js` integra tudo.  
- **Scripts SQL separados:** `backend/sql/schema.sql` contém o schema completo (tabelas `users`, `profiles`, `comments`, `session`), com índices e constraints, facilitando manutenção e reaplicação.  
- **Testes e utilitários:** `backend/__tests__/` guarda os testes automatizados, e `backend/sql/query_db.py` é um utilitário CLI para interagir com o banco.  
- **Frontend estático:** `frontend/` é servido pelo Express via `app.use(express.static(...))`. Cada página (wiki, artigo, login, admin) tem seus próprios arquivos e scripts (`main.js`, `admin.js`), mantendo a separação de responsabilidades.

**Conclusão:** Estrutura limpa, fácil de navegar, condizente com o que o trabalho solicitou.

---

## 2. Autenticação de Usuários (1 pt)

- **Sessões com `express-session`:** Configuradas em `backend/src/app.js` usando `connect-pg-simple` para armazenar sessões no PostgreSQL. Cookies HttpOnly e SameSite `lax` reduzem o risco de roubo via JavaScript.  
- **Fluxo de autenticação:** `backend/src/routes/auth.js` implementa registro (`/register`), login, logout e `GET /me` (retorna informações do usuário logado). Senhas recebem hash pelo `bcryptjs`.  
- **Níveis de acesso:** Middleware `requireAdmin` (`backend/src/middleware/auth.js`) garante que apenas admins acessem rotas críticas (`/api/users/*`). O campo `role` em `users` diferencia `user` de `admin`.  
- **Renovação de sessão:** No login, `req.session.regenerate` evita fixation.  
- **Testes:** O caso “Fluxo de registro -> login funciona” em `security.test.js` verifica na prática a criação de conta e autenticação com sessão ativa.

**Conclusão:** Autenticação baseada em sessão, com distinção clara de papéis e boas práticas de segurança.

---

## 3. Cadastro de Usuários e Validação de Dados (1 pt)

- **Validação no front:** Formulários em `frontend/login.html` usam atributos HTML5 (`required`, `minlength`, `pattern`), e `login_style.css`/scripts exibem mensagens imediatas.  
- **Validação no back:** `express-validator` garante comprimento, formato e sanitização (`backend/src/validators/authValidators.js` e `userValidators.js`). Exemplo: usernames só aceitam `[A-Za-z0-9_]`, senhas ≥ 8 caracteres, emails normalizados.  
- **Sanitização:** Strings maliciosas com `<script>` são rejeitadas antes de chegar ao banco (teste “Cadastro com entrada maliciosa é sanitizado/validado”).  
- **Respostas claras:** Retornos 400, 409, 401 sempre trazem mensagens em português úteis para o usuário.

**Conclusão:** Validação em duas camadas atende ao requisito e previne entradas maliciosas.

---

## 4. Funcionalidades de Administração (1 pt)

- **Interface dedicada:** `frontend/admin.html` + `admin.js` exibem usuários paginados, filtros e modal para criação/edição.  
- **Operações disponíveis:** Criar (`POST /api/users`), editar (`PUT /api/users/:id`) e excluir (`DELETE /api/users/:id`). O backend bloqueia autoexclusão e alteração da própria role.  
- **CSRF ativo:** Cada ação pega o token via `/api/auth/csrf` e envia no cabeçalho `x-csrf-token`.  
- **Feedback visual:** Mensagens de sucesso/erro são mostradas na tela (veja `#feedback`, `#modal-error`).  
- **Testes humanos:** Basta promover um usuário a admin e acessar `/admin.html`; toda a navegação é self-explanatory.

**Conclusão:** Painel amigável e protegido, atende ao CRUD exigido.

---

## 5. Segurança e HTTPS (1 pt)

- **HTTPS configurável:** `backend/.env` permite ativar HTTPS com certificados locais (`backend/certs/`). `server.js` lê `HTTPS_ENABLED` para decidir se sobe HTTP ou HTTPS.  
- **Cabeçalhos de segurança:** `helmet` define CSP (permitindo YouTube, Google Fonts), X-Frame-Options, etc.  
- **CSRF:** Middleware `csurf` protege todas as rotas. O front consome `/api/auth/csrf` antes de POST/PUT/DELETE. Teste 1 garante falha sem token.  
- **SQL Injection:** Todas as queries usam parâmetros (`$1`, `$2`). Teste 4 tenta `' OR '1'='1` e recebe 401, provando a proteção.  
- **XSS/entrada inválida:** Validador expressa erros e impede scripts; front renderiza dados via `textContent`.  
- **Rate limit:** `express-rate-limit` limita logins (teste 5) e API em geral.  
- **Logs e tratamento de erro:** `morgan` + `winston` registram requisições/erros; `errorHandler` impede exposição de stack trace.

**Conclusão:** Conjunto robusto de defesas, incluindo HTTPS opcional e testes que confirmam seu funcionamento.

---

## 6. Banco de Dados Relacional (1 pt)

- **PostgreSQL:** Utilizado com schema relacional (`backend/sql/schema.sql`).  
- **Tabelas:** `users` (UUID, username/email únicos, role), `profiles` (1:1 com users, `ON DELETE CASCADE`), `"session"` (para express-session), `comments` (armazenam posts por slug).  
- **Índices/constraints:** Protetores de integridade (UNIQUE, CHECK de role, índices em username/email).  
- **Scripts reproduzíveis:** `schema.sql` reaplica toda a estrutura; utilitário Python ajuda em consultas rápidas.  
- **Execução documentada:** README explica a sequência (`psql -U postgres -d scomdb -f backend/sql/schema.sql`).

**Conclusão:** Banco relacional consistente com constraints adequadas.

---

## 7. Rotinas de Back-End e Performance (1 pt)

- **Consultas eficientes:** Todas as queries são parametrizadas e usam índices (ex.: `SELECT ... ORDER BY created_at LIMIT 200`).  
- **Transações:** Rotas admin (`POST/PUT`) usam `client.query('BEGIN')`/`COMMIT`/`ROLLBACK` para garantir ACID.  
- **Rate limit + payload limit:** Evitam abuso. `express.json({limit:'100kb'})` protege contra corpo exagerado.  
- **Logs e monitoramento:** `winston` registra erros do pool (`db.js`), `morgan` loga acessos.  
- **Tratamento central:** `errorHandler` responde com mensagens padrão e status corretos.  
- **Comentários:** Uso de prepared statements também evita stress no banco (hash de IP, slug indexado).

**Conclusão:** Backend preparado para carga moderada e resiliente a falhas/abusos simples.

---

## 8. Feedback ao Usuário (1 pt)

- **Front-end:** `login.html`, `admin.html` e formulários exibem mensagens de erro/sucesso (`#login-error`, `#register-error`, `#feedback`).  
- **Backend:** Respostas JSON claras (`{error:'...'}`, `{message:'...'}`) em português.  
- **Acessibilidade:** Elementos com `aria-live`, mensagens visíveis em casos de erro (ex.: `comment-auth-hint`).  
- **Fluxos:** Formulários avisam sobre form inputs faltantes ou inválidos. No admin, botões desativam e mostram tooltips (ex.: “Você não pode excluir a própria conta”).

**Conclusão:** Usuário sempre sabe o que aconteceu após cada ação.

---

## 9. Testes de Segurança com Código (1 pt)

Arquivo `backend/__tests__/security.test.js` cobre cinco cenários críticos (rodar com `npm --prefix backend test`):

1. **CSRF obrigatório:** POST sem token → 403.  
2. **Sanitização:** Cadastro com `<script>`/email inválido/senha curta → 400 + erros.  
3. **Fluxo registro/login:** Usuário exclusivo cadastrado e autenticado (201/200).  
4. **SQL injection:** Payload `' OR '1'='1` → 401 com mensagem “Credenciais inválidas”.  
5. **Rate limit:** Após N tentativas falhas, servidor devolve 429 “Muitas tentativas...”.  

Esses testes usam Supertest para simular requisições reais e encerram conexões com `pool.end()`.

**Conclusão:** Requisito atendido com automação (não apenas testes manuais).

---

## 10. Documentação do Código (1 pt)

- **README (este repositório)** agora serve como guia de execução: pré-requisitos, instalação, configuração do banco, comandos e troubleshooting.  
- **RELATÓRIO (este arquivo)** explica cada requisito com referência direta aos arquivos.  
- **Comentários no código:** Pontuais em pontos críticos (ex.: rotas, middlewares, validators); preferimos funções nomeadas claras ao invés de comentários redundantes.  
- **Scripts auxiliares:** `query_db.py` contém docstrings simples e argumentos autodocumentados via `argparse`.  
- **Testes:** Possuem nomes descritivos que explicam a intenção do cenário.

**Conclusão:** Documentação suficiente para qualquer colega executar e entender o projeto.

---

## Uso de IA e Fontes Externas

- Algumas descrições e ajustes foram revisados com apoio de IA (ChatGPT) ao longo do desenvolvimento, sempre validados e adaptados ao contexto do trabalho.  
- Referências externas incluíram documentação oficial de Express, express-session, csurf, express-validator e PostgreSQL (links citados no README e no próprio código). Nenhum trecho foi copiado integralmente sem adaptação.

---

## Dificuldades e Decisões

- **Sessão vs JWT:** optamos por sessão + CSRF para simplificar o cumprimento dos requisitos de segurança (evita expor tokens no cliente).  
- **HTTPS local:** geração de certificados autoassinados exige passos extras em Windows; deixamos o processo documentado e opcional.  
- **Testes Jest + ESM:** Foi necessário habilitar `--experimental-vm-modules` para suportar `import/export`. Documentamos o comando no `package.json`.  
- **Banco local vs Docker:** inicialmente o projeto oferecia Docker Compose para subir o Postgres. Como o ambiente final usa uma instância local, atualizamos README/RELATÓRIO para refletir essa configuração.

---

## Conclusão

O projeto cumpre todos os requisitos do trabalho: possui front-end e back-end bem separados, autenticação segura com sessão, validação forte, administração completa, HTTPS configurável, defesas contra ataques (CSRF, SQL injection, força bruta), testes automatizados e documentação alinhada para execução/apresentação. Tudo isso sobre a temática Dark Souls, tornando a demonstração envolvente e didática. Pronto para receber o tão aguardado “Praise the Sun”! ☀️
