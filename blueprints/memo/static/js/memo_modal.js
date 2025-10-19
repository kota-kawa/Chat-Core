const setupMemoModal = () => {
  const modal = document.getElementById('memoModal');
  if (!modal) {
    return;
  }

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
      emptyTag.className = 'memo-tag memo-tag--muted';
      emptyTag.textContent = 'タグなし';
      tagsEl.appendChild(emptyTag);
      return;
    }

    tags.forEach((tag) => {
      if (!tag) return;
      const chip = document.createElement('span');
      chip.className = 'memo-tag';
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
    modal.classList.add('is-visible');
    document.body.classList.add('modal-open');
  };

  const closeModal = () => {
    modal.classList.remove('is-visible');
    document.body.classList.remove('modal-open');
    setTimeout(clearModal, 200);
  };

  closeTargets.forEach((trigger) => {
    trigger.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-visible')) {
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
