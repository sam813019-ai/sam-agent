#!/usr/bin/env python3
"""本機預覽 zhentai-test：本機有檔就給本機版，沒有的（圖片/影片/360影格）轉址到線上。"""
import http.server
import os
import socketserver
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
REMOTE = "https://waynebear20996-mlebi.wpcomstaging.com/wp-content/uploads/zhentai-test"
PORT = 8901


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _local_missing(self):
        path = urllib.parse.urlsplit(self.path).path
        if path in ("", "/"):
            return None
        local = os.path.join(ROOT, path.lstrip("/"))
        return None if os.path.isfile(local) else path

    def do_GET(self):
        missing = self._local_missing()
        if missing:
            self.send_response(302)
            self.send_header("Location", REMOTE + missing)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, *args):
        pass


class ThreadedServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with ThreadedServer(("", PORT), Handler) as httpd:
    print(f"serving {ROOT} on http://localhost:{PORT}  (missing -> {REMOTE})")
    httpd.serve_forever()
