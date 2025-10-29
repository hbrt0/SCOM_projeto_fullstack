# Dark Souls Wiki – Guia de Execução

Este documento explica como preparar, executar e validar o projeto **SCOM – Dark Souls Wiki** em uma máquina local.

---

## 1. Pré-requisitos

| Software | Versão recomendada | Observações |
|----------|--------------------|-------------|
| Node.js  | 18.x ou superior   | Inclui o npm, usado para instalar dependências do backend. |
| PostgreSQL | 16.x (local)     | Serviço precisa estar ativo. Anote usuário, senha e porta escolhidos no instalador. |
| Python (opcional) | 3.10+     | Apenas se quiser utilizar o script `backend/sql/query_db.py` para consultas rápidas. |

> **Dica:** Durante a instalação do PostgreSQL, marque a opção para instalar os utilitários de linha de comando (`psql`), eles serão úteis para aplicar o schema.

---

## 2. Clonar o projeto

```bash
git clone <url-do-repositorio> SCOM_projeto_fullstack_v1
cd SCOM_projeto_fullstack_v1
```

---

## 3. Configurar o banco de dados

1. Inicie o console `psql`:
   ```powershell
   psql -U postgres
   ```
2. Crie o banco que será utilizado pela aplicação:
   ```sql
   CREATE DATABASE scomdb;
   \q
   ```
3. Aplique o schema completo:
   ```powershell
   psql -U postgres -d scomdb -f backend/sql/schema.sql
   ```
4. Opcional: verifique as tabelas
   ```powershell
   psql -U postgres -d scomdb -c "\dt"
   ```

Resultado esperado: tabelas `users`, `profiles`, `comments` e `"session"` listadas.

---

## 4. Configurar variáveis de ambiente

1. Copie o arquivo de exemplo:
   ```bash
   copy backend\.env.example backend\.env   # PowerShell
   # ou
   cp backend/.env.example backend/.env     # Git Bash / WSL
   ```
2. Abra `backend/.env` e ajuste:
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgres://postgres:<sua_senha>@localhost:5432/scomdb
   SESSION_SECRET=<gere-uma-string-aleatoria>
   HTTPS_ENABLED=false
   # HTTPS_KEY e HTTPS_CERT só serão usados se HTTPS_ENABLED=true
   ```
3. Se for habilitar HTTPS localmente, gere `key.pem` e `cert.pem` dentro de `backend/certs/` e aponte o caminho correto no `.env`.

---

## 5. Instalar dependências do backend

```bash
npm --prefix backend install
```

Isso cria `backend/node_modules/` (ignorado pelo Git).

---

## 6. Executar o servidor

- Ambiente de desenvolvimento (nodemon):
  ```bash
  npm --prefix backend run dev
  ```
- Ambiente simples (sem hot reload):
  ```bash
  npm --prefix backend start
  ```

Logs esperados:
```
HTTP server rodando em http://localhost:3000
```
ou
```
HTTPS server rodando em https://localhost:3000
```

---

## 7. Acessar as páginas

| Página | URL local | Observações |
|--------|-----------|-------------|
| Wiki principal | `http://localhost:3000/dark_wiki.html` | Conteúdo público, alterna tema, mostra comentários. |
| Artigo do boss | `http://localhost:3000/gwyn.html` | Página temática com mesmos recursos da wiki. |
| Login/Cadastro | `http://localhost:3000/login.html` | Abas para login e cadastro, validações front-end. |
| Painel Admin | `http://localhost:3000/admin.html` | Necessita usuário com `role=admin`. |

---

## 8. Criar e promover usuários

Faça cadastro via `login.html`. Depois, promova o usuário a admin de uma das formas:

- **Via script Python** (se instalado):
  ```bash
  python backend/sql/query_db.py promote-admin seu_usuario
  ```
- **Via SQL direto**:
  ```sql
  UPDATE users SET role='admin' WHERE username='seu_usuario';
  ```

Com a promoção feita, acesse `admin.html` para criar/editar/excluir outros usuários.

---

## 9. Rodar os testes de segurança

```bash
npm --prefix backend test
```

O Jest executa cinco cenários cobrindo CSRF, sanitização de entrada, fluxo completo de autenticação, bloqueio de SQL injection e rate limit anti força-bruta.

---

## 10. Estrutura relevante para consulta rápida

```
backend/
  src/
    app.js            # Middlewares, sessões, rotas e estáticos
    server.js         # Inicia HTTP/HTTPS
    db.js / logger.js # Conexão Postgres e logs
    middleware/       # requireAuth, requireAdmin, rate limit, errors
    routes/           # auth, users, profile, comments
    validators/       # Regras de validação com express-validator
  sql/
    schema.sql        # Script completo do banco
    query_db.py       # Utilitário CLI (list, delete, promote, etc.)
  __tests__/
    security.test.js  # Testes automatizados com Supertest/Jest
frontend/
  dark_wiki.html, gwyn.html, login.html, admin.html
  fashion_wiki.css, main.js, admin.js, login_style.css, gwyn.css
```

---