/* =====================================================
   MudiasTira | script.js
   Sidebar animasi, ganti page, spider-sense, web-shooter,
   laba-laba gantung, AI mini, hitung umur, mini game.
   ===================================================== */
"use strict";

/* ---------- Shortcut ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- Referensi DOM ---------- */
const htmlEl = document.documentElement;
const body = document.body;

const sidebar = $("#sidebar");
const menuToggle = $("#menuToggle");
const scrim = $("#scrim");
const navIndicator = $("#navIndicator");
const navItems = $$(".nav-item");

const stage = $("#stage");
const pages = $$(".page");
const universeBtn = $("#universeBtn");
const uniName = $("#uniName");
const uniEarth = $("#uniEarth");
const fxLayer = $(".fx-layer");
const webCanvas = $("#webCanvas");
const dangler = $("#dangler");
const toastEl = $("#toast");
const senseBtn = $("#senseBtn");

const portraitVideo = $("#portraitVideo");
const portraitVolume = $("#portraitVolume");

const chatBox = $("#chatBox");
const chatForm = $("#chatForm");
const chatInput = $("#chatInput");
const modeBtns = $$(".mode-btn");
const chips = $$(".chip");

const gameField = $("#gameField");
const gameOverlay = $("#gameOverlay");
const overlayTitle = $("#overlayTitle");
const overlayText = $("#overlayText");
const gameStartBtn = $("#gameStart");
const hudScore = $("#gameScore");
const hudTime = $("#gameTime");
const hudCombo = $("#gameCombo");
const hudBest = $("#gameBest");

/* ---------- Konstanta ---------- */
const PAGES = pages.map((p) => p.dataset.page);
const PAGE_LABEL = { beranda: "Beranda", profil: "Profil", hobi: "Hobi", ai: "AI", umur: "Umur", misi: "Misi", kontak: "Kontak" };

const UNIVERSES = [
  { id: "616", name: "Peter Parker" },
  { id: "1610", name: "Miles Morales" },
  { id: "65", name: "Gwen Stacy" },
  { id: "2099", name: "Miguel O'Hara" },
  { id: "noir", name: "Spider-Man Noir" },
];

const BIRTH = { y: 2010, m: 10, d: 25 }; // 25 November 2010 (index bulan 10 = November)
const ZONE_LABEL = { 420: "WIB", 480: "WITA", 540: "WIT" };
const VILLAINS = ["🦹", "🃏", "🕴️", "🤵", "👤"];
const FRIEND = "👵";
const GAME_DURATION = 40;

/* ---------- State ---------- */
let currentPage = "beranda";
let transitionTimers = [];
let toastTimer = null;
let lastWeb = 0;
let senseCooldown = false;
let uniIndex = 0;

let gState = null;
let best = parseInt(safeGet("mudias_spidey_best"), 10) || 0;

let lastAge = { y: 0, m: 0, d: 0 };
let chatMode = "detail";

/* ---------- Helper ---------- */
function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, val) {
  try { localStorage.setItem(key, val); } catch { /* abaikan */ }
}
function toast(msg, ms = 2200) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
}

/* =====================================================
   SIDEBAR + GANTI PAGE
   ===================================================== */
function moveIndicator(item) {
  if (!item) return;
  navIndicator.style.height = item.offsetHeight + "px";
  navIndicator.style.transform = `translateY(${item.offsetTop}px)`;
}

function updateNav(name) {
  navItems.forEach((item) => {
    const active = item.dataset.page === name;
    item.classList.toggle("is-active", active);
    if (active) moveIndicator(item);
  });
}

function spawnRipple(item, x, y) {
  const rect = item.getBoundingClientRect();
  const r = document.createElement("span");
  r.className = "ripple";
  r.style.left = (x - rect.left) + "px";
  r.style.top = (y - rect.top) + "px";
  item.appendChild(r);
  setTimeout(() => r.remove(), 700);
}

function clearTransition() {
  transitionTimers.forEach(clearTimeout);
  transitionTimers = [];
  pages.forEach((p) => p.classList.remove("is-leaving"));
}

function goPage(name, opts = {}) {
  if (!PAGES.includes(name)) return;
  const next = $(`#page-${name}`);
  const prev = $(`#page-${currentPage}`);
  if (!next || next === prev) return;

  // hentikan mini game kalau keluar dari halaman misi
  if (gState && !gState.over) endGame(true);

  clearTransition();

  const sr = stage.getBoundingClientRect();
  const cx = (opts.x ?? sr.left + sr.width / 2) - sr.left;
  const cy = (opts.y ?? sr.top + sr.height / 2) - sr.top;

  prev.classList.remove("is-active", "is-settled");
  prev.classList.add("is-leaving");

  next.classList.remove("is-settled", "is-leaving");
  next.style.setProperty("--cx", cx + "px");
  next.style.setProperty("--cy", cy + "px");
  next.classList.add("is-active");

  transitionTimers.push(setTimeout(() => prev.classList.remove("is-leaving"), 340));
  transitionTimers.push(setTimeout(() => next.classList.add("is-settled"), 950));

  currentPage = name;
  updateNav(name);

  if (!opts.fromHash) {
    try { history.pushState(null, "", "#" + name); }
    catch { location.hash = name; }
  }
}

function openMobileMenu(open) {
  sidebar.classList.toggle("is-open", open);
  scrim.classList.toggle("show", open);
  menuToggle.setAttribute("aria-expanded", String(open));
}

/* =====================================================
   UNIVERSE + SPIDER-SENSE + EFEK WEB
   ===================================================== */
function applyUniverse(idx, x, y) {
  uniIndex = ((idx % UNIVERSES.length) + UNIVERSES.length) % UNIVERSES.length;
  const u = UNIVERSES[uniIndex];
  htmlEl.dataset.universe = u.id;
  uniName.textContent = u.name;
  uniEarth.textContent = u.id === "noir" ? "Earth-Noir" : `Earth-${u.id}`;
  safeSet("mudias_universe", String(uniIndex));
  if (x != null) hopFlash(x, y);
}

function hopFlash(x, y) {
  const flash = document.createElement("div");
  flash.className = "hop-flash";
  flash.style.setProperty("--hx", x + "px");
  flash.style.setProperty("--hy", y + "px");
  fxLayer.appendChild(flash);
  setTimeout(() => flash.remove(), 900);
}

function addWebLine(x1, y1, x2, y2) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1); line.setAttribute("y1", y1);
  line.setAttribute("x2", x2); line.setAttribute("y2", y2);
  line.setAttribute("pathLength", "1");
  line.setAttribute("class", "web-line");
  webCanvas.appendChild(line);
  setTimeout(() => line.remove(), 1300);
}

function addSplat(x, y) {
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `translate(${x} ${y})`);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d",
    "M0 0L-26 -6M0 0L-20 18M0 0L2 28M0 0L24 16M0 0L28 -8M0 0L-8 -26M0 0L14 -22");
  path.setAttribute("class", "web-splat");
  g.appendChild(path);
  webCanvas.appendChild(g);
  setTimeout(() => g.remove(), 1300);
}

function thwip(x, y) {
  const now = performance.now();
  if (now - lastWeb < 160) return; // jangan spam
  lastWeb = now;
  addWebLine(x + (Math.random() * 120 - 60), -20, x, y); // tembak dari atas layar
  addSplat(x, y);
}

function triggerSense(x, y) {
  if (senseCooldown) return;
  senseCooldown = true;
  body.classList.add("is-sensing");
  thwip(x, y);
  toast("Spider-Sense aktif! ⚡🕸️", 1600);
  setTimeout(() => body.classList.remove("is-sensing"), 1950);
  setTimeout(() => { senseCooldown = false; }, 2200);
}

/* =====================================================
   LABA-LABA GANTUNG (mengikuti kursor)
   ===================================================== */
const danglerState = { x: -100, y: -100, tx: -100, ty: -100, rot: 0, raf: null };

function danglerLoop() {
  const d = danglerState;
  d.x += (d.tx - d.x) * 0.16;
  d.y += (d.ty - d.y) * 0.16;
  d.rot += ((d.tx - d.x) * 0.35 - d.rot) * 0.2;
  const clampedRot = Math.max(-25, Math.min(25, d.rot));
  dangler.style.transform = `translate(${d.x}px, ${d.y}px) rotate(${clampedRot}deg)`;
  if (Math.abs(d.tx - d.x) > 0.3 || Math.abs(d.ty - d.y) > 0.3) {
    d.raf = requestAnimationFrame(danglerLoop);
  } else {
    d.raf = null;
  }
}

function bindDangler() {
  if (matchMedia("(hover: none)").matches) return; // skip di layar sentuh
  document.addEventListener("mousemove", (e) => {
    const d = danglerState;
    d.tx = e.clientX;
    d.ty = e.clientY;
    if (!d.raf) d.raf = requestAnimationFrame(danglerLoop);
  });
}

/* =====================================================
   UMUR (25 November 2010, otomatis zona WIB/WITA/WIT)
   ===================================================== */
function zoneLabel() {
  const off = -new Date().getTimezoneOffset();
  return ZONE_LABEL[off] || `UTC+${off / 60}`;
}

function diffYMD(birth, now) {
  let y = now.getFullYear() - birth.y;
  let m = now.getMonth() - birth.m;
  let d = now.getDate() - birth.d;
  if (d < 0) {
    m--;
    d += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}

function updateAge() {
  const now = new Date();
  const { y, m, d } = diffYMD(BIRTH, now);
  lastAge = { y, m, d };

  $("#ageYears").textContent = y;
  $("#ageMonths").textContent = m;
  $("#ageDays").textContent = d;
  $("#nextAge").textContent = y + 1;

  $("#ageSummary").textContent =
    `Saat ini saya berumur ${y} tahun ${m} bulan ${d} hari (dihitung otomatis dari 25 November 2010).`;

  const isBirthday = now.getMonth() === 10 && now.getDate() === 25;
  let nextB = new Date(now.getFullYear(), 10, 25);
  if (isBirthday || now > nextB) nextB = new Date(now.getFullYear() + 1, 10, 25);

  if (isBirthday) {
    $("#nextBirthdayText").textContent =
      `🎂 Hari ini ulang tahun saya! Saya resmi berumur ${y} tahun. Ulang tahun berikutnya: 25 November ${nextB.getFullYear()}.`;
  } else {
    const ms = nextB - now;
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    $("#nextBirthdayText").textContent =
      `Ulang tahun berikutnya (ke-${y + 1}): 25 November ${nextB.getFullYear()} — tersisa ${days} hari ${hours} jam ${mins} menit lagi.`;
  }

  $("#liveClockText").textContent =
    `Waktu sekarang (${zoneLabel()}): ${now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} • ${now.toLocaleTimeString("id-ID")}`;
}

/* =====================================================
   AI MINI (simulasi, tanpa API)
   ===================================================== */
function addMsg(who, text) {
  const div = document.createElement("div");
  div.className = `msg ${who}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  div.appendChild(bubble);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

const AI_ANSWERS = [
  {
    test: (q) => /(versi|semua).*(spider|spidey)|spider.*versi/.test(q),
    reply: () =>
      "Daftar versi Spider-Man yang terkenal:\n" +
      "1. Peter Parker (Earth-616) — Spider-Man asli.\n" +
      "2. Miles Morales (Earth-1610) — Spidey baru dengan kekuatan venom strike.\n" +
      "3. Gwen Stacy / Spider-Gwen (Earth-65) — penari balet yang jadi pahlawan.\n" +
      "4. Miguel O'Hara (Earth-2099) — Spider-Man masa depan tahun 2099.\n" +
      "5. Spider-Man Noir — versi tahun 1930-an, hitam putih dan penuh misteri.\n" +
      "6. Peter B. Parker — versi Peter yang sudah lebih tua di film Into the Spider-Verse.",
  },
  {
    test: (q) => /miles/.test(q),
    reply: () =>
      "Miles Morales adalah Spider-Man dari Earth-1610. Ia remaja Afro-Latin yang digigit laba-laba berbeda, punya kekuatan venom strike (sengatan listrik) dan kamuflase, selain kemampuan Spider-Man biasa. Miles belajar dari Peter B. Parker dan akhirnya jadi Spidey dunianya sendiri.",
  },
  {
    test: (q) => /noir/.test(q),
    reply: () =>
      "Spider-Man Noir berasal dari dunia tahun 1930-an (Earth-90214). Dunianya hitam putih, gelap, dan bergaya detektif. Ia memakai topeng kain, jaket kulit, dan senjata era lama — tapi tetap punya prinsip yang sama: dengan kekuatan besar datang tanggung jawab besar.",
  },
  {
    test: (q) => /gwen/.test(q),
    reply: () =>
      "Gwen Stacy atau Spider-Gwen datang dari Earth-65. Di dunianya, Gwen-lah yang digigit laba-laba radioaktif, bukan Peter. Ia penari drum sekaligus pahlawan dengan kostum putih-pink-putih yang ikonik.",
  },
  {
    test: (q) => /peter/.test(q),
    reply: () =>
      "Peter Parker adalah Spider-Man asli dari Earth-616. Remaja jenius yang digigit laba-laba radioaktif, kehilangan Paman Ben, lalu belajar bahwa 'dengan kekuatan besar datang tanggung jawab besar'. Ia juru foto, ilmuwan, dan pahlawan paling ikonik di Marvel.",
  },
  {
    test: (q) => /mudiastira|siapa kamu/.test(q),
    reply: () =>
      "MudiasTira adalah pemilik web profil ini! Lahir 25 November 2010, hobi bermain game, belajar bahasa Inggris, dan ngoding aplikasi. Gaya hidupnya semangat dan berani, terinspirasi Spider-Man. Kamu bisa cek halaman Profil untuk lebih dekat!",
  },
  {
    test: (q) => /umur|usia|berapa tahun/.test(q),
    reply: () =>
      `Sekarang saya berumur ${lastAge.y} tahun ${lastAge.m} bulan ${lastAge.d} hari. Hitungannya otomatis di halaman Umur, lengkap dengan hitung mundur ulang tahun berikutnya!`,
  },
  {
    test: (q) => /hobi/.test(q),
    reply: () =>
      "Hobi saya tiga: bermain game (melatih strategi dan refleks), belajar bahasa Inggris (buka peluang masa depan), dan coding aplikasi (biar ide bisa jadi karya nyata). Semuanya ada di halaman Hobi!",
  },
  {
    test: (q) => /instagram|ig|sosmed/.test(q),
    reply: () =>
      "Instagram saya @diastiredwithworld — tombolnya ada di halaman Profil dan Kontak. Klik saja, langsung terbuka!",
  },
  {
    test: (q) => /^(halo|hai|hi|hei|hello)\b/.test(q),
    reply: () => "Halo juga! 👋 Saya AI mini di web MudiasTira. Tanya apa saja — soal Spider-Man, hobi, umur, atau sekadar ngobrol.",
  },
  {
    test: (q) => /spider[- ]?sense/.test(q),
    reply: () => "Spider-Sense adalah indra peringatan dini Spidey — rasanya seperti keselekan di belakang leher saat bahaya mendekat. Coba klik tombol 'Spider-Sense' di Beranda untuk merasakan efeknya di web ini! ⚡",
  },
  {
    test: (q) => /web[- ]?shooter|misi|game/.test(q),
    reply: () => "Buka halaman Misi di sidebar! Kamu jadi Spidey yang menembakkan web ke penjahat — tapi jangan sampai kena Bibi May ya. Kombo 3 tembakan beruntun bikin skor naik cepat!",
  },
];

function makeReply(question) {
  const q = question.toLowerCase();
  let base = null;
  for (const a of AI_ANSWERS) {
    if (a.test(q)) { base = a.reply(); break; }
  }
  if (!base) {
    base =
      `Soal "${question}" menarik juga! Aku cuma AI mini di web profil ini, jadi pengetahuanku terbatas. ` +
      "Coba tanya soal Spider-Man (Peter, Miles, Gwen, 2099, Noir), hobi saya, umur saya, atau halaman Misi.";
  }
  if (chatMode === "detail") {
    base += "\n\nVersi detail: hal-hal seru memang paling asyik dipelajari pelan-pelan — sama seperti Peter Parker yang belajar jadi pahlawan sedikit demi sedikit. Kalau mau lebih spesifik, tanya lagi ya!";
  } else {
    base = base.split("\n\n")[0]; // mode singkat: buang paragraf tambahan
  }
  return base;
}

function botThink(question) {
  const typing = addMsg("bot", "Mengetik... 🕸️");
  setTimeout(() => {
    typing.querySelector(".bubble").textContent = makeReply(question);
    chatBox.scrollTop = chatBox.scrollHeight;
  }, 500 + Math.random() * 500);
}

/* =====================================================
   MINI GAME: MISI WEB-SHOOTER
   ===================================================== */
function setHUD() {
  if (!gState) return;
  hudScore.textContent = gState.score;
  hudTime.textContent = gState.time;
  hudCombo.textContent = "x" + gState.combo;
  hudBest.textContent = best;
}

function startGame() {
  gState = { score: 0, time: GAME_DURATION, combo: 1, over: false, spawnT: null, tickT: null };
  $$(".target", gameField).forEach((t) => t.remove());
  gameOverlay.classList.add("hidden");
  setHUD();

  gState.spawnT = setInterval(spawnTarget, 620);
  gState.tickT = setInterval(() => {
    gState.time--;
    hudTime.textContent = gState.time;
    if (gState.time <= 0) endGame(false);
  }, 1000);
}

function spawnTarget() {
  if (!gState || gState.over) return;
  const w = gameField.clientWidth;
  const h = gameField.clientHeight;
  if (w < 100 || h < 100) return;

  const S = 58, pad = 24;
  const isFriend = Math.random() < 0.18;

  const t = document.createElement("button");
  t.type = "button";
  t.className = "target" + (isFriend ? " friend" : "");
  t.textContent = isFriend ? FRIEND : VILLAINS[Math.floor(Math.random() * VILLAINS.length)];

  const life = Math.max(750, 1500 - gState.score * 12);
  t.style.setProperty("--life", life + "ms");
  t.style.left = (pad + Math.random() * (w - S - pad * 2)) + "px";
  t.style.top = (pad + Math.random() * (h - S - pad * 2)) + "px";

  const escapeTimer = setTimeout(() => {
    t.remove();
    if (gState && !gState.over && !isFriend) {
      gState.combo = 1;
      hudCombo.textContent = "x1";
    }
  }, life + 250);

  t.addEventListener("click", (e) => {
    e.stopPropagation();
    clearTimeout(escapeTimer);
    hitTarget(t, isFriend);
  });

  gameField.appendChild(t);
  const all = $$(".target", gameField);
  if (all.length > 6) all[0].remove();
}

function floatScore(x, y, text, color) {
  const el = document.createElement("span");
  el.className = "float-score";
  el.textContent = text;
  if (color) el.style.color = color;
  el.style.left = x + "px";
  el.style.top = y + "px";
  gameField.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function hitTarget(t, isFriend) {
  if (!gState || gState.over) return;
  const r = t.getBoundingClientRect();
  const fr = gameField.getBoundingClientRect();
  const fx = r.left - fr.left + r.width / 2;
  const fy = r.top - fr.top;

  if (isFriend) {
    gState.combo = 1;
    hudCombo.textContent = "x1";
    gameField.classList.add("flash-bad");
    setTimeout(() => gameField.classList.remove("flash-bad"), 300);
    floatScore(fx, fy, "Kena Bibi May!", "#ef4444");
    toast("Aduh! Itu Bibi May, bukan penjahat! 😱", 1600);
  } else {
    floatScore(fx, fy, "+" + gState.combo);
    gState.score += gState.combo;
    gState.combo = Math.min(5, gState.combo + 1);
    hudScore.textContent = gState.score;
    hudCombo.textContent = "x" + gState.combo;
  }

  t.classList.add("caught");
  setTimeout(() => t.remove(), 220);
}

function endGame(aborted) {
  if (!gState || gState.over) return;
  gState.over = true;
  clearInterval(gState.spawnT);
  clearInterval(gState.tickT);
  $$(".target", gameField).forEach((t) => t.remove());

  if (aborted) {
    overlayTitle.textContent = "Misi Dibatalkan";
    overlayText.textContent = `Skor: ${gState.score} • Rekor: ${best}. Kembali lagi kalau siap, Spidey!`;
  } else if (gState.score > best) {
    best = gState.score;
    safeSet("mudias_spidey_best", String(best));
    overlayTitle.textContent = "Rekor Baru! 🕸️";
    overlayText.textContent = `Skor akhir: ${gState.score}. Kamu Spidey yang hebat!`;
  } else {
    overlayTitle.textContent = "Misi Selesai!";
    overlayText.textContent = `Skor akhir: ${gState.score} • Rekor: ${best}. Coba pecahkan rekornya!`;
  }

  hudBest.textContent = best;
  gameStartBtn.textContent = "Main Lagi";
  gameOverlay.classList.remove("hidden");
}

/* =====================================================
   EVENT BINDING + INIT
   ===================================================== */
function init() {
  // --- Sidebar nav (dengan animasi klik) ---
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page !== currentPage) goPage(page, { x: e.clientX, y: e.clientY });
      item.classList.remove("pop");
      void item.offsetWidth; // restart animasi
      item.classList.add("pop");
      spawnRipple(item, e.clientX, e.clientY);
      openMobileMenu(false);
    });
  });

  // --- Tombol CTA di dalam halaman (Lihat Profil, dsb.) ---
  $$("#stage a[href^='#']").forEach((a) => {
    const target = a.getAttribute("href").slice(1);
    if (!PAGES.includes(target)) return; // link instagram dsb. dibiarkan normal
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (target !== currentPage) goPage(target, { x: e.clientX, y: e.clientY });
    });
  });

  // --- Menu mobile + scrim + Esc ---
  menuToggle.addEventListener("click", () =>
    openMobileMenu(!sidebar.classList.contains("is-open")));
  scrim.addEventListener("click", () => openMobileMenu(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") openMobileMenu(false);
  });

  // --- Hash / back-forward browser ---
  window.addEventListener("hashchange", () => {
    const name = location.hash.replace("#", "");
    if (PAGES.includes(name) && name !== currentPage) goPage(name, { fromHash: true });
  });

  // --- Ganti universe ---
  universeBtn.addEventListener("click", (e) => {
    const r = universeBtn.getBoundingClientRect();
    applyUniverse(uniIndex + 1, r.left + r.width / 2, r.top + r.height / 2);
    const u = UNIVERSES[uniIndex];
    toast(`Loncat universe: ${u.name} (${u.id === "noir" ? "Earth-Noir" : "Earth-" + u.id}) 🕷️`);
  });

  // --- Spider-Sense ---
  senseBtn.addEventListener("click", (e) => triggerSense(e.clientX, e.clientY));

  // --- Web shooter saat klik di area halaman ---
  stage.addEventListener("pointerdown", (e) => thwip(e.clientX, e.clientY));

  // --- Instagram (link tidak diubah, cuma kasih efek + toast) ---
  $$(".btn-instagram").forEach((btn) => {
    btn.addEventListener("click", () => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      addWebLine(cx, r.top - 160, cx, r.top + r.height / 2);
      addSplat(cx, r.top + r.height / 2);
      toast("Membuka Instagram @diastiredwithworld... 🕸️");
    });
  });

  // --- Google search: jangan kirim kalau kosong (link tetap ke google.com) ---
  $$("#googleSearchForm, #googleSearchInlineForm").forEach((form) => {
    form.addEventListener("submit", (e) => {
      if (!form.q.value.trim()) {
        e.preventDefault();
        toast("Ketik dulu yang mau dicari di Google 🕷️");
      }
    });
  });

  // --- Volume video portrait ---
  portraitVolume.addEventListener("input", () => {
    portraitVideo.muted = false;
    portraitVideo.volume = parseFloat(portraitVolume.value);
    portraitVideo.play().catch(() => {});
  });

  // --- AI mini ---
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      chatMode = btn.dataset.mode;
      toast(chatMode === "detail" ? "Mode: jawab detail 📖" : "Mode: jawab singkat ⚡", 1400);
    });
  });
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chatInput.value = chip.dataset.ask;
      chatForm.requestSubmit();
    });
  });
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = chatInput.value.trim();
    if (!q) return;
    addMsg("user", q);
    chatInput.value = "";
    botThink(q);
  });

  // --- Mini game ---
  gameStartBtn.addEventListener("click", startGame);
  gameField.addEventListener("click", () => {
    if (gState && !gState.over) {
      gState.combo = 1;
      hudCombo.textContent = "x1";
    }
  });

  // --- Indikator nav mengikuti ukuran layar ---
  window.addEventListener("resize", () =>
    moveIndicator($(".nav-item.is-active")));
  window.addEventListener("load", () =>
    moveIndicator($(".nav-item.is-active")));

  // --- Laba-laba gantung ---
  bindDangler();

  // --- State awal ---
  const savedUni = parseInt(safeGet("mudias_universe"), 10);
  if (!Number.isNaN(savedUni)) applyUniverse(savedUni);

  updateNav(currentPage);
  moveIndicator($(".nav-item.is-active"));

  const initialHash = location.hash.replace("#", "");
  if (PAGES.includes(initialHash) && initialHash !== currentPage) {
    goPage(initialHash, { fromHash: true });
  }

  hudBest.textContent = best;
  updateAge();
  setInterval(updateAge, 1000);
}

init();
