import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from aira_rag.storage import list_work_items
from aira_rag.pipeline import process_document
def main():
    items=list_work_items()
    if not items: print("Tidak ada dokumen pending/failed."); return
    results=[process_document(x) for x in items]
    for r in results: print(r)
    failed=[x for x in results if x["status"]!="completed"]
    print(f"Berhasil {len(results)-len(failed)}; gagal {len(failed)}")
    if failed: raise SystemExit(1)
if __name__=="__main__": main()
