import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from aira_rag.config import settings
def main():
    c=settings(); missing=[k for k in ("supabase_url","supabase_key") if not c[k]]
    if not c["google_json"] and not c["google_file"]: missing.append("Google service account")
    print("Embedding:",c["embedding_model"],"dimensi:",c["embedding_dimension"])
    if missing: print("Belum diisi:",missing); raise SystemExit(1)
    print("Variabel dasar tersedia; akses layanan tetap perlu diuji.")
if __name__=="__main__": main()
