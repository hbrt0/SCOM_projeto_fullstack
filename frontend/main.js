// Este arquivo substitui a lógica de localStorage por sessão no servidor.

(function(){
  // === TROCA DE TEMA ===
  const btnTheme = document.getElementById('btn-theme');
  const themeLabel = document.getElementById('theme-label');
  if (btnTheme && themeLabel) {
    let isLightTheme = localStorage.getItem('isLightTheme') === 'true';
    const applyTheme = (light) => {
      document.body.classList.toggle('light-theme', light);
      themeLabel.textContent = light ? 'Extinguish Flame' : 'Light Bonfire';
      btnTheme.setAttribute('aria-pressed', String(light));
      localStorage.setItem('isLightTheme', light);
    };
    applyTheme(isLightTheme);
    btnTheme.addEventListener('click', () => {
      isLightTheme = !isLightTheme;
      applyTheme(isLightTheme);
    });
  }

  // === ATALHO DE BUSCA (tecla /) ===
  const searchInput = document.getElementById('search-input'); 
  if (searchInput) {
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  // === MENSAGEM PRAISE THE SUN NO FORMULARIO ===
  const form = document.getElementById('feedback-form');
  if (form) {
    const you = document.getElementById('praise-the-sun');
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const valid = form.checkValidity();
      if (!valid) {
        form.reportValidity();
        return;
      }
      if (you) {
        you.classList.add('show');
        setTimeout(()=> {
          you.classList.remove('show');
          form.reset();
          alert('Thanks for commenting — May the flames guide thee 🔥');
        }, 1400);
      } else {
        form.reset();
        alert('Thanks for commenting — May the flames guide thee 🔥');
      }
    });
  }

  // === LOGICA DE LOGIN/LOGOUT COM BACKEND ===
  const headerActions = document.querySelector('.header-actions');
  const loginButton = document.getElementById('btn-login');

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, m => ({
      '&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#39;'
    }[m]));
  }

  async function getMe() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 204) return null;
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || data; // <-- se vier {authenticated, user}, retorna só o user
    } catch (e) {
      return null;
    }
  }

  async function getCsrf() {
    const res = await fetch('/api/auth/csrf', { credentials: 'include' });
    const data = await res.json();
    return data.csrfToken;
  }

  async function renderAuth() {
    if (!headerActions) return;
    const user = await getMe();
    if (user && loginButton) {
      // Substitui botão de login por boas-vindas + logout
      const welcomeMessage = document.createElement('div');
      welcomeMessage.className = 'user-welcome';
      welcomeMessage.innerHTML = `Olá, <span class="username">${escapeHtml(user.username)}</span> • <a class="btn" href="admin.html" ${user.role === 'admin' ? '' : 'style="display:none"'}>Admin</a>`;
      const logoutButton = document.createElement('button');
      logoutButton.className = 'btn';
      logoutButton.textContent = 'Logout';
      logoutButton.onclick = async () => {
        const csrf = await getCsrf();
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'x-csrf-token': csrf }
        });
        window.location.reload();
      };
      loginButton.remove();
      headerActions.appendChild(welcomeMessage);
      headerActions.appendChild(logoutButton);
    }
  }
  renderAuth();

  // === CONTROLE DO BOTAO DE MUSICA ===
  const musicToggle = document.getElementById('music-toggle');
  const backgroundMusic = document.getElementById('background-music');
  if (musicToggle && backgroundMusic) {
    musicToggle.addEventListener('click', () => {
      if (backgroundMusic.paused) {
        backgroundMusic.play();
        musicToggle.classList.add('playing');
        musicToggle.setAttribute('aria-label', 'Pausar música ambiente');
      } else {
        backgroundMusic.pause();
        musicToggle.classList.remove('playing');
        musicToggle.setAttribute('aria-label', 'Tocar música ambiente');
      }
    });
  }

})();

// === CONTROLE DE TAMANHO DA FONTE ===
const root = document.documentElement; // A tag <html>
const fontIncreaseButton = document.getElementById('font-increase-button');
const fontDecreaseButton = document.getElementById('font-decrease-button');

if (fontIncreaseButton && fontDecreaseButton) {
  const MIN_FONT_SIZE = 12; // Tamanho mínimo em pixels
  const MAX_FONT_SIZE = 20; // Tamanho máximo em pixels

  // Função para aplicar o tamanho da fonte
  const applyFontSize = (size) => {
    root.style.fontSize = `${size}px`;
    localStorage.setItem('fontSize', size); // Salva a preferência
  };

  // Aplica o tamanho salvo ao carregar a página
  const savedSize = localStorage.getItem('fontSize');
  if (savedSize) {
    root.style.fontSize = `${savedSize}px`;
  }

  // Evento para aumentar a fonte
  fontIncreaseButton.addEventListener('click', () => {
    let currentSize = parseFloat(getComputedStyle(root).fontSize);
    if (currentSize < MAX_FONT_SIZE) {
      applyFontSize(currentSize + 1);
    }
  });

  // Evento para diminuir a fonte
  fontDecreaseButton.addEventListener('click', () => {
    let currentSize = parseFloat(getComputedStyle(root).fontSize);
    if (currentSize > MIN_FONT_SIZE) {
      applyFontSize(currentSize - 1);
    }
  });
}

// === COMENTÁRIOS ===
(async function initComments() {
  const block = document.querySelector('.comments[data-slug]');
  if (!block) return;

  const slug = block.getAttribute('data-slug');
  const list = block.querySelector('.comment-list');
  const form = block.querySelector('.comment-form');
  const hint = block.querySelector('.comment-auth-hint');
  const textarea = block.querySelector('#comment-message');
  const btn = form?.querySelector('button[type="submit"]');

  const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  async function loadComments() {
    list.innerHTML = '<li>Carregando…</li>';
    try {
      const r = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, { credentials: 'include' });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (!Array.isArray(data) || data.length === 0) {
        list.innerHTML = '<li>Seja o primeiro a comentar.</li>';
        return;
      }
      list.innerHTML = '';
      for (const c of data) {
        const li = document.createElement('li');
        li.className = 'comment-item';
        const when = new Date(c.created_at).toLocaleString();
        li.innerHTML = `<strong>${esc(c.author)}</strong> — <time datetime="${esc(c.created_at)}">${esc(when)}</time><br>${esc(c.message)}`;
        list.appendChild(li);
      }
    } catch (_) {
      list.innerHTML = '<li>Não foi possível carregar comentários.</li>';
    }
  }

  async function getCsrf() {
    const r = await fetch('/api/auth/csrf', { credentials: 'include' });
    if (!r.ok) return '';
    const j = await r.json();
    return j.csrfToken || '';
  }

  // Usa o getMe() que já existe no seu main.js (retorna user ou null).
  async function me() {
    try {
      const r = await fetch('/api/auth/me', { credentials: 'include' });
      if (r.status === 204) return null;
      if (!r.ok) return null;
      const data = await r.json();
      // compat: pode vir { authenticated, user } OU o user direto
      return data?.user || data || null;
    } catch { return null; }
  }

  // Estado logado vs não logado
  const user = await me();
  const isAuth = !!user;
  if (form) form.hidden = !isAuth;
  if (hint) hint.hidden = isAuth;

  // Submissão
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!textarea.value.trim()) {
      textarea.focus();
      return;
    }
    try {
      btn.disabled = true;
      const csrf = await getCsrf();
      const r = await fetch('/api/comments', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf
        },
        body: JSON.stringify({ slug, message: textarea.value.trim() })
      });
      if (!r.ok) throw new Error();
      textarea.value = '';
      await loadComments();
    } catch {
      alert('Não foi possível enviar seu comentário.');
    } finally {
      btn.disabled = false;
    }
  });

  // Inicial
  await loadComments();
})();
