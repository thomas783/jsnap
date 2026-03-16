/**
 * Search within the JSON tree view
 * Finds matches in keys and values, auto-expands collapsed parents, highlights results.
 */
const TreeSearch = {
  _matches: [],
  _activeIndex: -1,
  _originalContents: new Map(),

  search(query, container) {
    this.clear(container);
    if (!query) return [];

    const lowerQuery = query.toLowerCase();
    const allLines = container.querySelectorAll('.tree-line');

    allLines.forEach(line => {
      const textSpans = line.querySelectorAll('.tree-key, .tree-string, .tree-number, .tree-boolean, .tree-null');
      textSpans.forEach(span => {
        const text = span.textContent;
        if (text.toLowerCase().includes(lowerQuery)) {
          const highlighted = this._highlightText(span, text, query);
          if (highlighted) {
            this._matches.push(...highlighted);
          }
        }
      });
    });

    // Auto-expand parents of matched nodes
    this._matches.forEach(match => {
      this._expandParents(match);
    });

    if (this._matches.length > 0) {
      this._activeIndex = 0;
      this._setActive(0);
    }

    return this._matches;
  },

  _highlightText(span, text, query) {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const highlights = [];

    // Store original content for restoration
    if (!this._originalContents.has(span)) {
      this._originalContents.set(span, span.textContent);
    }

    const frag = document.createDocumentFragment();
    let lastIndex = 0;

    let idx = lowerText.indexOf(lowerQuery, lastIndex);
    while (idx !== -1) {
      // Text before match
      if (idx > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, idx)));
      }

      // Highlighted match
      const mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(mark);
      highlights.push(mark);

      lastIndex = idx + query.length;
      idx = lowerText.indexOf(lowerQuery, lastIndex);
    }

    // Remaining text
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    span.textContent = '';
    span.appendChild(frag);

    return highlights;
  },

  _expandParents(element) {
    let node = element.closest('.tree-node');
    while (node) {
      const children = node.querySelector(':scope > .tree-children');
      const toggle = node.querySelector(':scope > .tree-line .toggle-btn');
      if (children && children.classList.contains('collapsed') && toggle) {
        // Expand this node
        children.classList.remove('collapsed');
        const closingBracket = node.querySelector(':scope > .closing-bracket');
        const headerLine = node.querySelector(':scope > .tree-line');
        const summary = headerLine.querySelector('.tree-summary');
        const inlineBracket = summary ? summary.nextElementSibling : null;
        const inlineComma = inlineBracket ? inlineBracket.nextElementSibling : null;

        if (closingBracket) closingBracket.style.display = '';
        if (inlineBracket) inlineBracket.style.display = 'none';
        if (inlineComma && inlineComma.classList.contains('tree-comma')) {
          inlineComma.style.display = 'none';
        }
        toggle.textContent = '▼';
      }
      node = node.parentElement.closest('.tree-node');
    }
  },

  _setActive(index) {
    // Remove previous active
    this._matches.forEach(m => m.classList.remove('active'));

    if (index >= 0 && index < this._matches.length) {
      this._activeIndex = index;
      const match = this._matches[index];
      // Re-expand parents in case user collapsed them after initial search
      this._expandParents(match);
      match.classList.add('active');
      match.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  },

  next() {
    if (this._matches.length === 0) return;
    const nextIndex = (this._activeIndex + 1) % this._matches.length;
    this._setActive(nextIndex);
  },

  prev() {
    if (this._matches.length === 0) return;
    const prevIndex = (this._activeIndex - 1 + this._matches.length) % this._matches.length;
    this._setActive(prevIndex);
  },

  getActiveIndex() {
    return this._activeIndex;
  },

  getMatchCount() {
    return this._matches.length;
  },

  clear(container) {
    // Restore original text content
    this._originalContents.forEach((text, span) => {
      span.textContent = text;
    });
    this._originalContents.clear();
    this._matches = [];
    this._activeIndex = -1;
  }
};
