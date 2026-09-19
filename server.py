#!/usr/bin/env python3
"""
Server website MudiasTira.

- Melayani file HTML/CSS/JS dari folder `public/`
- API komentar (disimpan di SQLite: data/mudiastira.db)

Cara menjalankan:
    python server.py
Lalu buka http://127.0.0.1:8000

Perintah bantu (kelola komentar):
    python server.py --daftar        # lihat 20 komentar terbaru
    python server.py --hapus 12      # hapus komentar dengan id 12

Hanya memakai library bawaan Python (tidak perlu pip install).
"""

import json
import os
import re
import sqlite3
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "data", "mudiastira.db"))
HOST = os.environ.get("HOST", "127.0.0.1")  # pakai 0.0.0.0 agar bisa dibuka dari HP di WiFi yang sama
PORT = int(os.environ.get("PORT", "8000"))

# Batas komentar
MAX_NAME = 40
MAX_MESSAGE = 500
MAX_BODY_BYTES = 8 * 1024
MIN_SECONDS_BETWEEN_POSTS = 15
MAX_POSTS_PER_HOUR = 20


# ---------------------------------------------------------------- Database
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = get_db()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS comments (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT NOT NULL,
                message    TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


# ------------------------------------------------------------ Validasi teks
CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
URL_PATTERN = re.compile(r"(https?://|www\.)", re.IGNORECASE)


def clean_text(value, multiline=False):
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = CONTROL_CHARS.sub("", value)
    if multiline:
        value = re.sub(r"[ \t]+\n", "\n", value)
        value = re.sub(r"\n{3,}", "\n\n", value)
    else:
        value = re.sub(r"\s+", " ", value)
    return value.strip()


def validate_comment(data):
    """Mengembalikan (comment, error). Salah satunya selalu None."""
    if not isinstance(data, dict):
        return None, "Data tidak valid."

    name = data.get("name")
    message = data.get("message")
    if not isinstance(name, str) or not isinstance(message, str):
        return None, "Nama dan komentar harus diisi."

    name = clean_text(name)
    message = clean_text(message, multiline=True)

    if not name:
        return None, "Nama wajib diisi."
    if len(name) > MAX_NAME:
        return None, f"Nama maksimal {MAX_NAME} karakter."
    if not message:
        return None, "Komentar wajib diisi."
    if len(message) > MAX_MESSAGE:
        return None, f"Komentar maksimal {MAX_MESSAGE} karakter."
    if URL_PATTERN.search(name) or URL_PATTERN.search(message):
        return None, "Link tidak diperbolehkan di komentar."

    return {"name": name, "message": message}, None


# ------------------------------------------------------------- Batas kirim
_rate_lock = threading.Lock()
_recent_posts = {}  # ip -> daftar waktu kirim (detik)


def check_rate_limit(ip):
    """Mengembalikan pesan error jika terlalu sering, atau None jika boleh."""
    now = time.time()
    with _rate_lock:
        if len(_recent_posts) > 5000:
            for key in [k for k, v in _recent_posts.items() if not v or now - v[-1] > 3600]:
                del _recent_posts[key]

        stamps = [t for t in _recent_posts.get(ip, []) if now - t < 3600]

        if stamps and now - stamps[-1] < MIN_SECONDS_BETWEEN_POSTS:
            wait = int(MIN_SECONDS_BETWEEN_POSTS - (now - stamps[-1])) + 1
            _recent_posts[ip] = stamps
            return f"Terlalu cepat. Tunggu {wait} detik lagi sebelum mengirim komentar berikutnya."

        if len(stamps) >= MAX_POSTS_PER_HOUR:
            _recent_posts[ip] = stamps
            return "Batas komentar per jam sudah tercapai. Coba lagi nanti."

        stamps.append(now)
        _recent_posts[ip] = stamps
    return None


# ----------------------------------------------------------------- Handler
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    # -- utilitas
    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def guess_type(self, path):
        ctype = super().guess_type(path)
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json"):
            return f"{ctype}; charset=utf-8"
        return ctype

    def list_directory(self, path):
        # Daftar isi folder dimatikan.
        self.send_error(404, "File tidak ditemukan")
        return None

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def map_root(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            self.path = "/profil.html"

    # -- GET / HEAD
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/comments":
            return self.api_list_comments(parse_qs(parsed.query))
        self.map_root()
        return super().do_GET()

    def do_HEAD(self):
        self.map_root()
        return super().do_HEAD()

    # -- POST
    def do_POST(self):
        if urlparse(self.path).path != "/api/comments":
            return self.send_json(404, {"error": "Endpoint tidak ditemukan."})
        return self.api_create_comment()

    # -- API: daftar komentar
    def api_list_comments(self, query):
        try:
            limit = max(1, min(50, int(query.get("limit", ["10"])[0])))
            before = query.get("before", [None])[0]
            before = int(before) if before is not None else None
        except ValueError:
            return self.send_json(400, {"error": "Parameter tidak valid."})

        conn = get_db()
        try:
            total = conn.execute("SELECT COUNT(*) FROM comments").fetchone()[0]
            if before is None:
                rows = conn.execute(
                    "SELECT id, name, message, created_at FROM comments ORDER BY id DESC LIMIT ?",
                    (limit + 1,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT id, name, message, created_at FROM comments WHERE id < ? ORDER BY id DESC LIMIT ?",
                    (before, limit + 1),
                ).fetchall()
        finally:
            conn.close()

        has_more = len(rows) > limit
        comments = [dict(r) for r in rows[:limit]]
        return self.send_json(200, {"total": total, "has_more": has_more, "comments": comments})

    # -- API: kirim komentar
    def api_create_comment(self):
        content_type = self.headers.get("Content-Type", "").split(";")[0].strip().lower()
        if content_type != "application/json":
            return self.send_json(415, {"error": "Format data harus JSON."})

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0:
            return self.send_json(400, {"error": "Data kosong."})
        if length > MAX_BODY_BYTES:
            return self.send_json(413, {"error": "Data terlalu besar."})

        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {"error": "Format data tidak valid."})

        comment, error = validate_comment(data)
        if error:
            return self.send_json(400, {"error": error})

        limited = check_rate_limit(self.client_address[0])
        if limited:
            return self.send_json(429, {"error": limited})

        created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        conn = get_db()
        try:
            cur = conn.execute(
                "INSERT INTO comments (name, message, created_at) VALUES (?, ?, ?)",
                (comment["name"], comment["message"], created_at),
            )
            conn.commit()
            new_id = cur.lastrowid
        finally:
            conn.close()

        comment.update({"id": new_id, "created_at": created_at})
        return self.send_json(201, {"comment": comment})


# ---------------------------------------------------------------- Perintah
def cmd_list():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, name, message, created_at FROM comments ORDER BY id DESC LIMIT 20"
        ).fetchall()
    finally:
        conn.close()
    if not rows:
        print("Belum ada komentar.")
    for r in rows:
        print(f"[{r['id']}] {r['created_at']}  {r['name']}: {r['message']}")


def cmd_delete(comment_id):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM comments WHERE id = ?", (comment_id,))
        conn.commit()
        print("Komentar dihapus." if cur.rowcount else "Komentar dengan id itu tidak ditemukan.")
    finally:
        conn.close()


def main():
    init_db()
    args = sys.argv[1:]

    if args[:1] == ["--daftar"]:
        return cmd_list()
    if args[:1] == ["--hapus"]:
        if len(args) < 2 or not args[1].isdigit():
            print("Pemakaian: python server.py --hapus ID")
            return
        return cmd_delete(int(args[1]))

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Server berjalan di http://{HOST}:{PORT}  (Ctrl+C untuk berhenti)")
    print(f"Database: {DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
