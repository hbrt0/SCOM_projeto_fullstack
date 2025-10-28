# Dark Souls Wiki – Projeto SCOM (Resumo para Humanos)

Este trabalho mostra como construir um site completo ― com páginas bonitas, login, área de administração e cuidados de segurança ― usando a temática Dark Souls. A ideia é provar que estamos aplicando, na prática, tudo o que a disciplina de Segurança Computacional pede.

---

## 1. O que vem no pacote

- **Front-end (`frontend/`)**: páginas HTML/CSS/JS que o usuário final enxerga. Há a wiki (`dark_wiki.html`, `gwyn.html`), a tela de login/cadastro e o painel de administração.
- **Back-end (`backend/`)**: servidor Node.js/Express que guarda usuários, controla sessões, valida dados, conversa com o banco e entrega o frontend pronto.
- **Banco de dados (PostgreSQL)**: usado para guardar tudo com segurança (usuários, perfis, comentários e sessões).
- **Testes automatizados (`backend/__tests__/`)**: scripts que simulam ataques comuns para garantir que as defesas realmente funcionam.
- **Relatório (`RELATORIO.md`)**: documento que amarra cada requisito do trabalho às soluções colocadas no código.

---

## 2. Como o site trabalha por dentro

1. **Usuário acessa a wiki** → O navegador baixa os arquivos estáticos (`frontend/`) servidos pelo Express.
2. **Login/Cadastro** → O formulário chama as rotas `/api/auth/*`. O back-end confere os dados, cria a sessão no banco e envia um cookie seguro para o navegador.
3. **Sessão ativa** → O front usa `/api/auth/me` para descobrir quem está logado (e se é admin). Com isso ele mostra “Olá, usuário”, botão de logout e, se for caso, link para o painel admin.
4. **Administração** → As telas `admin.html` + `admin.js` chamam `/api/users`, permitindo criar, editar ou remover usuários com segurança.
5. **Comentários** → `main.js` carrega os comentários do artigo e deixa o formulário pronto. Só quem está logado pode comentar, e apenas admins enxergam o botão “Excluir”.
6. **Segurança** → Cada pedido que altera dados exige token CSRF válido, passa por validação de entrada e respeita limites de tentativas. Se algo der errado, o servidor responde com mensagens claras.

---

## 3. Tecnologias (e por que escolhidas)

- **Node.js + Express** – rápida configuração para APIs, grande ecossistema de middlewares (autenticação, segurança, logs).
- **express-session + connect-pg-simple** – mantém o usuário logado com cookie HttpOnly e armazena a sessão no Postgres, evitando tokens expostos no navegador.
- **PostgreSQL** – banco relacional que permite criar restrições, índices e relacionamentos (ideal para mostrar boas práticas que a disciplina exige).
- **helmet** – adiciona cabeçalhos de segurança automaticamente (CSP, proteção contra clickjacking, etc.).
- **csurf** – protege contra CSRF; o front busca o token em `/api/auth/csrf` sempre que precisa alterar algo.
- **express-validator** – valida e sanitiza dados ainda no servidor (tamanho, formato, remoção de scripts).
- **bcryptjs** – faz o hashing das senhas para que nada fique salvo em texto claro.
- **express-rate-limit** – limita tentativas de login e abuso da API.
- **Supertest + Jest** – permitem simular chamadas reais ao servidor e escrever testes que provam a segurança do sistema.
- **HTML/CSS/JS “puro”** – deixa o front leve, sem depender de frameworks pesados, e facilita a revisão pelo professor.
- **Python (`query_db.py`)** – script auxiliar opcional para listar usuários, promover admin, etc., diretamente no banco (útil para a apresentação).

---

## 4. Estrutura explicada arquivo a arquivo

### 4.1 Backend

- `package.json` – descreve dependências e scripts (`npm run dev`, `npm start`, `npm test`).
- `.env.example` / `.env` – guarda configurações sensíveis (porta, conexão com Postgres, segredo de sessão, caminhos dos certificados HTTPS).
- `src/server.js` – inicia o servidor HTTP ou HTTPS e registra logs.
- `src/app.js` – coração do Express: aplica Helmet, sessions, CSRF, limitador, rotas e serve o front-end.
- `src/db.js` – cria o pool de conexões com o Postgres.
- `src/logger.js` – configura o Winston para logar com timestamp.
- `src/middleware/` – autenticação (garante admin/usuário), rate limit e tratamento de erros.
- `src/validators/` – regras do `express-validator` para cadastro/login e rotinas de admin.
- `src/routes/` – todas as rotas da API:
  - `auth.js` – cadastro, login, logout, “quem sou eu”, entrega CSRF.
  - `users.js` – operações para administrador (listar, criar, atualizar, remover).
  - `profile.js` – leitura/edição do perfil do usuário logado.
  - `comments.js` – listar, criar e excluir comentários (exclusão só por admin).
- `sql/init/*.sql` – scripts executados automaticamente pelo Docker para criar tabelas e índices; incluem `users`, `profiles`, `comments` e `session`.
- `sql/schema.sql` – referência do schema completa.
- `sql/query_db.py` – ferramenta de linha de comando para tarefas rápidas no banco (listar usuários, promover, etc.).
- `__tests__/security.test.js` – suíte Jest com cinco testes: CSRF obrigatório, validação contra scripts, fluxo login/cadastro, tentativa de SQL injection e rate limit contra força bruta.

### 4.2 Frontend

- `fashion_wiki.css` – estilos gerais: cores (tema claro/escuro), grid, header, cards, formulários, botões e comentários.
- `main.js` – lógica compartilhada pelas páginas principais:
  - troca de tema com armazenamento no navegador;
  - controle do botão de logout e link “admin” quando o usuário é administrador;
  - ajuste de fonte e música;
  - módulo de comentários com carregamento e exclusão para admins.
- `dark_wiki.html` – home da wiki, com menus, destaques e comentários.
- `gwyn.html` + `gwyn.css` – página temática do chefe Gwyn, com layout de artigo.
- `login.html` + `login_style.css` – tela com abas para login/cadastro, validação visual e envio via Fetch API.
- `admin.html` + `admin.js` – painel com listagem paginada de usuários, busca, modal de criação/edição e exclusão controlada.
- `img/` e `audio/` – arquivos visuais e trilhas sonoras usados no layout.

---

## 5. Como rodar sem stress

1. **Pré-requisitos**  
   - Node.js 18 ou superior.  
   - PostgreSQL (local ou via Docker). Há um `docker-compose.yml` pronto:
     ```bash
     docker compose up -d
     ```
2. **Configuração**  
   ```bash
   cp backend/.env.example backend/.env   # ajuste os valores conforme sua máquina
   npm --prefix backend install           # instala dependências do servidor
   ```
3. **Rodando o servidor**  
   ```bash
   npm --prefix backend run dev   # desenvolvimento (hot reload)
   # ou
   npm --prefix backend start     # execução simples
   ```
   O site ficará em `http://localhost:3000`. Para usar HTTPS, gere certificados (`mkcert`, `openssl`, etc.), coloque em `backend/certs/` e marque `HTTPS_ENABLED=true` no `.env`.
4. **Testes de segurança**  
   ```bash
   npm --prefix backend test
   ```
   O comando roda o Jest e exibe as proteções funcionando na prática (saídas 403, 401 e 429 conforme esperado).
5. **Promover um admin rapidamente**  
   ```bash
   python backend/sql/query_db.py promote-admin nomeDoUsuario
   ```
   …ou rodar o `UPDATE users SET role='admin' WHERE username='...'` direto no banco.

---

## 6. Por que o projeto é seguro (explicação simples)

- **Senhas protegidas**: antes de ir para o banco, a senha passa por hashing com bcrypt. Mesmo que o banco vazasse, ninguém veria a senha real.
- **Sessão guardada no servidor**: o navegador recebe apenas um cookie “abre portas” que é HttpOnly (JavaScript não toca). Isso evita roubo simples de sessão.
- **Token CSRF obrigatório**: toda ação que altera dados precisa enviar um token secreto gerado pelo servidor. Se algum site malicioso tentar enviar uma requisição por você, ela falha.
- **Validação dupla**: os formulários front-end já restringem entradas, mas o back-end confere tudo de novo e sanitiza, impedindo scripts maliciosos.
- **Consultas ao banco com parâmetros**: não existe montagem de SQL por string concatenada; o Postgres recebe os valores de forma segura, matando SQL injection.
- **Rate limit**: o servidor observa repetidas tentativas de login e fecha a porta (status 429) se alguém insistir demais, evitando ataques de força bruta.
- **Cabeçalhos certos**: o Helmet liga proteções nativas do navegador (CSP, X-Frame-Options, etc.).
- **Erros controlados**: se algo sai errado, o usuário recebe uma mensagem amigável e sem detalhes técnicos; o log interno registra o que aconteceu para o time corrigir depois.
- **Testes automatizados**: há testes que simulam todas essas situações, provando que as defesas respondem exatamente como planejado (e continuaremos rodando-os sempre que algo mudar).  

---

## 7. Dicas para apresentação

1. **Demonstre a navegação** – mostre o tema escuro/claro, ajuste de fonte, comentários e trilha sonora.
2. **Login e painel admin** – crie um usuário, promova a admin e use a tela para editar e excluir, citando o uso de CSRF e rate limit.
3. **Comente sobre as medidas de segurança** – explique em linguagem simples as oito bullet points acima.
4. **Mostre os testes** – execute `npm --prefix backend test` durante a apresentação; o terminal exibe cada verificação (CSRF, sanitização, SQL injection bloqueado, etc.).
5. **Mencione o HTTPS** – explique como gerar os certificados e mostre que o servidor aceita conexão segura (mesmo que o navegador avise que é autoassinado).  

