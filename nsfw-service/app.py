"""
Verificador de nudez (gratuito, roda no nosso servidor, sem chave de API).
Recebe os bytes de uma imagem em POST /check e responde {"safe": bool, "flags": [...]}.
Só é acessível pela rede interna do Docker (o app Next.js chama este serviço; ele não é exposto na internet).
"""
import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from nudenet import NudeDetector

# partes do corpo EXPOSTAS que reprovam a foto (rostos, braços, pés etc. são liberados)
BLOCKED = set(
    filter(
        None,
        os.environ.get(
            "NSFW_BLOCKED",
            "FEMALE_BREAST_EXPOSED,FEMALE_GENITALIA_EXPOSED,MALE_GENITALIA_EXPOSED,BUTTOCKS_EXPOSED,ANUS_EXPOSED",
        ).split(","),
    )
)
THRESHOLD = float(os.environ.get("NSFW_THRESHOLD", "0.45"))
MAX_BYTES = 3 * 1024 * 1024

detector = NudeDetector()


def check(data: bytes) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".img", delete=True) as f:
        f.write(data)
        f.flush()
        found = detector.detect(f.name)
    flags = sorted({d["class"] for d in found if d["class"] in BLOCKED and d["score"] >= THRESHOLD})
    return {"safe": not flags, "flags": flags, "detected": [d["class"] for d in found]}


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: dict):
        raw = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        self._send(200, {"ok": True}) if self.path == "/health" else self._send(404, {"error": "not_found"})

    def do_POST(self):
        if self.path != "/check":
            return self._send(404, {"error": "not_found"})
        n = int(self.headers.get("Content-Length", "0"))
        if n <= 0 or n > MAX_BYTES:
            return self._send(413, {"error": "invalid_size"})
        try:
            self._send(200, check(self.rfile.read(n)))
        except Exception as e:  # imagem ilegível etc.: nunca aprova por engano
            self._send(422, {"error": "unreadable", "detail": str(e)[:120]})

    def log_message(self, *args):  # sem log por requisição
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
