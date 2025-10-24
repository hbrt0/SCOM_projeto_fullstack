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
