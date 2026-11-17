
import os
import json
import secrets
from http.server import BaseHTTPRequestHandler

# Cache model di direktori sementara Vercel.
os.environ.setdefault("HF_HOME", "/tmp/huggingface")

from sentence_transformers import SentenceTransformer


MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL_NAME",
    "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
)

EMBEDDING_DIMENSION = int(
    os.getenv("EMBEDDING_DIMENSION", "768")
)

EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY", "").strip()

# Model dimuat secara lazy dan dapat dipakai kembali
# selama instance Function masih hangat.
_model = None


def get_model():
    global _model

    if _model is None:
        if not EMBEDDING_API_KEY:
            raise RuntimeError("EMBEDDING_API_KEY belum diatur.")

        print("Memuat model:", MODEL_NAME)

        loaded_model = SentenceTransformer(MODEL_NAME)

        actual_dimension = (
            loaded_model.get_sentence_embedding_dimension()
        )

        if actual_dimension != EMBEDDING_DIMENSION:
            raise RuntimeError(
                f"Dimensi model tidak sesuai: {actual_dimension}"
            )

        _model = loaded_model
        print("Model siap:", actual_dimension)

    return _model


class handler(BaseHTTPRequestHandler):

    def send_json(self, status, data):
        body = json.dumps(data).encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self.send_json(200, {
            "service": "AIRA Embedding API",
            "status": "running",
            "model": MODEL_NAME,
            "dimension": EMBEDDING_DIMENSION,
            "model_loaded": _model is not None
        })

    def do_POST(self):

        # 1. Validasi API key
        authorization = self.headers.get("Authorization", "")
        prefix = "Bearer "

        if not authorization.startswith(prefix):
            self.send_json(401, {
                "error": "Authorization header diperlukan."
            })
            return

        token = authorization[len(prefix):].strip()

        if not EMBEDDING_API_KEY or not secrets.compare_digest(
            token,
            EMBEDDING_API_KEY
        ):
            self.send_json(403, {
                "error": "API key tidak valid."
            })
            return

        # 2. Validasi ukuran request
        try:
            content_length = int(
                self.headers.get("Content-Length", "0")
            )

            if content_length < 1 or content_length > 20000:
                self.send_json(413, {
                    "error": "Ukuran request tidak valid."
                })
                return

            raw_body = self.rfile.read(content_length)
            payload = json.loads(raw_body)

            text = payload.get("text", "")

            if not isinstance(text, str):
                self.send_json(422, {
                    "error": "Field text harus berupa string."
                })
                return

            text = text.strip()

            if not text or len(text) > 4000:
                self.send_json(422, {
                    "error": "Teks kosong atau terlalu panjang."
                })
                return

        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {
                "error": "Format JSON tidak valid."
            })
            return

        # 3. Generate embedding
        try:
            model = get_model()

            vector = model.encode(
                text,
                normalize_embeddings=True,
                convert_to_numpy=True
            )

            embedding = vector.tolist()

            if len(embedding) != EMBEDDING_DIMENSION:
                raise ValueError("Dimensi embedding tidak sesuai.")

            self.send_json(200, {
                "embedding": embedding,
                "dimension": len(embedding)
            })

        except Exception as error:
            print("Embedding error:", str(error))

            self.send_json(500, {
                "error": "Gagal membuat embedding."
            })

    def log_message(self, format, *args):
        print("AIRA Embedding:", format % args)
