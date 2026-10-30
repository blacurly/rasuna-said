import os
from dotenv import load_dotenv
load_dotenv()
def settings():
    return {
        "supabase_url": os.getenv("SUPABASE_URL","").strip(),
        "supabase_key": os.getenv("SUPABASE_SERVICE_ROLE_KEY","").strip(),
        "google_json": os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON","").strip(),
        "google_file": os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE","").strip(),
        "gemini_key": os.getenv("GEMINI_API_KEY","").strip(),
        "gemini_model": os.getenv("GEMINI_MODEL","gemini-2.5-flash").strip(),
        "embedding_model": os.getenv("EMBEDDING_MODEL","sentence-transformers/paraphrase-multilingual-mpnet-base-v2").strip(),
        "embedding_dimension": int(os.getenv("EMBEDDING_DIMENSION","768")),
        "chunk_size": int(os.getenv("CHUNK_SIZE","1500")),
        "chunk_overlap": int(os.getenv("CHUNK_OVERLAP","250")),
        "min_page_text_chars": int(os.getenv("MIN_PAGE_TEXT_CHARS","40")),
        "ocr_enabled": os.getenv("OCR_ENABLED","false").lower() in {"1","true","yes"},
        "ocr_language": os.getenv("OCR_LANGUAGE","ind+eng"),
        "top_k": int(os.getenv("TOP_K","5")),
        "similarity_threshold": float(os.getenv("SIMILARITY_THRESHOLD","0.35")),
    }
