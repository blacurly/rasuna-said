import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from supabase import create_client
from .config import settings
def get_supabase():
    c=settings()
    if not c["supabase_url"] or not c["supabase_key"]:
        raise RuntimeError("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.")
    return create_client(c["supabase_url"],c["supabase_key"])
def get_drive():
    c=settings(); scopes=["https://www.googleapis.com/auth/drive.readonly"]
    if c["google_json"]:
        creds=service_account.Credentials.from_service_account_info(json.loads(c["google_json"]),scopes=scopes)
    elif c["google_file"]:
        creds=service_account.Credentials.from_service_account_file(c["google_file"],scopes=scopes)
    else: raise RuntimeError("Isi GOOGLE_SERVICE_ACCOUNT_JSON atau GOOGLE_SERVICE_ACCOUNT_FILE.")
    return build("drive","v3",credentials=creds,cache_discovery=False)
