// Dipindahkan dari <script> di file asli (isi kode tidak diubah).
// Gemini API Configuration
const GEMINI_API_KEY = 'AQ.Ab8RN6LggTyUivK-IGYUAVItkFCFHpnm5PgFgva_yw5Cr-T62g'; // Ganti dengan API key Anda
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
async function askGemini(question) {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: question
          }]
        }]
      })
    });

    if (!response.ok) {
      return `Maaf, terjadi kesalahan saat mengakses Gemini. Status: ${response.status}`;
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    }

    return 'Gemini tidak memberikan respons yang jelas. Silakan coba lagi.';
  } catch (error) {
    return `Error: ${error.message}. Pastikan API key Gemini sudah benar.`;
  }
}

const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatBox = document.getElementById('chatBox');

function addMessage(message, sender = 'bot') {
  const wrapper = document.createElement('div');
  wrapper.className = `msg ${sender}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = message;

  wrapper.appendChild(bubble);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function solveMathQuestion(question) {
  const raw = question
    .replace(/,/g, '.')
    .replace(/\s+/g, '')
    .replace(/x/gi, '*')
    .replace(/÷/g, '/')
    .replace(/kali/gi, '*')
    .replace(/bagi/gi, '/')
    .replace(/tambah/gi, '+')
    .replace(/kurang/gi, '-')
    .replace(/sama dengan/gi, '=')
    .replace(/hasilnya/gi, '')
    .replace(/berapa/gi, '');

  const expression = raw.replace(/[^0-9+\-*/().%]/g, '');

  if (!expression || expression === '') {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${expression});`)();
    if (Number.isFinite(result)) {
      return `Hasilnya adalah ${Number(result.toFixed(10))}.`;
    }
  } catch (error) {
    return null;
  }

  return null;
}

function getMemory() {
  try {
    const saved = sessionStorage.getItem('mudiastiraMemory');
    return saved ? JSON.parse(saved) : { name: 'teman', topics: [], facts: {} };
  } catch (error) {
    return { name: 'teman', topics: [], facts: {} };
  }
}

function saveMemory(memory) {
  try {
    sessionStorage.setItem('mudiastiraMemory', JSON.stringify(memory));
  } catch (error) {
    // Abaikan jika browser menolak penyimpanan.
  }
}

function detectTopic(lower) {
  const topicPatterns = {
    matematika: /(matematika|rumus|aljabar|geometri|hitung|angka|deret|persamaan|statistik|integral|akar|kali|bagi|kurang|tambah|pangkat|akar|pecahan)/,
    ipa: /(ipa|biologi|fisika|kimia|sains|alam|sel|reaksi|energi|zat|planet|gravitasi|atom|molekul|cahaya|bunyi)/,
    sejarah: /(sejarah|perang|kerajaan|zaman|dinasti|kolonial|indonesia|masa lalu|penjajahan|kemerdekaan|revolusi)/,
    tokoh: /(tokoh|biografi|ilmuwan|presiden|penulis|musisi|artis|atlet|panutan|figur|newton|einstein|gandi|soekarno|shakespeare|mozart|pelari|penemunya|penciptanya|curie|darwin|tesla|churchill|hawking|da vinci|galileo)/,
    sosial: /(sosial|geografi|ekonomi|pkn|politik|masyarakat|budaya|demografi|negara|pemerintah|hukum|pajak)/,
    coding: /(coding|program|kode|javascript|html|css|python|software|developer|algoritma|database|function|variable|loop|array)/,
    game: /(game|gaming|esport|strategi|level|karakter|main|bermain|pemain)/,
    bahasa: /(bahasa inggris|english|grammar|kosakata|tenses|dialog|bahasa|vocab|pronunciation|speaking)/,
    teknologi: /(teknologi|ai|artificial intelligence|robot|internet|gadget|app|cyber|software|digital|aplikasi|website)/,
    motivasi: /(motivasi|semangat|jadwal|cara belajar|sukses|disiplin|konsisten|produktif|tekun|kerja keras|usaha)/,
    psikologi: /(psikologi|mental|emosi|motivasi diri|kepercayaan diri|stress|konflik|perasaan|pikiran|depresi)/,
    umum: /(apa|siapa|kapan|mengapa|bagaimana|jelaskan|definisi|arti|contoh|kenapa|gimana)/
  };

  for (const [key, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(lower)) {
      return key;
    }
  }

  return 'umum';
}

function interpretImplicitQuestion(question) {
  const lower = question.toLowerCase();
  
  // Deteksi pertanyaan singkat atau kalimat yang bukan tanya formal
  if (lower.match(/^([\w\s]+)[\?!.]*$/) && lower.split(' ').length <= 4) {
    // Deteksi konteks dari kata kunci
    if (/\d+\s*[+\-*/]\s*\d+|\d+\s*=/.test(question)) {
      return 'hitung ini untuk saya';
    }
    if (lower.match(/^(contoh|misalnya|seperti apa|gimana|caranya)/)) {
      return 'berikan contoh tentang ' + question;
    }
    if (lower.match(/^(mengapa|kenapa|alasan|sebab)/)) {
      return 'jelaskan mengapa ' + question;
    }
    if (lower.match(/^(apa|apa itu|apa saja)/)) {
      return 'jelaskan tentang ' + question;
    }
    if (lower.match(/^(siapa|siapa itu)/)) {
      return 'siapa itu ' + question;
    }
  }

  // Deteksi perintah singkat yang bukan pertanyaan formal
  if (lower.match(/^[a-z\s]+$/) && !lower.includes('?') && lower.split(' ').length <= 5) {
    const keywords = lower.split(' ');
    if (keywords.some(k => ['jelaskan', 'terangkan', 'sebutkan', 'berikan', 'buatkan', 'tuliskan'].includes(k))) {
      return question; // Sudah perintah jelas
    }
    // Anggap sebagai topik yang ingin dipelajari
    return 'jelaskan tentang ' + question;
  }

  return question;
}

function buildStructuredAnswer(shortAnswer, detail, example, tip, detailed = false) {
  const parts = [`Jawaban singkat: ${shortAnswer}`];
  if (detail) parts.push(`\n\nPenjelasan: ${detail}`);
  if (detailed) {
    if (example) parts.push(`\n\nContoh konkret: ${example}`);
    if (tip) parts.push(`\n\nTips yang bisa langsung dipraktikkan: ${tip}`);
    parts.push('\n\nLangkahnya: pahami inti masalah, cari hubungan sebab-akibat, lalu terapkan ke contoh yang relevan.');
  } else {
    if (example) parts.push(`\n\nContoh: ${example}`);
    if (tip) parts.push(`\n\nTips: ${tip}`);
  }
  parts.push('\n\nKalau mau, saya bisa lanjutkan dengan versi yang lebih sederhana, lebih detail, atau dibuat dalam bentuk poin-poin.');
  return parts.join('');
}

function handleFamousFigures(question, detailed = true) {
  const lower = question.toLowerCase();
  const figures = {
    'albert einstein': {
      short: 'Albert Einstein adalah ilmuwan fisika revolusioner yang menemukan teori relativitas.',
      detail: 'Albert Einstein (1879-1955) adalah fisikawan Jerman yang mengubah cara kita memahami ruang, waktu, dan gravitasi. Teori relativitas khususnya dan teori relativitas umum menunjukkan bahwa waktu dan ruang bersifat relatif, bukan absolut. Ia juga menghasilkan rumus terkenal E=mc², yang menunjukkan hubungan antara energi dan massa.',
      example: 'Teori relativitasnya menjelaskan bahwa tidak ada kecepatan yang lebih cepat dari cahaya, dan waktu dapat berjalan lebih lambat pada kecepatan tinggi.',
      tip: 'Belajar dari tokoh ini: keingintahuan tanpa batas dan inovasi pemikiran membuka jalan menuju penemuan besar.'
    },
    'isaac newton': {
      short: 'Isaac Newton adalah ilmuwan Inggris yang menemukan hukum gravitasi dan gerakan.',
      detail: 'Isaac Newton (1642-1727) adalah ilmuwan Inggris yang merevolusi sains melalui hukum-hukum gerak dan gravitasi universal. Karya utamanya "Philosophiæ Naturalis Principia Mathematica" menjadi fondasi fisika klasik. Ia juga mengembangkan kalkulus dan teori cahaya.',
      example: 'Hukum gravitasi Newton menjelaskan mengapa benda jatuh ke bumi dan mengapa planet beredar mengelilingi matahari.',
      tip: 'Belajar dari Newton: dedikasi terhadap penelitian dan kemampuan menghubungkan pola alam menciptakan teori yang bertahan berabad-abad.'
    },
    'marie curie': {
      short: 'Marie Curie adalah ilmuwan Polandia yang menemukan radioaktivitas dan elemen-elemen baru.',
      detail: 'Marie Curie (1867-1934) adalah ilmuwan Polandia-Perancis yang memenangkan dua hadiah Nobel, satu-satunya wanita yang mencapai prestasi ini di masanya. Ia melakukan penelitian tentang radioaktivitas, menemukan elemen polonium dan radium, serta membuka jalan bagi penggunaan radioaktivitas dalam kedokteran.',
      example: 'Penelitiannya tentang radioaktivitas membuka kemungkinan penggunaan energi nuklir dan terapi kanker modern.',
      tip: 'Belajar dari Curie: ketekunan menghadapi tantangan, terutama sebagai wanita di dunia sains, membuahkan kontribusi luar biasa.'
    },
    'leonardo da vinci': {
      short: 'Leonardo da Vinci adalah seniman, ilmuwan, dan penemu Renaisans yang multitalenta.',
      detail: 'Leonardo da Vinci (1452-1519) adalah seorang jenius Renaisans yang ahli di bidang seni, sains, teknik, anatomi, dan arsitektur. Ia melukis karya-karya ikonik seperti "Mona Lisa" dan "Last Supper", sekaligus membuat skema mesin dan studi anatomi yang jauh melampaui zamannya.',
      example: 'Sketsa mesin terbangnya menunjukkan pemahaman mendalam tentang aerodinamika, meskipun teknologi belum memungkinkan realisasinya.',
      tip: 'Belajar dari da Vinci: menggabungkan seni dan sains, serta kemauan belajar di berbagai bidang menciptakan kreativitas tanpa batas.'
    },
    'galileo galilei': {
      short: 'Galileo Galilei adalah astronom dan fisikawan Itali yang mendukung heliosentrisme.',
      detail: 'Galileo Galilei (1564-1642) adalah astronom dan fisikawan Itali yang menggunakan teleskop untuk mengamati langit dan menemukan bukti pendukung teori heliosentrisme. Ia juga melakukan eksperimen fisika untuk memahami gerak dan gravitasi, sehingga dianggap pelopor metode ilmiah modern.',
      example: 'Observasinya menemukan bulan-bulan Jupiter, yang menunjukkan bahwa tidak semua benda langit beredar mengelilingi Bumi.',
      tip: 'Belajar dari Galileo: pengamatan empiris dan eksperimen adalah cara paling kuat untuk membuktikan kebenaran ilmiah.'
    },
    'stephen hawking': {
      short: 'Stephen Hawking adalah kosmolog yang mempelajari lubang hitam dan asal usul alam semesta.',
      detail: 'Stephen Hawking (1942-2018) adalah kosmolog Inggris yang memberikan kontribusi besar dalam memahami lubang hitam, asal usul alam semesta, dan waktu. Meskipun mengidap ALS, ia terus berkarya dan mempopulerkan sains melalui buku dan wawancara publik. Penemuan paling terkenal adalah radiasi Hawking, yang menunjukkan lubang hitam bukan benar-benar "hitam".',
      example: 'Teorinya tentang lubang hitam menggabungkan relativitas umum dan mekanika kuantum, dua teori besar fisika modern.',
      tip: 'Belajar dari Hawking: ketangguhan menghadapi keterbatasan fisik dan dedikasi pada ilmu pengetahuan menghasilkan warisan abadi.'
    },
    'charles darwin': {
      short: 'Charles Darwin adalah naturalis yang mengembangkan teori evolusi melalui seleksi alam.',
      detail: 'Charles Darwin (1809-1882) adalah naturalis Inggris yang mengembangkan teori evolusi dan seleksi alam melalui pengamatan selama berlayar di HMS Beagle. Bukunya "On the Origin of Species" mengubah cara kita memahami asal usul kehidupan dan keanekaragaman hayati.',
      example: 'Observasinya tentang burung finch di Galápagos menunjukkan bagaimana lingkungan yang berbeda menyebabkan adaptasi yang berbeda pada spesies yang sama.',
      tip: 'Belajar dari Darwin: perjalanan, pengamatan mendalam, dan analisis panjang menghasilkan teori yang mengubah sains.'
    },
    'nikola tesla': {
      short: 'Nikola Tesla adalah penemu Serbia-Amerika yang mengembangkan teknologi kelistrikan AC.',
      detail: 'Nikola Tesla (1856-1943) adalah penemu Serbia-Amerika yang merevolusi teknologi kelistrikan. Ia mengembangkan sistem arus bolak-balik (AC), transformator, dan transmisi nirkabel. Inovasi-inovasinya menjadi fondasi infrastruktur listrik modern dan teknologi wireless.',
      example: 'Sistem AC Tesla memungkinkan transmisi listrik jarak jauh yang efisien, menggantikan sistem DC Thomas Edison.',
      tip: 'Belajar dari Tesla: visi futuristik dan eksperimen berani membuka teknologi yang mengubah peradaban.'
    },
    'winston churchill': {
      short: 'Winston Churchill adalah pemimpin Inggris yang memimpin negaranya selama Perang Dunia II.',
      detail: 'Winston Churchill (1874-1965) adalah peneramanusia dan politisi Inggris yang menjadi Perdana Menteri selama Perang Dunia II. Kepemimpinannya yang kuat dan pidato inspiratifnya memotivasi rakyat Inggris untuk bertahan menghadapi Nazi Jerman. Ia juga penulis, jurnalis, dan pemenang Hadiah Nobel Sastra.',
      example: 'Pidatonya "We Shall Never Surrender" menjadi simbol ketangguhan dan determinasi menghadapi krisis.',
      tip: 'Belajar dari Churchill: kepemimpinan yang tegas, komunikasi yang inspiratif, dan tekad yang kuat mengatasi tantangan terbesar.'
    },
    'mahatma gandhi': {
      short: 'Mahatma Gandhi adalah pemimpin spiritual India yang memimpin kemerdekaan melalui non-kekerasan.',
      detail: 'Mahatma Gandhi (1869-1948) adalah pemimpin spiritual dan politisi India yang memimpin gerakan kemerdekaan India dari penjajahan Inggris melalui prinsip non-kekerasan (Satyagraha). Filosofinya tentang ketahanan spiritual dan desobediensi sipil menginspirasi gerakan perdamaian di seluruh dunia.',
      example: 'Marsa Garam (Salt March) pada 1930 adalah aksi non-kekerasan yang menantang monopoli garam Inggris dan menjadi simbol perlawanan damai.',
      tip: 'Belajar dari Gandhi: kekuatan sejati terletak pada ketenangan pikiran, integritas moral, dan komitmen pada nilai-nilai yang benar.'
    },
    'nelson mandela': {
      short: 'Nelson Mandela adalah pemimpin anti-apartheid Afrika Selatan dan presiden pertama negronya.',
      detail: 'Nelson Mandela (1918-2013) adalah pemimpin anti-apartheid dan presiden pertama Afrika Selatan yang memilih kulit hitam sebagai mayoritas. Ia dipenjarakan selama 27 tahun namun tidak pernah kehilangan harapan atau semangat. Kepemimpinannya memimpin transformasi damai Afrika Selatan dari sistem apartheid yang diskriminatif.',
      example: 'Setelah dibebaskan, Mandela menjadi presiden dan fokus pada rekonsiliasi, pendidikan, dan keadilan untuk semua warga Afrika Selatan.',
      tip: 'Belajar dari Mandela: pengorbanan pribadi untuk keadilan, pemaafan, dan rekonsiliasi menciptakan perubahan sosial yang berkelanjutan.'
    },
    'alan turing': {
      short: 'Alan Turing adalah matematikawan Inggris yang menjadi pelopor komputer dan AI.',
      detail: 'Alan Turing (1912-1954) adalah matematikawan dan logikawan Inggris yang mengembangkan konsep mesin Turing, landasan teori komputasi modern. Ia juga berkontribusi dalam menguraikan kode Enigma Jerman selama Perang Dunia II dan menjadi pelopor kecerdasan buatan melalui "Turing Test", standar untuk mengukur apakah mesin dapat berpikir seperti manusia.',
      example: 'Mesin Turing secara teoritis dapat menghitung apa pun yang dapat dihitung, menjadi fondasi semua komputer modern.',
      tip: 'Belajar dari Turing: pemikiran abstrak dan logika matematis membuka dunia teknologi dan komputasi digital.'
    }
  };

  for (const [name, info] of Object.entries(figures)) {
    if (lower.includes(name)) {
      if (detailed) {
        return buildStructuredAnswer(info.short, info.detail, info.example, info.tip, detailed);
      } else {
        return buildStructuredAnswer(info.short, info.detail, info.example, info.tip, false);
      }
    }
  }

  return buildStructuredAnswer(
    'Saya bisa menjelaskan tentang tokoh-tokoh terkenal dunia di bidang sains, seni, kepemimpinan, dan sejarah.',
    'Tokoh yang bisa saya jelaskan antara lain: Albert Einstein, Isaac Newton, Marie Curie, Leonardo da Vinci, Galileo Galilei, Stephen Hawking, Charles Darwin, Nikola Tesla, Winston Churchill, Mahatma Gandhi, Nelson Mandela, Alan Turing, dan masih banyak lagi.',
    'Contoh: kamu bisa tanya "Jelaskan Albert Einstein" atau "Siapa tokoh penemu listrik", dan saya akan jelaskan kehidupan, pencapaian, dan pelajaran yang bisa diambil dari mereka.',
    'Sebutkan nama tokoh yang ingin kamu pelajari, dan saya akan jelaskan latar belakang, pencapaian utama, dan warisan mereka dengan cara yang mudah dipahami.',
    detailed
  );
}

let replyMode = 'detail';

function setReplyMode(mode) {
  replyMode = mode;
  document.querySelectorAll('.mode-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });
}

function buildSpiderManCatalog() {
  return [
    {
      name: 'Peter Parker',
      alias: 'Spider-Man',
      universe: 'Earth-616',
      search: 'peter parker',
      story: 'Peter Parker adalah Spider-Man klasik dari Earth-616, seorang siswa SMA yang mendapat kekuatan laba-laba setelah gigitan laba-laba radioaktif. Ia belajar menjadi pahlawan dengan tanggung jawab besar, kebaikan hati, dan semangat melindungi orang lain.'
    },
    {
      name: 'Miles Morales',
      alias: 'Spider-Man',
      universe: 'Earth-1610',
      search: 'miles morales',
      story: 'Miles Morales adalah remaja Afrika-Amerika dan Latin yang juga mendapat kekuatan laba-laba. Ia lebih lincah, punya kemampuan bioelektrik, dan cerita khasnya menekankan bahwa menjadi pahlawan bukan soal warisan, tapi pilihan dan keberanian.'
    },
    {
      name: 'Gwen Stacy',
      alias: 'Spider-Gwen',
      universe: 'Earth-65',
      search: 'gwen stacy',
      story: 'Gwen Stacy adalah versi perempuan Spider-Man dari Earth-65, seorang siswa genius dan pahlawan yang sangat cepat, tangkas, dan berani. Ia membawa gaya baru yang lebih dinamis, dengan cerita yang kuat tentang kehilangan, tanggung jawab, dan semangat baru.'
    },
    {
      name: 'Ben Reilly',
      alias: 'Scarlet Spider',
      universe: 'Earth-616',
      search: 'ben reilly',
      story: 'Ben Reilly adalah klon Peter Parker yang berusaha hidup dengan identitas sendiri. Ia memakai kostum merah-biru dan dikenal sebagai Scarlet Spider, dengan konflik besar antara perjuangan hidup, identitas, dan keinginan untuk jadi lebih baik.'
    },
    {
      name: 'Otto Octavius',
      alias: 'Superior Spider-Man',
      universe: 'Earth-616',
      search: 'otto octavius',
      story: 'Setelah tubuh Peter Parker dikuasai oleh Otto Octavius, ia mengambil alih peran Spider-Man dengan cara yang lebih agresif dan strategis. Ceritanya menarik karena menunjukkan sisi yang lebih cerdas, keras, dan kontroversial dari seorang pahlawan.'
    },
    {
      name: 'Kaine Parker',
      alias: 'Spider-Man',
      universe: 'Earth-616',
      search: 'kaine parker',
      story: 'Kaine Parker adalah klon Peter Parker yang lebih kasar dan lebih berbahaya. Ia menghadapi luka batin, rasa tidak diterima, dan perjalanan untuk mencari arti menjadi manusia, bukan sekadar manusia laba-laba.'
    },
    {
      name: 'Miguel O\'Hara',
      alias: 'Spider-Man 2099',
      universe: 'Earth-2099',
      search: 'miguel o\'hara',
      story: 'Miguel O\'Hara adalah Spider-Man di masa depan, di dunia cyberpunk yang penuh teknologi. Ia kuat, cerdas, dan memiliki pandangan futuristik tentang moralitas, kemajuan, dan peran pahlawan di masa depan yang keras.'
    },
    {
      name: 'Peter Parker (Amazing Spider-Man)',
      alias: 'Spider-Man',
      universe: 'Earth-616',
      search: 'amazing spider man',
      story: 'Versi ini paling dikenal karena akar cerita Peter Parker sebagai siswa biasa yang berubah menjadi pahlawan berkat kekuatan besar dan tanggung jawab. Ia menghadapi masalah keluarga, sekolah, karier, dan hubungan dalam kondisi yang sangat manusiawi.'
    },
    {
      name: 'Spider-Man India',
      alias: 'Pavitr Prabhakar',
      universe: 'Earth-50101',
      search: 'pavitr prabhakar',
      story: 'Pavitr Prabhakar adalah Spider-Man dari India yang tetap menjaga nilai moral, keluarga, dan kebijaksanaan lokal. Ceritanya menonjolkan bahwa semangat Spider-Man bukan hanya soal kekuatan, tapi juga niat baik dan rasa tanggung jawab sosial.'
    },
    {
      name: 'Spider-Man Noir',
      alias: 'Spider-Man Noir',
      universe: 'Earth-90214',
      search: 'spider man noir',
      story: 'Spider-Man Noir adalah versi dalam dunia noir 1930-an, berkesan gelap, klasik, dan sangat misterius. Ia menghadapi kejahatan dengan gaya brutal, dingin, dan sangat atmosferik, membawa nuansa film detektif hitam-putih yang kuat.'
    },
    {
      name: 'Spider-Man 2099',
      alias: 'Miguel O\'Hara',
      universe: 'Earth-2099',
      search: 'spider man 2099',
      story: 'Spider-Man 2099 menghadirkan versi pahlawan masa depan dengan teknologi canggih dan dunia yang keras. Cerita utamanya berfokus pada perjuangan melawan korupsi, kekuatan besar, dan kegagalan sistem yang mengerikan.'
    },
    {
      name: 'Spider-Man (PS4 / PS5)',
      alias: 'Peter Parker / Miles Morales',
      universe: 'Earth-1048',
      search: 'spider man ps4',
      story: 'Versi game ini menampilkan Peter Parker dan Miles Morales dalam perjalanan yang sangat emosional, dengan tekanan pribadi, heroisme, dan pilihan moral yang terasa dekat dengan kehidupan nyata.'
    }
  ];
}

function generateSpiderManAnswer(question, detailed = replyMode === 'detail') {
  const lower = question.toLowerCase();
  const catalog = buildSpiderManCatalog();

  if (/(list|daftar|semua|versi|universe|yang ada)/i.test(lower) && /spider/i.test(lower)) {
    const items = catalog.map((item, index) => {
      return `${index + 1}. ${item.name} (${item.alias}) — ${item.universe}: ${item.story}`;
    }).join('\n');

    return `Berikut daftar versi Spider-Man yang paling terkenal dari berbagai universe:\n\n${items}\n\nKalau kamu mau, aku bisa jelaskan satu per satu versi yang paling kamu suka, misalnya Peter Parker, Miles Morales, Gwen Stacy, Spider-Man 2099, atau Spider-Man Noir.`;
  }

  const matched = catalog.find((item) => {
    return lower.includes(item.search) || lower.includes(item.alias.toLowerCase()) || lower.includes(item.name.toLowerCase());
  });

  if (matched) {
    const short = `${matched.name} (${matched.universe}) adalah versi Spider-Man yang unik. ${matched.story}`;
    if (detailed) {
      return `${short}\n\nIntinya, versi ini menunjukkan bahwa Spider-Man bukan hanya tentang kekuatan super, tetapi juga tanggung jawab, keberanian, dan pilihan moral yang ia ambil saat menghadapi masalah.`;
    }
    return short;
  }

  return `Spider-Man adalah pahlawan super yang dikenal karena kekuatan laba-laba, kecepatan, kelincahan, dan rasa tanggung jawab. Peter Parker adalah versi paling ikonik, tetapi ada juga Miles Morales, Gwen Stacy, Spider-Man 2099, Spider-Man Noir, dan banyak versi lain dari universe yang berbeda. Kalau kamu ingin, aku bisa kasih daftar lengkap semua versi Spider-Man beserta cerita singkat masing-masing.`;
}

function generateAiReply(question, detailed = replyMode === 'detail') {
  const q = question.trim();
  if (!q) return 'Kamu belum menulis pertanyaan.';

  const lower = q.toLowerCase();
  const topic = detectTopic(lower);
  let memory = getMemory();

  if (/(nama saya|saya bernama|panggil saya)/i.test(lower)) {
    const nameMatch = q.match(/(?:nama saya|saya bernama|panggil saya)\s+([a-zA-Z\s]+)/i);
    if (nameMatch && nameMatch[1]) {
      memory.name = nameMatch[1].trim();
      saveMemory(memory);
      return `Baik, saya akan ingat nama kamu: ${memory.name}. Kalau kamu punya pertanyaan, saya siap bantu dengan cara yang sederhana tapi tetap jelas.`;
    }
  }

  if (/(ingat|catat|tahu saya|kamu ingat)/i.test(lower)) {
    return `Iya, saya ingat kamu adalah ${memory.name}. Kalau ada topik favorit atau tujuan belajar, saya bisa menyesuaikan cara menjawab agar lebih tepat.`;
  }

  if (/(halo|hai|hello|selamat pagi|selamat siang|selamat sore|selamat malam)/i.test(lower)) {
    return `Halo juga, ${memory.name}! Saya AI serbaguna yang bisa bantu menjawab pertanyaan di bidang belajar, matematika, coding, sains, sejarah, teknologi, bahasa, dan banyak topik lainnya. Mau tanya apa?`;
  }

  if (/(siapa.*kamu|anda.*siapa|kamu.*siapa)/i.test(lower)) {
    return 'Saya adalah AI serbaguna yang dirancang untuk membantu menjawab pertanyaan dengan jelas, cepat, dan mudah dipahami. Saya bisa bantu dalam belajar, coding, teknologi, matematika, sejarah, sains, bahasa, dan banyak topik lain.';
  }

  if (lower.includes('nama') && lower.includes('mudia')) {
    return 'Nama pemilik website ini adalah MudiasTira.';
  }

  if (/(spider.?man|spiderman|spider man)/i.test(lower)) {
    return generateSpiderManAnswer(q, detailed);
  }

  if (/(siapa.*mudiastira|siapa.*diasparker|siapa.*mudias|siapa.*dias|siapa.*iyas|apa itu mudiastira|mudiastira siapa)/i.test(lower) || 
      lower.includes('mudiastira') || lower.includes('diasparker') || lower.includes('mudias') || 
      (lower.includes('dias') && lower.includes('parker')) || lower.includes('yas')) {
    return 'Mudiastira atau yang di kenal diasparker adalah tokoh terkenal di dunia, yaitu super hero yang bernama spiderman pertama yang merelakan ingatan semua orang agar melupakan bahwa dias parker adalah spiderman, dia tinggal di new york, dia adalah orang yang relatif humoris ganteng menawan dan sangat baik hati tidak sombong dan rajin menabung, dias parker adalah spiderman yang paling terkuat di antara semua universe, universe dias parker adalah earth-0 atau bumi pertama di dunia.';
  }

  const mathResult = solveMathQuestion(lower);
  if (mathResult) {
    return mathResult;
  }

  if (/(\d|\bberapa\b|\bhitung\b|\bjumlah\b|\bnilai\b|\btotal\b|\bhasil\b)/.test(lower) && /[+\-*/=]/.test(q)) {
    const calc = solveMathQuestion(q);
    if (calc) return calc;
  }

  switch (topic) {
    case 'matematika':
      return buildStructuredAnswer(
        'Matematika lebih mudah dipahami jika fokus pada konsep, bukan sekadar menghafal rumus.',
        'Konsep dasar seperti operasi bilangan, persamaan, pola, dan logika sangat penting. Setelah itu, latihan soal rutin akan membuat cara berpikir makin tajam.',
        'Misalnya, untuk persamaan 2x + 3 = 11, kurangi 3 lalu bagi 2, sehingga x = 4.',
        'Coba kerjakan 5 soal per hari dan pahami langkahnya satu per satu.',
        detailed
      );
    case 'ipa':
      return buildStructuredAnswer(
        'IPA mempelajari alam dan fenomena di sekitar kita dengan cara ilmiah.',
        'Fisika menjelaskan gerak dan gaya, kimia menjelaskan reaksi zat, dan biologi menjelaskan makhluk hidup serta proses kehidupan.',
        'Contoh: air berubah menjadi uap ketika dipanaskan karena energi panas memercepat partikel air.',
        'Gunakan pendekatan bertanya: apa yang diamati, mengapa itu terjadi, dan bagaimana cara membuktikannya.',
        detailed
      );
    case 'sejarah':
      return buildStructuredAnswer(
        'Sejarah membantu kita memahami perjalanan manusia, peradaban, dan pelajaran dari masa lalu.',
        'Untuk belajar sejarah, fokus pada kronologi, tokoh penting, perubahan sosial, dan dampak kejadian pada masa kini.',
        'Contoh: Revolusi Indonesia bukan hanya peristiwa politik, tetapi juga perubahan mentalitas dan perjuangan bangsa.',
        'Buat garis waktu agar hubungan antar peristiwa lebih mudah dipahami.',
        detailed
      );
    case 'sosial':
      return buildStructuredAnswer(
        'Ilmu sosial membahas manusia dalam hubungan dengan masyarakat, lingkungan, dan kebijakan.',
        'Bidang seperti geografi, ekonomi, politik, dan budaya saling terkait dalam kehidupan sehari-hari.',
        'Contoh: harga bahan pokok naik karena ada perubahan distribusi, permintaan, dan biaya produksi.',
        'Perhatikan hubungan sebab-akibat agar analisis sosial jadi lebih tajam.',
        detailed
      );
    case 'coding':
      return buildStructuredAnswer(
        'Belajar coding itu dimulai dari logika, bukan hanya menghafal sintaks.',
        'Mulai dari variabel, kondisi, loop, fungsi, hingga struktur data sederhana. Setelah itu, praktik membuat proyek kecil agar skill cepat berkembang.',
        'Contoh: fungsi menghitung luas persegi panjang bisa dibuat dengan parameter panjang dan lebar.',
        'Latih mini project setiap hari agar logika dan konsistensi naik.',
        detailed
      );
    case 'game':
      return buildStructuredAnswer(
        'Game bisa melatih fokus, strategi, dan pengambilan keputusan cepat.',
        'Yang penting adalah menjaga keseimbangan antara bermain, istirahat, dan waktu belajar supaya tidak mengganggu produktivitas.',
        'Contoh: dalam game strategi, pemain belajar membaca situasi dan memilih keputusan yang paling tepat.',
        'Mainkan game secara sehat dan tetap prioritaskan tugas penting terlebih dahulu.',
        detailed
      );
    case 'bahasa':
      return buildStructuredAnswer(
        'Bahasa berkembang lewat kosakata, struktur kalimat, dan latihan rutin.',
        'Untuk bahasa Inggris, fokus pada grammar dasar, kosakata penting, dan percakapan singkat setiap hari.',
        'Contoh: "I have studied English for two years" menunjukkan penggunaan tenses yang tepat.',
        'Coba tulis 5-10 kalimat setiap hari agar lebih cepat terbiasa.',
        detailed
      );
    case 'teknologi':
      return buildStructuredAnswer(
        'Teknologi berkembang cepat, sehingga kemampuan berpikir kritis dan adaptasi sangat penting.',
        'Belajar logika, menjaga etika digital, dan terus mencoba tools baru akan membuatmu tetap relevan.',
        'Contoh: AI bisa membantu analisis data, tetapi keputusan akhir tetap memerlukan manusia yang kritis dan bertanggung jawab.',
        'Jangan hanya ikut tren, tapi pahami cara kerja teknologi itu.',
        detailed
      );
    case 'psikologi':
      return buildStructuredAnswer(
        'Psikologi membantu kita memahami cara berpikir, emosi, dan perilaku manusia.',
        'Pemahaman diri, manajemen stres, dan kebiasaan sehat sangat memengaruhi produktivitas dan kesejahteraan.',
        'Contoh: latihan fokus singkat bisa meningkatkan konsentrasi dibandingkan belajar terlalu lama tanpa istirahat.',
        'Belajar mengenali pola emosi membuat keputusan jadi lebih bijak.',
        detailed
      );
    case 'motivasi':
      return buildStructuredAnswer(
        'Kunci sukses bukan hanya semangat, tapi konsistensi dan strategi yang jelas.',
        'Buat jadwal kecil yang realistis, fokus pada satu target penting, dan evaluasi kemajuan secara rutin.',
        'Contoh: belajar 30 menit setiap hari lebih efektif dibandingkan belajar 5 jam sekali seminggu.',
        'Jangan takut salah. Kesalahan adalah bagian dari proses belajar.',
        detailed
      );
    case 'tokoh':
      return handleFamousFigures(q, detailed);
    default:
      break;
  }

  if (/(cara.*belajar|belajar.*cara|cara.*sukses|sukses.*cara)/i.test(lower)) {
    return buildStructuredAnswer(
      'Cara belajar yang efektif adalah memahami konsep, bukan sekadar menghafal.',
      'Langkahnya: pahami materi, latihan soal, ulangi dengan ringkasan, dan evaluasi hasil belajarmu secara berkala.',
      'Contoh: setelah membaca bab, tulis 5 poin penting dan jawab 3 pertanyaan pemahaman.',
      'Belajar yang konsisten jauh lebih kuat daripada belajar saat sedang semangat saja.',
      detailed
    );
  }

  if (lower.includes('apa') && lower.includes('arti')) {
    return 'Arti kata bisa berubah tergantung konteks. Kalau kamu kirim kata atau kalimat tertentu, saya bisa menjelaskannya dengan cara sederhana, jelas, dan sesuai konteks yang benar.';
  }

  if (/(perbedaan|beda|bandingkan|compare)/i.test(lower)) {
    return `Saya bisa bantu membandingkan topik terkait "${q}". Coba jelaskan dua hal yang ingin dibandingkan, lalu saya akan buatkan perbedaan, kelebihan, kekurangan, dan contohnya dalam bentuk yang mudah dipahami.`;
  }

  if (/(jelaskan|terangkan|apa itu|apakah|mengapa|bagaimana)/i.test(lower)) {
    return buildStructuredAnswer(
      `Pertanyaanmu tentang "${q}" bisa dijawab dengan cara yang sederhana dan langsung ke inti.`,
      'Saya akan fokus pada definisi, alasan, dan contoh agar mudah dipahami tanpa bertele-tele.',
      'Contoh: jika kamu menanyakan tentang AI, saya bisa jelaskan definisi, cara kerja, manfaat, dan contoh penggunaannya dalam kehidupan sehari-hari.',
      'Kalau kamu mau, saya bisa menjawab dalam versi singkat, rinci, atau berformat poin.',
      detailed
    );
  }

  if (lower.includes('siapa') || lower.includes('kapan') || lower.includes('mengapa') || lower.includes('bagaimana')) {
    return `Saya bisa membantu menjawab pertanyaan tentang "${q}" dengan cara yang sederhana, terstruktur, dan mudah dipahami. Kalau kamu mau, saya bisa jelaskan lebih detail, buat ringkasannya, atau ubah ke format poin-poin sesuai kebutuhanmu.`;
  }

  return `Saya siap membantu topik apa pun, termasuk "${q}". Saya bisa menjawab dari sudut pandang edukatif, praktis, dan mudah dipahami, seperti matematika, sains, sejarah, sosial, teknologi, bahasa, coding, hingga diskusi umum. Kalau mau, lanjutkan dengan pertanyaan yang lebih spesifik agar jawaban saya lebih tepat dan lebih bermanfaat.`;
}

document.querySelectorAll('.mode-btn').forEach((button) => {
  button.addEventListener('click', () => {
    setReplyMode(button.dataset.mode);
    const statusText = button.dataset.mode === 'detail'
      ? 'Mode aktif: jawab detail agar penjelasannya lebih lengkap.'
      : 'Mode aktif: jawab singkat agar jawabannya lebih ringkas.';
    addMessage(statusText, 'bot');
  });
});

chatForm.addEventListener('submit', function (event) {
  event.preventDefault();
  const question = chatInput.value;

  if (!question.trim()) {
    return;
  }

  addMessage(question, 'user');
  chatInput.value = '';

  setTimeout(() => {
    const reply = generateAiReply(question, replyMode === 'detail');
    addMessage(reply, 'bot');
  }, 400);
});
