from pathlib import Path
from .fetch import fetch_pdf
from .pdf_processing import extract_with_ocr
from .chunking import chunk_pages
from .embeddings import embed_texts
from .storage import mark_processing,insert_chunks,mark_success,mark_failed
def process_document(document,output_dir="data/processed"):
    doc_id=document["document_id"]; mark_processing(doc_id)
    try:
        pdf_path,checksum=fetch_pdf(document,Path(output_dir))
        chunks=chunk_pages(extract_with_ocr(pdf_path),document,checksum)
        if not chunks: raise RuntimeError("Teks PDF kosong. Periksa PDF atau aktifkan OCR.")
        vectors=embed_texts([x["content"] for x in chunks])
        insert_chunks(chunks,vectors)
        mark_success(doc_id,checksum)
        return {"document_id":doc_id,"status":"completed","chunk_count":len(chunks),"checksum":checksum}
    except Exception as exc:
        mark_failed(doc_id,exc)
        return {"document_id":doc_id,"status":"failed","error":str(exc)}
