# MudiasTira Website

Jalankan (butuh Python 3, tanpa install library):

    python server.py

Buka http://127.0.0.1:8000  (HP di WiFi yang sama: HOST=0.0.0.0 python server.py)

Struktur: public/{profil,hobi,ai,umur,kontak}.html, public/css/style.css, public/js/*.js, server.py (API komentar + SQLite di data/mudiastira.db)

Kelola komentar:
    python server.py --daftar
    python server.py --hapus ID
