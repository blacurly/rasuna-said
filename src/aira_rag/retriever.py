from .config import settings
from .clients import get_supabase
from .embeddings import embed_texts
def retrieve_context(question,top_k=None,category=None):
    c=settings(); vector=embed_texts([question])[0]
    r=get_supabase().rpc("match_document_chunks",{"query_embedding":vector,
      "match_count":top_k or c["top_k"],"similarity_threshold":c["similarity_threshold"],
      "filter_category":category}).execute()
    return r.data or []
