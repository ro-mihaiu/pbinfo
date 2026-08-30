'use strict';

(function () {
  const id = document.currentScript?.dataset?.id || window.PAGE_VIEW_ID;
  if (!id) return;

  fetch(`/api/views?id=${encodeURIComponent(id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  })
    .then((res) => (res.ok ? res.json() : Promise.resolve(null)))
    .then((data) => {
      if (!data) return;
      const el = document.getElementById('view-count');
      if (el) el.textContent = data.views ?? 0;
    })
    .catch((err) => console.error('Failed to register view:', err));
})();
