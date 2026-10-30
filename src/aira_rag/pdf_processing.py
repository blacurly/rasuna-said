import fitz, io
from .config import settings
def clean_text(text):
    lines=[x.strip() for x in text.replace("\x00"," ").splitlines()]
    return "\n".join(x for x in lines if x)
def extract_pages(pdf_path):
    cfg=settings(); result=[]
    with fitz.open(pdf_path) as doc:
        for i,page in enumerate(doc):
            text=(page.get_text("text") or "").strip()
            result.append({"page":i+1,"text":text,"needs_ocr":len(text)<cfg["min_page_text_chars"]})
    return result
def ocr_page(pdf_path,page_number):
    cfg=settings()
    if not cfg["ocr_enabled"]: return ""
    try:
        import pytesseract
        from PIL import Image
    except ImportError as e: raise RuntimeError("OCR perlu pytesseract dan Pillow.") from e
    with fitz.open(pdf_path) as doc:
        pix=doc[page_number-1].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
        return (pytesseract.image_to_string(Image.open(io.BytesIO(pix.tobytes("png"))),lang=cfg["ocr_language"]) or "").strip()
def extract_with_ocr(pdf_path):
    cfg=settings(); result=[]
    for p in extract_pages(pdf_path):
        ocr=ocr_page(pdf_path,p["page"]) if p["needs_ocr"] and cfg["ocr_enabled"] else ""
        result.append({"page":p["page"],"text":clean_text(ocr if len(ocr)>len(p["text"]) else p["text"])})
    return result
