import secrets

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .embeddings import embed_texts
from .config import settings

app = FastAPI(
    title="AIRA Embedding Service",
    version="1.0.0"
)

class EmbeddingRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)

class EmbeddingResponse(BaseModel):
    embedding: list[float]
    dimension: int

def validasi_api_key(authorization: str | None):
    c = settings()
    expected_key = c.get("embedding_api_key", "")

    if not expected_key:
        raise HTTPException(
            status_code=500,
            detail="Embedding API key belum dikonfigurasi."
        )

    token = ""

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()

    if not token or not secrets.compare_digest(token, expected_key):
        raise HTTPException(
            status_code=401,
            detail="Tidak memiliki akses ke layanan embedding."
        )

@app.get("/health")
def health():
    return {"ok": True, "service": "aira-embedding"}

@app.post("/embed", response_model=EmbeddingResponse)
def create_embedding(
    request: EmbeddingRequest,
    authorization: str | None = Header(default=None)
):
    validasi_api_key(authorization)

    try:
        vectors = embed_texts([request.text])
        vector = vectors[0]

        dimension = settings()["embedding_dimension"]

        if len(vector) != dimension:
            raise RuntimeError(
                f"Dimensi embedding {len(vector)} "
                f"tidak sesuai konfigurasi {dimension}."
            )

        return {
            "embedding": vector,
            "dimension": len(vector)
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Gagal membuat embedding: {str(exc)}"
        )