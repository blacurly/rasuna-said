"""
ingest.py — Ingestion dokumen AIRA (versi script untuk GitHub Actions).

Alur: document_registry (Supabase) -> unduh PDF dari Google Drive -> ekstraksi teks (+OCR)
      -> chunking -> embedding (Sentence Transformers, 768 dimensi) -> simpan ke document_chunks.

PENTING: EMBEDDING_MODEL_NAME harus sama dengan model di layanan embedding Python
(EMBEDDING_API_URL) yang dipakai services/assistantService.js. Kalau berbeda, vektor
pertanyaan dan vektor dokumen tidak bisa dibandingkan.

Konfigurasi lewat environment variable:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (wajib, dari GitHub Secrets)
  FORCE_REPROCESS = "true" / "false"   (default false)
  MAKS_DOKUMEN    = angka atau kosong  (default kosong = semua)
"""

import hashlib
import os
import re
import sys
import tempfile
import time
from collections import Counter
from datetime import datetime, timezone

import gdown
import pymupdf
import pytesseract
from PIL import Image
from sentence_transformers import SentenceTransformer
from supabase import create_client

# ---------- Konfigurasi ----------
def wajib(nama):
    nilai = os.environ.get(nama, "").strip()
    if not nilai:
        sys.exit(f"❌ Environment variable {nama} belum diisi.")
    return nilai

SUPABASE_URL = wajib("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = wajib("SUPABASE_SERVICE_ROLE_KEY")

FORCE_REPROCESS = os.environ.get("FORCE_REPROCESS", "false").lower() == "true"
_maks = os.environ.get("MAKS_DOKUMEN", "").strip()
MAKS_DOKUMEN = int(_maks) if _maks else None
STATUS_DIPROSES = ("pending", "failed")
HAPUS_CHUNK_VERSI_LAMA = False

EMBEDDING_MODEL_NAME = os.environ.get(
    "EMBEDDING_MODEL_NAME", "sentence-transformers/paraphrase-multilingual-mpnet-base-v2"
)
EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIMENSION", "768"))

CHUNK_SIZE = 1500
CHUNK_OVERLAP = 250

OCR_BAHASA = "ind+eng"
OCR_DPI = 300
MIN_KARAKTER_TEKS = 30

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
print(f"⏳ Memuat model embedding: {EMBEDDING_MODEL_NAME}")
embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
if embedding_model.get_sentence_embedding_dimension() != EMBEDDING_DIM:
    sys.exit(f"❌ Dimensi model tidak sama dengan vector({EMBEDDING_DIM}) di database.")


# ---------- 1. Registry ----------
def muat_registry():
    res = supabase.table("document_registry").select("*").order("title").execute()
    return res.data or []


# ---------- 2. Unduh + ekstraksi (+OCR) ----------
def dapatkan_drive_id(doc):
    fid = (doc.get("drive_file_id") or "").strip()
    if fid:
        return fid
    url = doc.get("drive_url") or ""
    m = re.search(r"/d/([A-Za-z0-9_-]+)", url) or re.search(r"[?&]id=([A-Za-z0-9_-]+)", url)
    return m.group(1) if m else None


def download_from_drive(doc):
    fid = dapatkan_drive_id(doc)
    if not fid:
        raise ValueError("drive_file_id dan drive_url kosong atau tidak valid.")
    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp.close()
    try:
        hasil = gdown.download(f"https://drive.google.com/uc?id={fid}", tmp.name, quiet=True)
        if hasil is None or os.path.getsize(tmp.name) == 0:
            raise RuntimeError(f"Gagal mengunduh file Drive {fid}. Cek izin 'Anyone with the link'.")
        with open(tmp.name, "rb") as f:
            if f.read(5) != b"%PDF-":
                raise RuntimeError(f"File Drive {fid} bukan PDF (kemungkinan halaman login Google).")
    except Exception:
        os.remove(tmp.name)
        raise
    return tmp.name


def siapkan_ocr():
    try:
        tersedia = set(pytesseract.get_languages(config=""))
    except Exception as e:
        print(f"⚠️ Tesseract tidak ditemukan ({e}). OCR dinonaktifkan.")
        return False
    kurang = [b for b in OCR_BAHASA.split("+") if b not in tersedia]
    if kurang:
        print(f"⚠️ Paket bahasa Tesseract belum terpasang: {kurang}. OCR dinonaktifkan.")
        return False
    return True


OCR_SIAP = siapkan_ocr()


def ocr_halaman(page):
    pix = page.get_pixmap(dpi=OCR_DPI, alpha=False)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("L")
    return pytesseract.image_to_string(img, lang=OCR_BAHASA).strip()


def extract_pdf_pages(pdf_path, doc):
    raw_pages, n_ocr = [], 0
    waktu = datetime.now(timezone.utc).isoformat()
    with pymupdf.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf, start=1):
            text = page.get_text("text").strip()
            if OCR_SIAP and len(text) < MIN_KARAKTER_TEKS:
                try:
                    hasil_ocr = ocr_halaman(page)
                except Exception as e:
                    print(f"   ⚠️ OCR gagal di halaman {page_num}: {e}")
                    hasil_ocr = ""
                if len(hasil_ocr) > len(text):
                    text, n_ocr = hasil_ocr, n_ocr + 1
            if not text:
                continue
            raw_pages.append({
                "filename": doc.get("original_filename") or doc.get("title"),
                "title": doc.get("title"),
                "publisher": doc.get("publisher"),
                "category": doc.get("category"),
                "drive_url": doc.get("drive_url"),
                "page": page_num,
                "text": text,
                "ingested_at": waktu,
            })
    print(f"   🔍 OCR dipakai pada {n_ocr} halaman; {len(raw_pages)} halaman berisi teks.")
    return raw_pages


# ---------- 3. Chunking ----------
def chunk_text(text):
    text = " ".join(text.split())
    chunks, start = [], 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        part = text[start:end].strip()
        if part:
            chunks.append(part)
        if end >= len(text):
            break
        start = end - CHUNK_OVERLAP
    return chunks


def create_chunks(raw_pages):
    chunks, idx = [], 0
    for p in raw_pages:
        info = {k: v for k, v in p.items() if k != "text"}
        for part in chunk_text(p["text"]):
            chunks.append({**info, "chunk_index": idx, "content": part})
            idx += 1
    return chunks


# ---------- 4. Embedding (Sentence Transformers, sama seperti notebook) ----------
def generate_embeddings(chunks):
    vektor = embedding_model.encode(
        [c["content"] for c in chunks],
        batch_size=16,
        show_progress_bar=False,
        normalize_embeddings=True,  # assistantService.js mengecek norma = 1
    )
    return [v.tolist() for v in vektor]


# ---------- 5. Simpan ke Supabase ----------
def calculate_file_checksum(path):
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            sha.update(block)
    return sha.hexdigest()


def _simpan_batch(batch, percobaan=3):
    for i in range(percobaan):
        try:
            (supabase.table("document_chunks")
                .upsert(batch, on_conflict="document_id,checksum_sha256,chunk_index")
                .execute())
            return
        except Exception:
            if i == percobaan - 1:
                raise
            time.sleep(2 * (i + 1))


def save_chunks(doc, chunks, embeddings, checksum, batch_size=50):
    rows = [{
        "document_id": doc["document_id"],
        "chunk_index": c["chunk_index"],
        "content": c["content"],
        "page_start": c["page"],
        "page_end": c["page"],
        "metadata": {k: c[k] for k in ("filename", "title", "publisher", "category", "drive_url", "ingested_at")},
        "checksum_sha256": checksum,
        "embedding": emb,
    } for c, emb in zip(chunks, embeddings)]
    for start in range(0, len(rows), batch_size):
        _simpan_batch(rows[start:start + batch_size])
    return len(rows)


def update_status(document_id, checksum=None, status="completed", error=None):
    now = datetime.now(timezone.utc).isoformat()
    data = {"processing_status": status, "error_message": error, "updated_at": now}
    if status == "completed":
        data.update({"checksum_sha256": checksum, "last_successful_checksum": checksum, "last_processed_at": now})
    supabase.table("document_registry").update(data).eq("document_id", document_id).execute()


def process_document(doc):
    title = doc.get("title") or str(doc["document_id"])
    pdf_path = None
    try:
        print(f"\n📄 Memproses: {title}")
        pdf_path = download_from_drive(doc)
        checksum = calculate_file_checksum(pdf_path)
        if (not FORCE_REPROCESS and doc.get("processing_status") == "completed"
                and doc.get("last_successful_checksum") == checksum):
            print("   ⏭️ Dilewati: file belum berubah.")
            return "dilewati"

        raw_pages = extract_pdf_pages(pdf_path, doc)
        if not raw_pages:
            raise ValueError("Tidak ada teks yang terekstrak, bahkan setelah OCR.")
        chunks = create_chunks(raw_pages)
        embeddings = generate_embeddings(chunks)
        if len(embeddings[0]) != EMBEDDING_DIM:
            raise ValueError(f"Dimensi embedding {len(embeddings[0])} tidak sama dengan {EMBEDDING_DIM}.")

        jumlah = save_chunks(doc, chunks, embeddings, checksum)
        update_status(doc["document_id"], checksum, "completed")
        if HAPUS_CHUNK_VERSI_LAMA:
            (supabase.table("document_chunks").delete()
                .eq("document_id", doc["document_id"]).neq("checksum_sha256", checksum).execute())
        print(f"   🎉 Selesai: {len(raw_pages)} halaman, {jumlah} chunk.")
        return "completed"
    except Exception as e:
        print(f"   ❌ Gagal: {e}")
        try:
            update_status(doc["document_id"], status="failed", error=str(e)[:1000])
        except Exception as e2:
            print(f"   ⚠️ Status 'failed' juga gagal dicatat: {e2}")
        return "failed"
    finally:
        if pdf_path and os.path.exists(pdf_path):
            os.remove(pdf_path)


# ---------- 6. Main ----------
def main():
    docs = muat_registry()
    antrean = docs if FORCE_REPROCESS else [d for d in docs if d.get("processing_status") in STATUS_DIPROSES]
    if MAKS_DOKUMEN is not None:
        antrean = antrean[:MAKS_DOKUMEN]
    print(f"📚 Registry: {len(docs)} dokumen | antrean: {len(antrean)} | force={FORCE_REPROCESS} | OCR={OCR_SIAP}")

    ringkasan = Counter(process_document(d) for d in antrean)
    print("\n📊 Ringkasan:", dict(ringkasan) or "tidak ada dokumen diproses")
    if ringkasan.get("failed"):
        sys.exit(1)  # tandai workflow gagal supaya kelihatan merah di tab Actions


if __name__ == "__main__":
    main()
