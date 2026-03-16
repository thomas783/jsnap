/**
 * jsnap — Entry point & event bindings
 */
(function () {
  const input = document.getElementById('json-input');
  const output = document.getElementById('tree-output');
  const errorBar = document.getElementById('error-bar');
  const backdrop = document.getElementById('input-backdrop');
  const expandAllBtn = document.getElementById('expand-all');
  const collapseAllBtn = document.getElementById('collapse-all');
  const copyRawBtn = document.getElementById('copy-raw');
  const copyFormattedBtn = document.getElementById('copy-formatted');
  const clearBtn = document.getElementById('clear-btn');
  const themeToggle = document.getElementById('theme-toggle');

  let currentData = null;

  // ── JSON Input Handler ────────────────────
  let debounceTimer = null;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleInput, 150);
  });

  // Allow Tab key in textarea
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = input.value.substring(0, start) + '  ' + input.value.substring(end);
      input.selectionStart = input.selectionEnd = start + 2;
    }
  });

  function handleInput() {
    const value = input.value;

    if (!value.trim()) {
      currentData = null;
      showPlaceholder();
      hideError();
      return;
    }

    const result = JSONParser.parse(value);

    if (result.ok) {
      currentData = result.data;
      hideError();
      clearInputHighlight();
      TreeView.render(result.data, output);
      currentDepthStep = null;
      depthStepLabel.textContent = 'All';
    } else if (result.recovered && result.data) {
      currentData = result.data;
      showError(result.error);
      highlightInputLines(value, result.errorLines);
      TreeView.render(result.data, output, result.errorLines);
      currentDepthStep = null;
      depthStepLabel.textContent = 'All';
    } else if (result.error) {
      currentData = null;
      showError(result.error);
      highlightInputLines(value, [result.error.line]);
      renderRawWithError(value, result.error.line);
    }
  }

  // ── Placeholder ───────────────────────────
  function showPlaceholder() {
    output.innerHTML = '<div class="placeholder">Paste JSON on the left<br>to see the formatted tree here</div>';
  }

  showPlaceholder();

  // ── Error Display ─────────────────────────
  function showError(error) {
    let msg = error.message;
    if (error.line) {
      msg = `Line ${error.line}, Col ${error.column}: ${msg}`;
    }
    errorBar.textContent = msg;
    errorBar.classList.remove('hidden');
  }

  function hideError() {
    errorBar.classList.add('hidden');
    errorBar.textContent = '';
  }

  // ── Render raw text with error highlight in output panel ──
  function renderRawWithError(text, errorLine) {
    const lines = text.split('\n');
    const pre = document.createElement('pre');
    pre.className = 'raw-error-output';

    lines.forEach((line, i) => {
      const div = document.createElement('div');
      div.className = 'raw-line' + (i + 1 === errorLine ? ' error-line' : '');

      const numSpan = document.createElement('span');
      numSpan.className = 'line-number';
      numSpan.textContent = String(i + 1).padStart(3, ' ');
      div.appendChild(numSpan);

      const codeSpan = document.createElement('span');
      codeSpan.className = 'line-content';
      codeSpan.textContent = line;
      div.appendChild(codeSpan);

      pre.appendChild(div);
    });

    output.innerHTML = '';
    output.appendChild(pre);

    // Scroll error line into view
    const errorEl = pre.querySelector('.error-line');
    if (errorEl) {
      errorEl.scrollIntoView({ block: 'center' });
    }
  }

  function highlightInputLines(text, errorLines) {
    if (!errorLines || errorLines.length === 0) {
      clearInputHighlight();
      return;
    }
    const lines = text.split('\n');
    const errorSet = new Set(errorLines);
    const fragments = [];
    for (let i = 0; i < lines.length; i++) {
      const escaped = lines[i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cls = errorSet.has(i + 1) ? 'backdrop-line error-line' : 'backdrop-line';
      fragments.push(`<span class="${cls}">${escaped || ' '}</span>`);
    }
    backdrop.innerHTML = fragments.join('');
  }

  function clearInputHighlight() {
    backdrop.innerHTML = '';
  }

  // Sync backdrop scroll with textarea using rAF for smooth tracking
  (function syncBackdropScroll() {
    backdrop.style.transform = `translate(-${input.scrollLeft}px, -${input.scrollTop}px)`;
    requestAnimationFrame(syncBackdropScroll);
  })();

  // ── Toolbar Actions ───────────────────────
  expandAllBtn.addEventListener('click', () => TreeView.expandAll(output));
  collapseAllBtn.addEventListener('click', () => TreeView.collapseAll(output));


  // ── B. +/- Step Controls ────────────────────
  const depthMinus = document.getElementById('depth-minus');
  const depthPlus = document.getElementById('depth-plus');
  const depthStepLabel = document.getElementById('depth-step-label');
  let currentDepthStep = null; // null = All

  function syncStepLabel() {
    if (!currentData) return;
    const maxDepth = TreeView.getMaxDepth(output);
    if (currentDepthStep === null || currentDepthStep >= maxDepth) {
      depthStepLabel.textContent = 'All';
      currentDepthStep = null;
    } else {
      depthStepLabel.textContent = currentDepthStep;
    }
  }

  depthMinus.addEventListener('click', () => {
    if (!currentData) return;
    const maxDepth = TreeView.getMaxDepth(output);
    if (currentDepthStep === null) currentDepthStep = maxDepth;
    currentDepthStep = Math.max(0, currentDepthStep - 1);
    if (currentDepthStep === 0) {
      TreeView.collapseAll(output);
    } else {
      TreeView.expandToDepth(output, currentDepthStep);
    }
    syncStepLabel();
  });

  depthPlus.addEventListener('click', () => {
    if (!currentData) return;
    const maxDepth = TreeView.getMaxDepth(output);
    if (currentDepthStep === null) return;
    currentDepthStep = currentDepthStep + 1;
    if (currentDepthStep >= maxDepth) {
      currentDepthStep = null;
      TreeView.expandAll(output);
    } else {
      TreeView.expandToDepth(output, currentDepthStep);
    }
    syncStepLabel();
  });

  copyRawBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => showToast('Input copied!'));
  });

  copyFormattedBtn.addEventListener('click', () => {
    if (!currentData) return;
    const text = JSONParser.stringify(currentData);
    navigator.clipboard.writeText(text).then(() => showToast('Formatted copied!'));
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    currentData = null;
    showPlaceholder();
    hideError();
    clearInputHighlight();
    input.focus();
  });

  // ── Theme Toggle ──────────────────────────
  const savedTheme = localStorage.getItem('jsnap-theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.textContent = '☀️';
  }

  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      themeToggle.textContent = '🌙';
      localStorage.setItem('jsnap-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.textContent = '☀️';
      localStorage.setItem('jsnap-theme', 'light');
    }
  });

  // ── Save & Load ─────────────────────────
  const saveRawBtn = document.getElementById('save-raw');
  const saveFormattedBtn = document.getElementById('save-formatted');
  const savedToggle = document.getElementById('saved-toggle');
  const savedCount = document.getElementById('saved-count');
  const savedPanel = document.getElementById('saved-panel');
  const savedClose = document.getElementById('saved-close');
  const savedList = document.getElementById('saved-list');

  function updateSavedCount() {
    const count = Storage.count();
    savedCount.textContent = count > 0 ? `(${count})` : '';
  }

  function renderSavedList() {
    const items = Storage.getAll();
    updateSavedCount();

    if (items.length === 0) {
      savedList.innerHTML = '<div class="saved-empty">No saved items</div>';
      return;
    }

    savedList.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'saved-item';

      const preview = item.json.slice(0, 60).replace(/\n/g, ' ');

      el.innerHTML = `
        <div class="saved-item-info">
          <div class="saved-item-name" title="Click to rename">${escapeHtml(item.name)}</div>
          <div class="saved-item-preview">${escapeHtml(preview)}</div>
        </div>
        <div class="saved-item-actions">
          <button class="saved-item-load" title="Load">Load</button>
          <button class="saved-item-delete" title="Delete">&times;</button>
        </div>
      `;

      // Click name to rename inline
      const nameEl = el.querySelector('.saved-item-name');
      nameEl.addEventListener('click', (e) => {
        e.stopPropagation();
        const renameInput = document.createElement('input');
        renameInput.type = 'text';
        renameInput.className = 'saved-item-rename';
        renameInput.value = item.name;
        nameEl.replaceWith(renameInput);
        renameInput.focus();
        renameInput.select();

        const commitRename = () => {
          const newName = renameInput.value.trim() || item.name;
          Storage.rename(item.id, newName);
          renderSavedList();
        };

        renameInput.addEventListener('blur', commitRename);
        renameInput.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') renameInput.blur();
          if (ev.key === 'Escape') {
            renameInput.removeEventListener('blur', commitRename);
            renderSavedList();
          }
        });
      });

      // Load on click
      el.querySelector('.saved-item-load').addEventListener('click', (e) => {
        e.stopPropagation();
        input.value = item.json;
        handleInput();
        savedPanel.classList.add('hidden');
      });

      // Delete
      el.querySelector('.saved-item-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        Storage.remove(item.id);
        renderSavedList();
      });

      savedList.appendChild(el);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function generateTimeName() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // Save raw input
  saveRawBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) {
      showToast('Nothing to save');
      return;
    }
    Storage.save(generateTimeName(), text);
    updateSavedCount();
    showToast('Input saved!');
  });

  // Save formatted output
  saveFormattedBtn.addEventListener('click', () => {
    if (!currentData) {
      showToast('Nothing to save');
      return;
    }
    Storage.save(generateTimeName(), JSONParser.stringify(currentData));
    updateSavedCount();
    showToast('Formatted saved!');
  });

  // Toggle saved panel
  savedToggle.addEventListener('click', () => {
    savedPanel.classList.toggle('hidden');
    if (!savedPanel.classList.contains('hidden')) {
      renderSavedList();
    }
  });

  savedClose.addEventListener('click', () => {
    savedPanel.classList.add('hidden');
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (savedPanel.classList.contains('hidden')) return;
    if (savedPanel.contains(e.target) || e.target === savedToggle || savedToggle.contains(e.target)) return;
    savedPanel.classList.add('hidden');
  });

  // Initialize count on load
  updateSavedCount();

  // ── Search ─────────────────────────────────
  const searchBar = document.getElementById('search-bar');
  const searchInput = document.getElementById('search-input');
  const searchCount = document.getElementById('search-count');
  const searchPrev = document.getElementById('search-prev');
  const searchNext = document.getElementById('search-next');
  const searchCloseBtn = document.getElementById('search-close');

  const searchToggleBtn = document.getElementById('search-toggle');
  const searchGoBtn = document.getElementById('search-go');

  searchToggleBtn.addEventListener('click', () => {
    if (searchBar.classList.contains('hidden')) {
      if (!currentData) return;
      searchBar.classList.remove('hidden');
      searchInput.focus();
    } else {
      closeSearch();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // If no search yet or query changed, run search; otherwise go to next
      if (TreeSearch.getMatchCount() === 0 || searchInput.dataset.lastQuery !== searchInput.value.trim()) {
        runSearch();
      } else {
        TreeSearch.next();
        updateSearchCount();
      }
    }
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      TreeSearch.prev();
      updateSearchCount();
    }
    if (e.key === 'Escape') {
      closeSearch();
    }
  });

  searchGoBtn.addEventListener('click', runSearch);

  searchNext.addEventListener('click', () => {
    TreeSearch.next();
    updateSearchCount();
  });

  searchPrev.addEventListener('click', () => {
    TreeSearch.prev();
    updateSearchCount();
  });

  searchCloseBtn.addEventListener('click', closeSearch);

  function runSearch() {
    const query = searchInput.value.trim();
    searchInput.dataset.lastQuery = query;
    TreeSearch.search(query, output);
    updateSearchCount();
  }

  function updateSearchCount() {
    const total = TreeSearch.getMatchCount();
    if (total === 0 && searchInput.value.trim()) {
      searchCount.textContent = 'No results';
    } else if (total > 0) {
      searchCount.textContent = `${TreeSearch.getActiveIndex() + 1}/${total}`;
    } else {
      searchCount.textContent = '';
    }
  }

  function closeSearch() {
    TreeSearch.clear(output);
    searchBar.classList.add('hidden');
    searchInput.value = '';
    searchCount.textContent = '';
  }

  // ── Toast Notification ────────────────────
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
  }
})();
