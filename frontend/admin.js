(async function () {
  const table = document.getElementById('users-table');
  const feedback = document.getElementById('feedback');
  const pageInfo = document.getElementById('page-info');
  const btnPrev = document.getElementById('prev');
  const btnNext = document.getElementById('next');
  const inputSearch = document.getElementById('search');
  const btnReload = document.getElementById('reload');
  const btnOpenCreate = document.getElementById('open-create');

  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalForm = document.getElementById('modal-form');
  const modalError = document.getElementById('modal-error');
  const btnCloseModal = document.getElementById('close-modal');

  let page = 1;
  let limit = 10;
  let lastTotal = 0;
  let me = null; // ← usuário logado

  async function getMe() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.status === 204) return null;
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    }
  }

  function openModal(editUser) {
    modal.style.display = 'flex';
    modalTitle.textContent = editUser ? 'Editar usuário' : 'Criar usuário';
    modalForm.dataset.mode = editUser ? 'edit' : 'create';
    modalForm.dataset.id = editUser ? editUser.id : '';
    modalForm.username.value = editUser?.username || '';
    modalForm.email.value = editUser?.email || '';
    modalForm.password.value = '';
    modalForm.role.value = editUser?.role || 'user';
    modalError.textContent = '';

    // 🚫 Não permitir alterar a própria role na UI
    const isSelf = !!(editUser && me && editUser.id === me.id);
    modalForm.role.disabled = isSelf;
    modalForm.role.title = isSelf ? 'Admins não podem alterar a própria role' : '';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  btnOpenCreate.addEventListener('click', () => openModal(null));
  btnCloseModal.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  async function getCsrf() {
    const res = await fetch('/api/auth/csrf', { credentials: 'include' });
    const data = await res.json();
    return data.csrfToken;
  }

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[ch]);
}

  async function load() {
    table.innerHTML = '<p class="muted">Carregando...</p>';
    const res = await fetch(`/api/users?page=${page}&limit=${limit}`, { credentials: 'include' });
    if (res.status === 401 || res.status === 403) {
      table.innerHTML = '<p class="muted">Acesso negado. Faça login como admin.</p>';
      return;
    }
    const data = await res.json();
    lastTotal = data.total;
    pageInfo.textContent = `Página ${data.page} • ${data.total} usuários`;
    table.innerHTML = '';
    data.data.forEach(u => {
      if (inputSearch.value && !u.username.includes(inputSearch.value)) return;
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div>
          <h3>${escapeHtml(u.username)} <span class="small">(${u.role})</span></h3>
          <p class="muted">${escapeHtml(u.email)}</p>
          <div style="margin-top:8px; display:flex; gap:8px;">
            <button class="btn" data-edit="${u.id}">Editar</button>
            <button class="btn" data-del="${u.id}">Excluir</button>
          </div>
        </div>
      `;
      table.appendChild(card);

      const editBtn = card.querySelector(`[data-edit="${u.id}"]`);
      const delBtn  = card.querySelector(`[data-del="${u.id}"]`);


      // 🚫 Não permitir auto-exclusão na UI
      if (me && u.id === me.id) {
        delBtn.disabled = true;
        delBtn.title = 'Você não pode excluir a própria conta';
      }

      editBtn.addEventListener('click', () => openModal(u));
      delBtn.addEventListener('click', async () => {
        if (!confirm('Tem certeza que deseja excluir?')) return;
        const csrf = await getCsrf();
        const del = await fetch(`/api/users/` + u.id, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'x-csrf-token': csrf }
        });
        const dj = await del.json().catch(() => ({}));
        feedback.textContent = dj.message || dj.error || '';
        load();
      });
    });
  }

  btnPrev.addEventListener('click', () => { if (page > 1) { page--; load(); }});
  btnNext.addEventListener('click', () => { if (page * limit < lastTotal) { page++; load(); }});
  btnReload.addEventListener('click', load);
  inputSearch.addEventListener('input', load);

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalError.textContent = '';
    const csrf = await getCsrf();
    const payload = {
      username: modalForm.username.value.trim(),
      email: modalForm.email.value.trim(),
      password: modalForm.password.value,
      role: modalForm.role.value
    };
    try {
      let res;
      if (modalForm.dataset.mode === 'create') {
        res = await fetch('/api/users', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
          body: JSON.stringify(payload)
        });
      } else {
        const id = modalForm.dataset.id;
        // no update de admin, password é opcional
        if (!payload.password) delete payload.password;

        // Não permitir alterar a própria role no envio
        if (me && id === me.id) {
          delete payload.role;
        }

        res = await fetch(`/api/users/` + id, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
          body: JSON.stringify(payload)
        });
      }
      const data = await res.json();
      if (!res.ok) {
        modalError.textContent = data.error || (data.errors && data.errors.map(e => e.msg).join(', ')) || 'Erro';
      } else {
        closeModal();
        feedback.textContent = data.message;
        await load();
      }
    } catch (err) {
      modalError.textContent = 'Erro de rede';
    }
  });

  // carregar usuário logado e lista inicial
  me = await getMe();
  await load();
})();
