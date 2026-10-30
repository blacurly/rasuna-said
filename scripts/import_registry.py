import argparse,sys
from pathlib import Path
import pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"src"))
from aira_rag.clients import get_supabase
from aira_rag.registry import validate_rows
def main():
    p=argparse.ArgumentParser(); p.add_argument("--file",required=True); a=p.parse_args()
    df=pd.read_excel(a.file,dtype=object)
    df=df.where(pd.notna(df),None)
    rows,errors=validate_rows(df.to_dict(orient="records"))
    for e in errors: print("VALIDATION ERROR:",e)
    if rows: get_supabase().table("document_registry").upsert(rows,on_conflict="document_id").execute()
    print(f"Upsert {len(rows)} baris; error {len(errors)}.")
    if errors: raise SystemExit(1)
if __name__=="__main__": main()
