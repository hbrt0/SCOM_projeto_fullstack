(() => {
  const form = document.getElementById('profile-form');
  const nameInput = document.getElementById('profile-full-name');
  const bioInput = document.getElementById('profile-bio');
  const messageBox = document.getElementById('profile-message');
  const loadingBox = document.getElementById('profile-loading');

  if (!form) return;

  const showMessage = (text, type = 'info') => {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.dataset.type = type;
    messageBox.hidden = !text;
  };

  const showLoading = (text = 'Carregando...') => {
    if (!loadingBox) return;
    loadingBox.textContent = text;
    loadingBox.hidden = false;
  };

  const hideLoading = () => {
    if (!loadingBox) return;
    loadingBox.hidden = true;
  };

  const getCsrfToken = async () => {
    const res = await fetch('/api/auth/csrf', { credentials: 'include' });
    if (!res.ok) return '';
    const data = await res.json();
    return data.csrfToken || '';
  };

  const ensureLogged = async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (res.status === 204 || res.status === 401) {
      showMessage('Você precisa estar logado para acessar esta página.', 'error');
      form.hidden = true;
      return null;
    }
    if (!res.ok) {
      showMessage('Não foi possível verificar sua sessão.', 'error');
      form.hidden = true;
      return null;
    }
    const user = await res.json();
    return user;
  };

  const loadProfile = async () => {
    showLoading('Carregando dados do perfil...');
    try {
      const res = await fetch('/api/profile/me', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      nameInput.value = data.full_name || '';
      bioInput.value = data.bio || '';
    } catch (err) {
      showMessage('Não foi possível carregar seu perfil.', 'error');
      form.hidden = true;
    } finally {
      hideLoading();
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage('');
    showLoading('Salvando...');
    try {
      const csrf = await getCsrfToken();
      const payload = {
        full_name: nameInput.value.trim(),
        bio: bioInput.value.trim(),
      };
      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao salvar perfil.');
      }
      showMessage(data.message || 'Perfil atualizado com sucesso!', 'success');
    } catch (err) {
      showMessage(err.message || 'Não foi possível salvar seu perfil.', 'error');
    } finally {
      hideLoading();
    }
  });

  (async () => {
    const user = await ensureLogged();
    if (!user) return;
    await loadProfile();
  })();
})();
