import re
from .config import settings
def chunk_pages(pages,document,checksum):
    cfg=settings(); size,overlap=cfg["chunk_size"],cfg["chunk_overlap"]
    if size<=0 or overlap<0 or overlap>=size: raise ValueError("Chunk size/overlap tidak valid.")
    text="\n".join(f'[Halaman {p["page"]}]\n{p["text"]}' for p in pages if p["text"].strip())
    chunks=[]; start=0; idx=0
    while start<len(text):
        end=min(start+size,len(text)); content=text[start:end].strip()
        if content:
            nums=[int(x) for x in re.findall(r"\[Halaman (\d+)\]",content)]
            chunks.append({"document_id":document["document_id"],"chunk_index":idx,"content":content,
              "page_start":min(nums) if nums else None,"page_end":max(nums) if nums else None,
              "metadata":{"title":document.get("title"),"publisher":document.get("publisher"),
                "category":document.get("category"),"language":document.get("language"),
                "source_file_id":document.get("drive_file_id")},"checksum_sha256":checksum})
            idx+=1
        if end==len(text): break
        start=end-overlap
    return chunks
