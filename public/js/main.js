document.addEventListener('DOMContentLoaded', () => {
  const boardElement = document.querySelector('.board');
  const modal = document.querySelector('#postit-modal');
  const modalForm = document.querySelector('#postit-form');
  const modalTitle = document.querySelector('#postit-modal-title');
  const modalContent = document.querySelector('#postit-content');
  const modalCancel = document.querySelector('#postit-cancel');

  if (!boardElement || !modal || !modalForm || !modalTitle || !modalContent || !modalCancel) {
    return;
  }

  const state = {
    boardSlug: boardElement.dataset.boardSlug || 'main',
    currentUserId: Number(boardElement.dataset.currentUserId || 0),
    csrfToken: boardElement.dataset.csrfToken || '',
    permissions: {
      canCreate: boardElement.dataset.canCreate === '1',
      canUpdate: boardElement.dataset.canUpdate === '1',
      canDelete: boardElement.dataset.canDelete === '1',
      isAdmin: boardElement.dataset.isAdmin === '1'
    },
    postitsById: new Map(),
    mode: 'create',
    targetId: null,
    pendingCreatePosition: null,
    dragState: null
  };

  function canManage(postit) {
    return state.permissions.isAdmin || postit.authorId === state.currentUserId;
  }

  function htmlEscape(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function getPostitSize() {
    const isMobile = window.innerWidth <= 640;

    return {
      width: isMobile ? 200 : 230,
      height: isMobile ? 170 : 190
    };
  }

  function clampPosition(x, y) {
    const boardRect = boardElement.getBoundingClientRect();
    const { width: postitWidth, height: postitHeight } = getPostitSize();
    const margin = 12;

    const maxX = Math.max(margin, Math.floor(boardRect.width - postitWidth - margin));
    const maxY = Math.max(margin, Math.floor(boardRect.height - postitHeight - margin));

    return {
      x: Math.min(Math.max(margin, Math.round(x)), maxX),
      y: Math.min(Math.max(margin, Math.round(y)), maxY)
    };
  }

  function renderEmptyState() {
    const empty = boardElement.querySelector('.board-empty');
    if (!empty) {
      return;
    }

    empty.style.display = state.postitsById.size === 0 ? 'grid' : 'none';
  }

  function renderPostit(postit) {
    state.postitsById.set(postit.id, postit);

    let element = boardElement.querySelector(`[data-postit-id="${postit.id}"]`);

    if (!element) {
      element = document.createElement('article');
      element.className = 'postit';
      element.dataset.postitId = String(postit.id);
      boardElement.appendChild(element);
    }

    const clamped = clampPosition(postit.x, postit.y);

    element.style.left = `${clamped.x}px`;
    element.style.top = `${clamped.y}px`;
    element.style.zIndex = String(postit.zIndex);

    const editable = canManage(postit) && state.permissions.canUpdate;
    const deletable = canManage(postit) && state.permissions.canDelete;
    const draggable = editable ? '1' : '0';

    element.innerHTML = `
      <header class="postit-head">
        <strong>${htmlEscape(postit.authorUsername)}</strong>
        <small>${new Date(postit.createdAt).toLocaleString()}</small>
      </header>
      <p class="postit-text">${htmlEscape(postit.content)}</p>
      <footer class="postit-actions">
        ${editable ? '<button type="button" data-action="edit">Modifier</button>' : ''}
        ${deletable ? '<button type="button" data-action="delete" class="danger">Supprimer</button>' : ''}
      </footer>
      <span class="drag-hint">${draggable === '1' ? 'Glisser pour deplacer' : ''}</span>
    `;

    element.dataset.draggable = draggable;
    renderEmptyState();
  }

  function removePostit(postitId) {
    state.postitsById.delete(postitId);

    const element = boardElement.querySelector(`[data-postit-id="${postitId}"]`);
    if (element) {
      element.remove();
    }

    renderEmptyState();
  }

  async function requestJson(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': state.csrfToken
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Erreur reseau');
    }

    return data;
  }

  async function loadPostits() {
    const response = await fetch(`/liste/${encodeURIComponent(state.boardSlug)}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Impossible de charger les post-its.');
    }

    state.postitsById.clear();

    boardElement.querySelectorAll('.postit').forEach((element) => {
      element.remove();
    });

    payload.postits.forEach((postit) => renderPostit(postit));
    renderEmptyState();
  }

  function openModal(mode, value, targetId = null) {
    state.mode = mode;
    state.targetId = targetId;
    modalTitle.textContent = mode === 'create' ? 'Nouveau post-it' : 'Modifier le post-it';
    modalContent.value = value || '';

    if (typeof modal.showModal === 'function') {
      modal.showModal();
    }

    modalContent.focus();
  }

  function closeModal() {
    if (typeof modal.close === 'function') {
      modal.close();
    }

    state.targetId = null;
    state.pendingCreatePosition = null;
  }

  boardElement.addEventListener('dblclick', (event) => {
    if (!state.currentUserId) {
      window.alert('Connecte-toi pour creer un post-it.');
      return;
    }

    if (!state.permissions.canCreate) {
      window.alert('Tu n as pas le droit de creer des post-its.');
      return;
    }

    const boardRect = boardElement.getBoundingClientRect();
    const rawX = event.clientX - boardRect.left - 110;
    const rawY = event.clientY - boardRect.top - 60;

    state.pendingCreatePosition = clampPosition(rawX, rawY);
    openModal('create', '');
  });

  let lastTapAt = 0;

  boardElement.addEventListener('touchend', (event) => {
    const now = Date.now();

    if (now - lastTapAt < 280) {
      const touch = event.changedTouches[0];
      const boardRect = boardElement.getBoundingClientRect();
      const rawX = touch.clientX - boardRect.left - 110;
      const rawY = touch.clientY - boardRect.top - 60;

      if (state.currentUserId && state.permissions.canCreate) {
        state.pendingCreatePosition = clampPosition(rawX, rawY);
        openModal('create', '');
      }
    }

    lastTapAt = now;
  });

  modalForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const content = modalContent.value.trim();

    if (!content) {
      window.alert('Le texte est obligatoire.');
      return;
    }

    try {
      if (state.mode === 'create') {
        const payload = await requestJson('/ajouter', {
          boardSlug: state.boardSlug,
          content,
          x: state.pendingCreatePosition?.x || 12,
          y: state.pendingCreatePosition?.y || 12
        });

        renderPostit(payload.postit);
      } else if (state.mode === 'edit' && state.targetId) {
        const payload = await requestJson('/modifier', {
          id: state.targetId,
          content
        });

        renderPostit(payload.postit);
      }

      closeModal();
    } catch (error) {
      window.alert(error.message);
    }
  });

  modalCancel.addEventListener('click', closeModal);

  boardElement.addEventListener('click', async (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const postitElement = target.closest('.postit');
    if (!postitElement) {
      return;
    }

    const postitId = Number(postitElement.dataset.postitId);
    const postit = state.postitsById.get(postitId);

    if (!postit) {
      return;
    }

    if (target.dataset.action === 'delete') {
      if (!window.confirm('Supprimer ce post-it ?')) {
        return;
      }

      try {
        await requestJson('/effacer', { id: postitId });
        removePostit(postitId);
      } catch (error) {
        window.alert(error.message);
      }

      return;
    }

    if (target.dataset.action === 'edit') {
      openModal('edit', postit.content, postitId);
    }
  });

  boardElement.addEventListener('pointerdown', (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const postitElement = target.closest('.postit');

    if (!postitElement || postitElement.dataset.draggable !== '1') {
      return;
    }

    if (target.closest('button')) {
      return;
    }

    const id = Number(postitElement.dataset.postitId);
    const rect = postitElement.getBoundingClientRect();
    const boardRect = boardElement.getBoundingClientRect();

    state.dragState = {
      id,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      boardRect
    };

    if (typeof postitElement.setPointerCapture === 'function') {
      postitElement.setPointerCapture(event.pointerId);
    }
  });

  boardElement.addEventListener('pointermove', (event) => {
    if (!state.dragState) {
      return;
    }

    const postitElement = boardElement.querySelector(`[data-postit-id="${state.dragState.id}"]`);
    if (!postitElement) {
      return;
    }

    const rawLeft = event.clientX - state.dragState.boardRect.left - state.dragState.offsetX;
    const rawTop = event.clientY - state.dragState.boardRect.top - state.dragState.offsetY;

    const clamped = clampPosition(rawLeft, rawTop);

    postitElement.style.left = `${clamped.x}px`;
    postitElement.style.top = `${clamped.y}px`;
  });

  boardElement.addEventListener('pointerup', async (event) => {
    if (!state.dragState) {
      return;
    }

    const postitElement = boardElement.querySelector(`[data-postit-id="${state.dragState.id}"]`);
    const postitId = state.dragState.id;
    state.dragState = null;

    if (!postitElement) {
      return;
    }

    const rawX = Number.parseInt(postitElement.style.left, 10) || 0;
    const rawY = Number.parseInt(postitElement.style.top, 10) || 0;
    const { x, y } = clampPosition(rawX, rawY);

    postitElement.style.left = `${x}px`;
    postitElement.style.top = `${y}px`;

    try {
      const payload = await requestJson('/deplacer', { id: postitId, x, y });
      renderPostit(payload.postit);
    } catch (error) {
      window.alert(error.message);
      await loadPostits();
    }

    if (typeof postitElement.releasePointerCapture === 'function') {
      postitElement.releasePointerCapture(event.pointerId);
    }
  });

  function setupRealtime() {
    const source = new EventSource(`/events/${encodeURIComponent(state.boardSlug)}`);

    source.addEventListener('postit-created', (event) => {
      const payload = JSON.parse(event.data);
      renderPostit(payload.postit);
    });

    source.addEventListener('postit-updated', (event) => {
      const payload = JSON.parse(event.data);
      renderPostit(payload.postit);
    });

    source.addEventListener('postit-moved', (event) => {
      const payload = JSON.parse(event.data);
      renderPostit(payload.postit);
    });

    source.addEventListener('postit-deleted', (event) => {
      const payload = JSON.parse(event.data);
      removePostit(payload.id);
    });
  }

  loadPostits().catch((error) => {
    window.alert(error.message);
  });

  setupRealtime();
});