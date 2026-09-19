// Dipindahkan dari <script> di file asli (isi kode tidak diubah).
const googleSearchForm = document.getElementById('googleSearchForm');

function openGoogleSearch(query) {
  const text = (query || '').trim();
  if (!text) return;
  window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
}

googleSearchForm.addEventListener('submit', function (event) {
  const input = googleSearchForm.querySelector('input[name="q"]');
  if (!input || !input.value.trim()) {
    event.preventDefault();
    input?.focus();
    return;
  }
});

// ===== Sidebar (baru) =====
(function () {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !toggle || !overlay) return;

  const mobileQuery = window.matchMedia('(max-width: 980px)');

  function setOpen(open) {
    document.body.classList.toggle('sidebar-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Tutup menu' : 'Buka menu');
  }

  toggle.addEventListener('click', function () {
    setOpen(!document.body.classList.contains('sidebar-open'));
  });

  overlay.addEventListener('click', function () {
    setOpen(false);
  });

  sidebar.addEventListener('click', function (event) {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setOpen(false);
  });

  function onViewportChange() {
    if (!mobileQuery.matches) setOpen(false);
  }

  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', onViewportChange);
  } else {
    mobileQuery.addListener(onViewportChange);
  }
})();
