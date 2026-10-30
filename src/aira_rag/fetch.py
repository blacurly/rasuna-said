import hashlib
from pathlib import Path
from .clients import get_drive
def sha256_file(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for block in iter(lambda:f.read(1024*1024),b""): h.update(block)
    return h.hexdigest()
def fetch_pdf(document,output_dir):
    from googleapiclient.http import MediaIoBaseDownload
    output_dir=Path(output_dir); output_dir.mkdir(parents=True,exist_ok=True)
    name=Path(document.get("original_filename") or f'{document["document_id"]}.pdf').name
    if not name.lower().endswith(".pdf"): name += ".pdf"
    path=output_dir/f'{document["document_id"]}_{name}'
    request=get_drive().files().get_media(fileId=document["drive_file_id"])
    with path.open("wb") as fh:
        downloader=MediaIoBaseDownload(fh,request); done=False
        while not done: _,done=downloader.next_chunk()
    return path,sha256_file(path)
