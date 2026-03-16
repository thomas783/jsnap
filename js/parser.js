/**
 * JSON parsing and error handling
 */
const JSONParser = {
  parse(input) {
    const trimmed = input.trim();
    if (!trimmed) {
      return { ok: false, error: null, data: null, recovered: false };
    }

    try {
      const data = JSON.parse(trimmed);
      return { ok: true, error: null, data, recovered: false };
    } catch (e) {
      const error = this._formatError(e, trimmed);

      // Try to recover by auto-fixing common errors
      const recovery = this._tryRecover(trimmed, error);
      if (recovery) {
        return {
          ok: false,
          error,
          data: recovery.data,
          recovered: true,
          errorLines: recovery.errorLines,
        };
      }

      return { ok: false, error, data: null, recovered: false };
    }
  },

  /**
   * Attempt to fix common JSON errors and re-parse.
   * Returns { data, errorLines } on success, null on failure.
   */
  _tryRecover(input, error) {
    const lines = input.split('\n');
    const fixes = [
      // Try adding missing comma at error line
      () => this._fixMissingComma(lines, error),
      // Try removing trailing comma
      () => this._fixTrailingComma(lines),
      // Try multiple missing commas iteratively
      () => this._fixAllMissingCommas(input),
    ];

    for (const fix of fixes) {
      const result = fix();
      if (result) return result;
    }

    return null;
  },

  _fixMissingComma(lines, error) {
    if (!error.line) return null;
    const fixed = [...lines];
    const prevLine = error.line - 2; // line before error (0-indexed)
    if (prevLine >= 0) {
      const trimmedPrev = fixed[prevLine].trimEnd();
      // Add comma if line ends with a value-like character
      if (/["\d\w\]\}]$/.test(trimmedPrev) && !trimmedPrev.endsWith(',')) {
        fixed[prevLine] = trimmedPrev + ',';
        try {
          const data = JSON.parse(fixed.join('\n'));
          return { data, errorLines: [error.line - 1] };
        } catch (_) {}
      }
    }
    return null;
  },

  _fixTrailingComma(lines) {
    // Remove trailing commas before } or ]
    const fixed = lines.join('\n').replace(/,(\s*[\]}])/g, '$1');
    try {
      const data = JSON.parse(fixed);
      // Find which lines had trailing commas
      const errorLines = [];
      lines.forEach((line, i) => {
        if (/,\s*$/.test(line.trim()) && !/,\s*$/.test(fixed.split('\n')[i]?.trim() || '')) {
          errorLines.push(i + 1);
        }
      });
      return { data, errorLines };
    } catch (_) {}
    return null;
  },

  _fixAllMissingCommas(input) {
    let current = input;
    const errorLines = [];
    let maxAttempts = 1000;

    while (maxAttempts-- > 0) {
      try {
        const data = JSON.parse(current);
        return errorLines.length > 0 ? { data, errorLines } : null;
      } catch (e) {
        const msg = e.message;
        const posMatch = msg.match(/at position (\d+)/);
        if (!posMatch) return null;

        const pos = parseInt(posMatch[1], 10);
        const { line } = this._posToLineCol(current, pos);
        const lines = current.split('\n');
        const prevLine = line - 2;

        if (prevLine >= 0) {
          const trimmedPrev = lines[prevLine].trimEnd();
          if (/["\d\w\]\}]$/.test(trimmedPrev) && !trimmedPrev.endsWith(',')) {
            lines[prevLine] = trimmedPrev + ',';
            errorLines.push(line - 1);
            current = lines.join('\n');
            continue;
          }
        }
        return null;
      }
    }
    return null;
  },

  _formatError(err, input) {
    const msg = err.message;

    // Extract position from "at position N"
    const posMatch = msg.match(/at position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const { line, column } = this._posToLineCol(input, pos);
      const context = this._getContext(input, pos);
      return {
        message: this._humanizeError(msg),
        line,
        column,
        context,
      };
    }

    // Handle "Unexpected end of JSON input"
    if (msg.includes('end of JSON')) {
      const lines = input.split('\n');
      return {
        message: 'Unexpected end — check for missing closing brackets or quotes',
        line: lines.length,
        column: lines[lines.length - 1].length,
        context: null,
      };
    }

    return {
      message: this._humanizeError(msg),
      line: null,
      column: null,
      context: null,
    };
  },

  _posToLineCol(input, pos) {
    let line = 1;
    let column = 1;
    for (let i = 0; i < pos && i < input.length; i++) {
      if (input[i] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    return { line, column };
  },

  _getContext(input, pos) {
    const start = Math.max(0, pos - 20);
    const end = Math.min(input.length, pos + 20);
    const before = input.slice(start, pos);
    const after = input.slice(pos, end);
    const char = pos < input.length ? input[pos] : '';
    return { before, char, after };
  },

  _humanizeError(msg) {
    if (msg.includes('Unexpected token')) {
      const tokenMatch = msg.match(/Unexpected token (.)/);
      const token = tokenMatch ? tokenMatch[1] : '?';
      return `Unexpected character '${token}' — check for missing commas or extra characters`;
    }
    if (msg.includes('Unexpected number')) {
      return 'Unexpected number — keys must be quoted strings';
    }
    if (msg.includes('Unexpected string')) {
      return 'Unexpected string — check for missing commas between values';
    }
    return msg;
  },

  /**
   * Pretty-print parsed JSON with given indent
   */
  stringify(data, indent = 2) {
    return JSON.stringify(data, null, indent);
  }
};
