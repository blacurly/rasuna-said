from datetime import datetime, timezone
from .clients import get_supabase
ALLOWED={"document_id","title","original_filename","drive_file_id","drive_url","publisher","publication_year",
"document_type","category","subcategory","language","geographic_scope","description","keywords","access_level","processing_status"}
REQUIRED={"document_id","title","drive_file_id","processing_status"}
def validate_rows(rows):
    valid,errors=[],[]
    for n,row in enumerate(rows,start=2):
        item={k:row.get(k) for k in ALLOWED if k in row}
        missing=[k for k in REQUIRED if item.get(k) is None or str(item.get(k)).strip()==""]
        if missing: errors.append(f"Baris {n}: kolom wajib kosong {missing}"); continue
        item["document_id"]=str(item["document_id"]).strip()
        item["title"]=str(item["title"]).strip()
        item["drive_file_id"]=str(item["drive_file_id"]).strip()
        item["processing_status"]=str(item["processing_status"]).lower().strip()
        if item["processing_status"] not in {"pending","processing","completed","failed","skipped"}:
            errors.append(f"Baris {n}: status tidak valid"); continue
        if isinstance(item.get("keywords"),str):
            item["keywords"]=[x.strip() for x in item["keywords"].split(",") if x.strip()]
        valid.append(item)
    return valid,errors
def update_status(doc_id,status,**fields):
    payload={"processing_status":status,"updated_at":datetime.now(timezone.utc).isoformat(),**fields}
    get_supabase().table("document_registry").update(payload).eq("document_id",doc_id).execute()
