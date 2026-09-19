// Dipindahkan dari <script> di file asli (isi kode tidak diubah).
const googleSearchInlineForm = document.getElementById('googleSearchInlineForm');
const portraitVideo = document.getElementById('portraitVideo');
const portraitVolume = document.getElementById('portraitVolume');

if (portraitVideo && portraitVolume) {
  portraitVideo.loop = true;
  portraitVideo.volume = Number(portraitVolume.value || 0.35);
  portraitVideo.muted = true;

  const tryAutoplayPortrait = () => {
    portraitVideo.muted = true;
    portraitVideo.volume = Number(portraitVolume.value || 0.35);
    portraitVideo.play().catch(() => {
      // Browser memblok autoplay jika belum ada interaksi user.
      // Video tetap bisa diputar saat pengguna menyesuaikan volume.
    });
  };

  tryAutoplayPortrait();

  portraitVolume.addEventListener('input', function () {
    const value = Number(this.value);
    portraitVideo.volume = value;
    portraitVideo.muted = value <= 0;

    if (!portraitVideo.paused) {
      portraitVideo.play().catch(() => {});
    } else if (value > 0) {
      portraitVideo.play().catch(() => {});
    }
  });
}

googleSearchInlineForm.addEventListener('submit', function (event) {
  const input = googleSearchInlineForm.querySelector('input[name="q"]');
  if (!input || !input.value.trim()) {
    event.preventDefault();
    input?.focus();
    return;
  }
});
