from datetime import datetime,timezone
from .clients import get_supabase
def list_work_items(limit=100):
    r=get_supabase().table("document_registry").select("*").in_("processing_status",["pending","failed"]).limit(limit).execute()
    return r.data or []
def mark_processing(doc_id):
    get_supabase().table("document_registry").update({"processing_status":"processing","error_message":None}).eq("document_id",doc_id).execute()
def insert_chunks(chunks,vectors,batch_size=50):
    if len(chunks)!=len(vectors): raise ValueError("Jumlah chunk dan embedding berbeda.")
    client=get_supabase(); payload=[{**c,"embedding":v} for c,v in zip(chunks,vectors)]
    for i in range(0,len(payload),batch_size):
        client.table("document_chunks").upsert(payload[i:i+batch_size],on_conflict="document_id,checksum_sha256,chunk_index").execute()
def mark_success(doc_id,checksum):
    now=datetime.now(timezone.utc).isoformat()
    get_supabase().table("document_registry").update({"processing_status":"completed","checksum_sha256":checksum,
      "last_successful_checksum":checksum,"last_processed_at":now,"error_message":None,"updated_at":now}).eq("document_id",doc_id).execute()
def mark_failed(doc_id,error):
    get_supabase().table("document_registry").update({"processing_status":"failed","error_message":str(error)[:2000],
      "updated_at":datetime.now(timezone.utc).isoformat()}).eq("document_id",doc_id).execute()
