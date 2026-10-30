from sentence_transformers import SentenceTransformer
from .config import settings
_model=None
def get_model():
    global _model
    if _model is None:
        c=settings(); _model=SentenceTransformer(c["embedding_model"])
        dim=_model.get_sentence_embedding_dimension()
        if dim!=c["embedding_dimension"]: raise RuntimeError(f"Dimensi {dim} tidak sama dengan {c['embedding_dimension']}.")
    return _model
def embed_texts(texts):
    return get_model().encode(texts,normalize_embeddings=True,show_progress_bar=False).tolist() if texts else []
