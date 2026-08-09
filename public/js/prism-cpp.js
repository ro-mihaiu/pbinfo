/* Minimal Prism-like syntax highlighter for C++ code blocks.
   Lightweight standalone implementation to keep the app dependency-free. */
'use strict';

(function () {
  const C_LIKE = /(?:[a-zA-Z_]\w*|::)/;

  const TYPES = new Set([
    'int', 'float', 'double', 'char', 'bool', 'void', 'long', 'short',
    'unsigned', 'signed', 'size_t', 'auto', 'string', 'vector', 'bool',
    'stack', 'queue', 'deque', 'list', 'map', 'set', 'pair', 'iterator'
  ]);

  const KEYWORDS = new Set([
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'return', 'class', 'struct', 'namespace', 'using', 'public', 'private',
    'protected', 'template', 'typename', 'new', 'delete', 'this', 'true',
    'false', 'const', 'static', 'inline', 'virtual', 'friend', 'operator',
    'default', 'enum', 'union', 'typedef', 'extern', 'sizeof', 'NULL', 'nullptr'
  ]);

  const PREPROCESSOR = /^\s*#[\s\S]+?(?=\n|$)/;

  // Single-pass tokenizer: each token is consumed exactly once so the
  // inserted <span> markup is never re-processed by later rules.
  // Order matters: comments, strings, preprocessor, numbers, keywords.
  const TOKEN_RE =
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(^\s*#\s*\w+)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*\b)/gm;

  function highlight(text) {
    const escaped = escapeHtml(text);
    return String(escaped).replace(TOKEN_RE, function (match, comment, str, prep, num, word) {
      if (comment !== undefined) return '<span class="tok-comment">' + comment + '</span>';
      if (str !== undefined) return '<span class="tok-string">' + str + '</span>';
      if (prep !== undefined) return '<span class="tok-preprocessor">' + prep + '</span>';
      if (num !== undefined) return '<span class="tok-number">' + num + '</span>';
      if (word !== undefined) {
        if (KEYWORDS.has(word)) return '<span class="tok-keyword">' + word + '</span>';
        if (TYPES.has(word)) return '<span class="tok-type">' + word + '</span>';
      }
      return match;
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"');
  }

  function highlightAll() {
    document.querySelectorAll('code.language-cpp, code.language-c').forEach(function (el) {
      if (el.dataset.highlighted) return;
      el.innerHTML = highlight(el.textContent);
      el.dataset.highlighted = '1';
    });
  }

  window.Prism = window.Prism || {};
  window.Prism.highlight = highlight;
  window.Prism.highlightAll = highlightAll;

  // Auto-highlight on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlightAll);
  } else {
    highlightAll();
  }
})();
