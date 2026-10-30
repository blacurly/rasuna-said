import argparse,pandas as pd
REQUIRED={"document_id","title","drive_file_id","processing_status"}
def main():
    p=argparse.ArgumentParser(); p.add_argument("--file",required=True); a=p.parse_args()
    df=pd.read_excel(a.file,dtype=object); missing=REQUIRED-set(df.columns)
    if missing: raise SystemExit(f"Kolom wajib hilang: {sorted(missing)}")
    if df["document_id"].isna().any(): raise SystemExit("Ada document_id kosong.")
    if df["document_id"].astype(str).duplicated().any(): raise SystemExit("Ada document_id duplikat.")
    print(f"Struktur registry valid: {len(df)} baris.")
if __name__=="__main__": main()
