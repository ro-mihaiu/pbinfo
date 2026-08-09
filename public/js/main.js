'use strict';

(function () {
  // ---------- Theme System ----------
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('pbinfo-theme', theme);
    } catch (e) { /* ignore */ }
  }

  function getInitialTheme() {
    try {
      const saved = localStorage.getItem('pbinfo-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) { /* ignore */ }
    // Follow system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  applyTheme(getInitialTheme());

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      const current = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(current);
    });
  }

  // ---------- Hamburger / Dropdown Menu ----------
  const menuBtn = document.getElementById('menuBtn');
  const dropdownMenu = document.getElementById('dropdownMenu');
  const dropdownOverlay = document.getElementById('dropdownOverlay');
  const dropdownClose = document.getElementById('dropdownClose');

  function openMenu(open) {
    if (!dropdownMenu || !dropdownOverlay) return;
    dropdownMenu.classList.toggle('open', open);
    dropdownOverlay.classList.toggle('open', open);
    dropdownMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (menuBtn) menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (menuBtn) menuBtn.addEventListener('click', function () { openMenu(!dropdownMenu.classList.contains('open')); });
  if (dropdownClose) dropdownClose.addEventListener('click', function () { openMenu(false); });
  if (dropdownOverlay) dropdownOverlay.addEventListener('click', function () { openMenu(false); });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      openMenu(false);
    }
  });

  // Close on outside click manually handled by overlay
  document.addEventListener('click', function (e) {
    if (dropdownMenu && dropdownMenu.classList.contains('open')) {
      if (!dropdownMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        openMenu(false);
      }
    }
  });

  // ---------- Copy Button ----------
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetId = btn.getAttribute('data-copy-target');
      const target = document.getElementById(targetId);
      if (!target) return;
      const text = target.textContent;
      const done = function () {
        const original = btn.textContent;
        btn.textContent = 'Copiat!';
        setTimeout(function () { btn.textContent = original; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
      } else {
        fallbackCopy(text, done);
      }
    });
  });

  function fallbackCopy(text, cb) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
    if (cb) cb();
  }

  // ---------- Client error logging ----------
  window.addEventListener('error', function (e) {
    try {
      fetch('/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'error', message: e.message, file: e.filename, line: e.lineno })
      }).catch(function () {});
    } catch (err) { /* ignore */ }
  });

  // ---------- Syntax highlighting (if Prism loaded) ----------
  if (window.Prism) {
    window.Prism.highlightAll();
  }
})();
