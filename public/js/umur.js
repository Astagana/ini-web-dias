// Dipindahkan dari <script> di file asli (isi kode tidak diubah).
// ===== Umur berjalan otomatis mengikuti waktu nyata (WIB/WITA/WIT) =====
const birthDate = new Date(2010, 10, 25); // 25 November 2010 (bulan 0-index: 10 = November)

function getViewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';
  } catch (error) {
    return 'Asia/Jakarta';
  }
}

// Ambil waktu "sekarang" sesuai zona waktu pengunjung (otomatis WIB/WITA/WIT
// tergantung lokasi perangkat yang membuka website)
function getZonedNow(timeZone) {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const hour = Number(parts.hour) === 24 ? 0 : Number(parts.hour);
  return new Date(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second)
  );
}

function diffInMonthsDays(start, end) {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }

  if (months < 0) months = 0;

  return { months, days };
}

function getAgeParts(now) {
  const hadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());

  let years = now.getFullYear() - birthDate.getFullYear();
  if (!hadBirthdayThisYear) years -= 1;

  const lastBirthday = new Date(birthDate.getFullYear() + years, birthDate.getMonth(), birthDate.getDate());
  const { months, days } = diffInMonthsDays(lastBirthday, now);

  return { years, months, days };
}

function getNextBirthdayInfo(now) {
  const thisYearBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  let target = thisYearBirthday;

  if (target <= now) {
    target = new Date(now.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
  }

  const remainingMs = target.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60 * 24)));
  const months = Math.floor(remainingDays / 30);
  const days = remainingDays % 30;
  const nextAge = target.getFullYear() - birthDate.getFullYear();

  return { nextAge, months, days, targetDate: target, remainingDays };
}

function updateAge() {
  const timeZone = getViewerTimeZone();
  const now = getZonedNow(timeZone);
  const age = getAgeParts(now);
  const nextBirthday = getNextBirthdayInfo(now);

  document.getElementById('ageYears').textContent = age.years;
  document.getElementById('ageMonths').textContent = age.months;
  document.getElementById('ageDays').textContent = age.days;
  document.getElementById('nextAge').textContent = nextBirthday.nextAge;

  document.getElementById('ageSummary').textContent =
    `Saat ini saya berusia ${age.years} tahun, ${age.months} bulan, dan ${age.days} hari.`;

  document.getElementById('nextBirthdayText').textContent =
    `Saya akan naik umur lagi dalam ${nextBirthday.months} bulan ${nextBirthday.days} hari, tepatnya pada ${nextBirthday.targetDate.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    })}.`;

  const jamText = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const tanggalText = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('liveClockText').textContent =
    `Waktu saat ini: ${tanggalText}, pukul ${jamText} (zona waktu terdeteksi: ${timeZone}).`;
}

updateAge();
// Update tiap detik supaya jam berjalan real-time, dan otomatis menambah
// hari/bulan/tahun begitu melewati tengah malam sesuai zona waktu pengunjung.
setInterval(updateAge, 1000);
