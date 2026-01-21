const setupMemoModal = () => {
  const modal = document.getElementById('memoModal');
  if (!modal) {
    return;
  }

  const authButtons = document.getElementById('auth-buttons');
  const userIcon = document.getElementById('userIcon');
  const loginBtn = document.getElementById('login-btn');
  const overlay = modal.querySelector('[data-modal-overlay]');
  const content = modal.querySelector('[data-modal-content]');

  const notifyAuthState = (loggedIn) => {
    window.loggedIn = loggedIn;
    document.dispatchEvent(
      new CustomEvent('authstatechange', {
        detail: { loggedIn }
      })
    );
  };

  const applyAuthUI = (loggedIn) => {
    if (authButtons) {
      authButtons.classList.toggle('hidden', loggedIn);
    }
    if (userIcon) {
      userIcon.classList.toggle('hidden', !loggedIn);
    }
    if (!loggedIn && loginBtn) {
      loginBtn.onclick = () => {
        window.location.href = '/login';
      };
    }
  };

  fetch('/api/current_user')
    .then((res) => {
      if (!res.ok) {
        return { logged_in: false };
      }
      return res.json();
    })
    .then((data) => {
      const loggedIn = Boolean(data.logged_in);
      notifyAuthState(loggedIn);
      applyAuthUI(loggedIn);
    })
    .catch(() => {
      notifyAuthState(false);
      applyAuthUI(false);
    });

  const closeTargets = modal.querySelectorAll('[data-close-modal]');
  const titleEl = modal.querySelector('[data-modal-title]');
  const dateEl = modal.querySelector('[data-modal-date]');
  const tagsEl = modal.querySelector('[data-modal-tags]');
  const inputEl = modal.querySelector('[data-modal-input]');
  const responseEl = modal.querySelector('[data-modal-response]');

  const clearModal = () => {
    titleEl.textContent = '保存したメモ';
    dateEl.textContent = '';
    tagsEl.innerHTML = '';
    inputEl.textContent = '';
    responseEl.textContent = '';
  };

  const renderTags = (tags) => {
    tagsEl.innerHTML = '';
    if (!tags || !tags.length) {
      const emptyTag = document.createElement('span');
      emptyTag.className =
        'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-400';
      emptyTag.textContent = 'タグなし';
      tagsEl.appendChild(emptyTag);
      return;
    }

    tags.forEach((tag) => {
      if (!tag) return;
      const chip = document.createElement('span');
      chip.className =
        'inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700';
      chip.textContent = tag;
      tagsEl.appendChild(chip);
    });
  };

  const openModal = (memo) => {
    clearModal();
    titleEl.textContent = memo.title || '保存したメモ';
    dateEl.textContent = memo.date || '';
    renderTags(memo.tags);
    inputEl.textContent = memo.input || '';
    responseEl.textContent = memo.response || '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.classList.add('overflow-hidden');
    requestAnimationFrame(() => {
      if (overlay) {
        overlay.classList.remove('opacity-0');
        overlay.classList.add('opacity-100');
      }
      if (content) {
        content.classList.remove('opacity-0', 'translate-y-4', 'scale-95');
        content.classList.add('opacity-100', 'translate-y-0', 'scale-100');
      }
    });
  };

  const closeModal = () => {
    if (overlay) {
      overlay.classList.remove('opacity-100');
      overlay.classList.add('opacity-0');
    }
    if (content) {
      content.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
      content.classList.add('opacity-0', 'translate-y-4', 'scale-95');
    }
    document.body.classList.remove('overflow-hidden');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      clearModal();
    }, 200);
  };

  closeTargets.forEach((trigger) => {
    trigger.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  const memoItems = document.querySelectorAll('.memo-item');
  memoItems.forEach((item) => {
    item.addEventListener('click', () => {
      const input = item.dataset.input ? JSON.parse(item.dataset.input) : '';
      const response = item.dataset.response ? JSON.parse(item.dataset.response) : '';
      const tagString = item.dataset.tags || '';
      const tags = tagString
        .split(/\s+/)
        .map((tag) => tag.trim())
        .filter(Boolean);

      openModal({
        title: item.dataset.title || '保存したメモ',
        date: item.dataset.date || '',
        tags,
        input,
        response,
      });
    });
  });
};

document.addEventListener('DOMContentLoaded', setupMemoModal);
