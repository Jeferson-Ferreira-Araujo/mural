"""
Verificador de nudez (gratuito, roda no nosso servidor, sem chave de API).
Recebe os bytes de uma imagem em POST /check e responde {"safe": bool, "flags": [...]}.
Só é acessível pela rede interna do Docker (o app Next.js chama este serviço; ele não é exposto na internet).
"""
import json
import os
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import cv2
import numpy as np
import onnxruntime
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
# só o que é EXPLÍCITO reprova: roupa de banho, sunga e cueca (praia, piscina) devem passar. Por isso o limite de confiança é por parte do corpo:
# nádegas "expostas" é o que mais confunde com sunga/biquíni/short colado, então só reprova com altíssima confiança.
MIN_SCORE = {
    "FEMALE_GENITALIA_EXPOSED": 0.5,
    "MALE_GENITALIA_EXPOSED": 0.65,
    "ANUS_EXPOSED": 0.55,
    "FEMALE_BREAST_EXPOSED": 0.65,
    "BUTTOCKS_EXPOSED": 0.9,
}
MAX_BYTES = 3 * 1024 * 1024

detector = NudeDetector()

# 2ª opinião: classificador da imagem INTEIRA (ViT), que pega o que o detector de partes do corpo não enxerga (enquadramento fechado, ângulo, etc).
# Em teste: fotos comuns e de praia (sunga/biquíni) ficam com nota perto de 0; conteúdo explícito, perto de 1.
CLASSIFIER_MAX = float(os.environ.get("NSFW_CLASSIFIER_MAX", "0.9"))
classifier = onnxruntime.InferenceSession("/app/cls.onnx", providers=["CPUExecutionProvider"])


def nsfw_prob(path: str) -> float:
    im = cv2.imread(path)
    if im is None:
        raise ValueError("imagem ilegível")
    im = cv2.cvtColor(cv2.resize(im, (224, 224), interpolation=cv2.INTER_CUBIC), cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    x = ((im - 0.5) / 0.5).transpose(2, 0, 1)[None]
    logits = classifier.run(None, {classifier.get_inputs()[0].name: x})[0][0]
    e = np.exp(logits - logits.max())
    return float((e / e.sum())[1])


def check(data: bytes) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".img", delete=True) as f:
        f.write(data)
        f.flush()
        found = detector.detect(f.name)
        prob = nsfw_prob(f.name)
    flags = sorted({d["class"] for d in found if d["class"] in BLOCKED and d["score"] >= MIN_SCORE.get(d["class"], THRESHOLD)})
    return {"safe": not flags and prob < CLASSIFIER_MAX, "flags": flags, "nsfw_prob": round(prob, 3), "detected": [f'{d["class"]}:{d["score"]:.2f}' for d in found]}


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
