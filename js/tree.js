/**
 * Tree view rendering & collapse/expand
 */
const TreeView = {
  render(data, container, errorLines) {
    container.innerHTML = '';

    if (errorLines && errorLines.length > 0) {
      const banner = document.createElement('div');
      banner.className = 'tree-error-banner';
      const lineStr = errorLines.length > 5
        ? errorLines.slice(0, 5).join(', ') + ` ... and ${errorLines.length - 5} more`
        : errorLines.join(', ');
      banner.textContent = `Auto-fixed ${errorLines.length} error(s) at line ${lineStr}`;
      container.appendChild(banner);
    }

    const tree = this._buildNode(data, null, false, 0);
    container.appendChild(tree);
  },

  _buildNode(value, key, isLast, depth) {
    const type = this._getType(value);

    if (type === 'object' || type === 'array') {
      return this._buildCollapsible(value, key, type, isLast, depth);
    }

    const line = document.createElement('div');
    line.className = 'tree-line';

    const spacer = document.createElement('span');
    spacer.className = 'toggle-spacer';
    line.appendChild(spacer);

    if (key !== null) {
      line.appendChild(this._makeKey(key));
    }

    line.appendChild(this._makeValue(value, type));

    if (!isLast) {
      line.appendChild(this._makeComma());
    }

    return line;
  },

  _buildCollapsible(value, key, type, isLast, depth) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node';
    wrapper.dataset.depth = depth;

    const entries = type === 'array' ? value : Object.keys(value);
    const count = type === 'array' ? value.length : Object.keys(value).length;
    const openBracket = type === 'array' ? '[' : '{';
    const closeBracket = type === 'array' ? ']' : '}';

    // Header line with toggle
    const headerLine = document.createElement('div');
    headerLine.className = 'tree-line';

    const toggle = document.createElement('span');
    toggle.className = 'toggle-btn';
    toggle.textContent = '▼';
    toggle.addEventListener('click', () => this._toggle(wrapper, toggle));
    headerLine.appendChild(toggle);

    if (key !== null) {
      headerLine.appendChild(this._makeKey(key));
    }

    const open = document.createElement('span');
    open.className = 'tree-bracket';
    open.textContent = openBracket;
    headerLine.appendChild(open);

    // Summary (always visible as count indicator)
    const summary = document.createElement('span');
    summary.className = 'tree-summary';
    summary.textContent = `${count} ${type === 'array' ? (count === 1 ? 'item' : 'items') : (count === 1 ? 'key' : 'keys')}`;
    headerLine.appendChild(summary);

    // Collapsed bracket (shown when collapsed)
    const closedBracket = document.createElement('span');
    closedBracket.className = 'tree-bracket';
    closedBracket.textContent = closeBracket;
    closedBracket.style.display = 'none';
    headerLine.appendChild(closedBracket);

    if (!isLast) {
      const collapsedComma = document.createElement('span');
      collapsedComma.className = 'tree-comma';
      collapsedComma.textContent = ',';
      collapsedComma.style.display = 'none';
      closedBracket.after(collapsedComma);
    }

    wrapper.appendChild(headerLine);

    // Children container
    const children = document.createElement('div');
    children.className = 'tree-children';

    if (type === 'array') {
      value.forEach((item, i) => {
        children.appendChild(this._buildNode(item, null, i === value.length - 1, depth + 1));
      });
    } else {
      const keys = Object.keys(value);
      keys.forEach((k, i) => {
        children.appendChild(this._buildNode(value[k], k, i === keys.length - 1, depth + 1));
      });
    }

    wrapper.appendChild(children);

    // Closing bracket line
    const closeLine = document.createElement('div');
    closeLine.className = 'tree-line closing-bracket';

    const closeSpacer = document.createElement('span');
    closeSpacer.className = 'toggle-spacer';
    closeLine.appendChild(closeSpacer);

    const closeSpan = document.createElement('span');
    closeSpan.className = 'tree-bracket';
    closeSpan.textContent = closeBracket;
    closeLine.appendChild(closeSpan);

    if (!isLast) {
      closeLine.appendChild(this._makeComma());
    }

    wrapper.appendChild(closeLine);

    return wrapper;
  },

  _toggle(wrapper, toggleBtn) {
    const children = wrapper.querySelector(':scope > .tree-children');
    const closingBracket = wrapper.querySelector(':scope > .closing-bracket');
    const headerLine = wrapper.querySelector(':scope > .tree-line');
    const summary = headerLine.querySelector('.tree-summary');
    const inlineBracket = summary.nextElementSibling;
    const inlineComma = inlineBracket ? inlineBracket.nextElementSibling : null;

    const isCollapsed = children.classList.contains('collapsed');

    if (isCollapsed) {
      // Expand
      children.classList.remove('collapsed');
      closingBracket.style.display = '';
      inlineBracket.style.display = 'none';
      if (inlineComma) inlineComma.style.display = 'none';
      toggleBtn.textContent = '▼';
    } else {
      // Collapse
      children.classList.add('collapsed');
      closingBracket.style.display = 'none';
      inlineBracket.style.display = '';
      if (inlineComma) inlineComma.style.display = '';
      toggleBtn.textContent = '▶';
    }
  },

  expandAll(container) {
    container.querySelectorAll('.tree-children.collapsed').forEach(el => {
      const wrapper = el.parentElement;
      const toggle = wrapper.querySelector(':scope > .tree-line .toggle-btn');
      if (toggle) this._toggle(wrapper, toggle);
    });
  },

  collapseAll(container) {
    container.querySelectorAll('.tree-children:not(.collapsed)').forEach(el => {
      const wrapper = el.parentElement;
      const toggle = wrapper.querySelector(':scope > .tree-line .toggle-btn');
      if (toggle) this._toggle(wrapper, toggle);
    });
  },

  expandToDepth(container, maxDepth) {
    container.querySelectorAll('.tree-node').forEach(node => {
      const depth = parseInt(node.dataset.depth, 10);
      const children = node.querySelector(':scope > .tree-children');
      const toggle = node.querySelector(':scope > .tree-line .toggle-btn');
      if (!children || !toggle) return;

      const isCollapsed = children.classList.contains('collapsed');

      if (depth < maxDepth && isCollapsed) {
        this._toggle(node, toggle);
      } else if (depth >= maxDepth && !isCollapsed) {
        this._toggle(node, toggle);
      }
    });
  },

  getMaxDepth(container) {
    let max = 0;
    container.querySelectorAll('.tree-node').forEach(node => {
      const d = parseInt(node.dataset.depth, 10);
      if (d > max) max = d;
    });
    return max + 1;
  },

  _makeKey(key) {
    const span = document.createElement('span');
    span.innerHTML = `<span class="tree-key">"${this._escape(key)}"</span><span class="tree-bracket">: </span>`;
    return span;
  },

  _makeValue(value, type) {
    const span = document.createElement('span');
    span.className = `tree-${type}`;

    if (type === 'string') {
      span.textContent = `"${this._escape(value)}"`;
    } else if (type === 'null') {
      span.textContent = 'null';
    } else {
      span.textContent = String(value);
    }

    return span;
  },

  _makeComma() {
    const span = document.createElement('span');
    span.className = 'tree-comma';
    span.textContent = ',';
    return span;
  },

  _getType(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  },

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
