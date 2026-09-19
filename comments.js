// ===== Fitur komentar (baru) =====
// Komentar dikirim ke server (POST /api/comments) dan disimpan di SQLite.
(function () {
  const form = document.getElementById('commentForm');
  if (!form) return;

  const nameInput = document.getElementById('commentName');
  const messageInput = document.getElementById('commentMessage');
  const counter = document.getElementById('commentCounter');
  const submitBtn = document.getElementById('commentSubmit');
  const statusEl = document.getElementById('commentStatus');
  const listEl = document.getElementById('commentList');
  const moreBtn = document.getElementById('commentMore');
  const countEl = document.getElementById('commentCount');

  const API_URL = '/api/comments';
  const PAGE_SIZE = 10;
  const NAME_KEY = 'mudiastiraCommentName';

  let total = 0;
  let lastId = null;
  const shownIds = new Set();

  function setStatus(text, type) {
    statusEl.textContent = text;
    statusEl.className = 'comment-status' + (type ? ' ' + type : '');
  }

  function updateCounter() {
    counter.textContent = `${messageInput.value.length}/${messageInput.maxLength}`;
  }

  function updateCount() {
    countEl.textContent = total > 0 ? `${total} komentar` : '';
  }

  function formatTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function showMessage(text) {
    listEl.textContent = '';
    const p = document.createElement('p');
    p.className = 'comment-empty';
    p.textContent = text;
    listEl.appendChild(p);
  }

  function clearEmptyMessage() {
    const empty = listEl.querySelector('.comment-empty');
    if (empty) empty.remove();
  }

  // Semua teks dari pengguna dimasukkan lewat textContent (aman dari XSS).
  function buildItem(comment) {
    const item = document.createElement('article');
    item.className = 'comment-item';

    const avatar = document.createElement('div');
    avatar.className = 'comment-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = (Array.from(comment.name)[0] || '?').toUpperCase();

    const body = document.createElement('div');

    const head = document.createElement('div');
    head.className = 'comment-head';

    const name = document.createElement('span');
    name.className = 'comment-name';
    name.textContent = comment.name;

    const time = document.createElement('time');
    time.className = 'comment-time';
    time.dateTime = comment.created_at;
    time.textContent = formatTime(comment.created_at);

    head.append(name, time);

    const text = document.createElement('p');
    text.className = 'comment-text';
    text.textContent = comment.message;

    body.append(head, text);
    item.append(avatar, body);
    return item;
  }

  async function loadComments() {
    moreBtn.disabled = true;
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (lastId !== null) params.set('before', String(lastId));

      const response = await fetch(`${API_URL}?${params}`);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();

      total = data.total;
      updateCount();

      if (lastId === null && data.comments.length === 0) {
        showMessage('Belum ada komentar. Jadilah yang pertama!');
      } else {
        clearEmptyMessage();
        data.comments.forEach((comment) => {
          lastId = comment.id;
          if (shownIds.has(comment.id)) return;
          shownIds.add(comment.id);
          listEl.appendChild(buildItem(comment));
        });
      }

      moreBtn.hidden = !data.has_more;
    } catch (error) {
      if (lastId === null) {
        showMessage('Komentar belum bisa dimuat. Pastikan server berjalan (python server.py), lalu muat ulang halaman.');
      }
    } finally {
      moreBtn.disabled = false;
    }
  }

  function rememberName(name) {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch (error) {
      // Abaikan jika browser menolak penyimpanan.
    }
  }

  function restoreName() {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved) nameInput.value = saved;
    } catch (error) {
      // Abaikan jika browser menolak penyimpanan.
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const message = messageInput.value.trim();

    if (!name) {
      setStatus('Nama wajib diisi.', 'error');
      nameInput.focus();
      return;
    }
    if (!message) {
      setStatus('Komentar wajib diisi.', 'error');
      messageInput.focus();
      return;
    }

    submitBtn.disabled = true;
    setStatus('Mengirim komentar...', '');

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message })
      });

      let data = {};
      try {
        data = await response.json();
      } catch (error) {
        // Respons bukan JSON; pakai pesan bawaan di bawah.
      }

      if (!response.ok) {
        setStatus(data.error || 'Komentar gagal dikirim. Coba lagi.', 'error');
        return;
      }

      clearEmptyMessage();
      shownIds.add(data.comment.id);
      listEl.prepend(buildItem(data.comment));
      listEl.scrollTop = 0;

      total += 1;
      updateCount();

      rememberName(name);
      messageInput.value = '';
      updateCounter();
      setStatus('Komentar terkirim. Terima kasih!', 'ok');
    } catch (error) {
      setStatus('Tidak bisa terhubung ke server. Periksa koneksi lalu coba lagi.', 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  messageInput.addEventListener('input', updateCounter);
  moreBtn.addEventListener('click', loadComments);

  restoreName();
  updateCounter();
  loadComments();
})();
