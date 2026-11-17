"""
ingest.py — AIRA Document Ingestion Pipeline

Alur:
document_registry (Supabase)
    -> Download PDF (Google Drive)
    -> Extract text + OCR
    -> Chunking
    -> Generate embedding (Gemini API, 768 dimensi)
    -> Save chunks to Supabase

Environment variables:
    NEXT_PUBLIC_SUPABASE_URL      Wajib
    SUPABASE_SERVICE_ROLE_KEY     Wajib
    GEMINI_API_KEY                Wajib
    FORCE_REPROCESS               true / false (default false)
    MAKS_DOKUMEN                  Angka positif atau kosong
    EMBEDDING_MODEL_NAME          Nama model embedding
    EMBEDDING_DIMENSION           Dimensi embedding (default 768)
"""

import hashlib
import math
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
from google import genai
from google.genai import types
from supabase import create_client


# =========================================================
# 1. KONFIGURASI
# =========================================================

def wajib(nama):
    """Mengambil environment variable yang wajib tersedia."""
    nilai = os.environ.get(nama, "").strip()

    if not nilai:
        sys.exit(
            f"❌ Environment variable {nama} belum diisi."
        )

    return nilai


NEXT_PUBLIC_SUPABASE_URL = wajib("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = wajib("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = wajib("GEMINI_API_KEY")

if not NEXT_PUBLIC_SUPABASE_URL.startswith(("https://", "http://")):
    sys.exit("❌ NEXT_PUBLIC_SUPABASE_URL harus berupa URL HTTP/HTTPS yang valid.")


FORCE_REPROCESS = (
    os.environ.get("FORCE_REPROCESS", "false").strip().lower()
    == "true"
)

_maks = os.environ.get("MAKS_DOKUMEN", "").strip()

try:
    MAKS_DOKUMEN = int(_maks) if _maks else None
except ValueError:
    sys.exit("❌ MAKS_DOKUMEN harus berupa bilangan bulat.")

if MAKS_DOKUMEN is not None and MAKS_DOKUMEN < 1:
    sys.exit("❌ MAKS_DOKUMEN harus lebih besar dari 0.")


STATUS_DIPROSES = ("pending", "failed")

# Tidak menghapus chunk lama secara otomatis.
# Aktifkan hanya setelah memastikan mekanisme penggantian data
# dan constraint database sudah sesuai.
HAPUS_CHUNK_VERSI_LAMA = False


# Model embedding WAJIB sama dengan GEMINI_EMBEDDING_MODEL
# di services/assistantService.js.
EMBEDDING_MODEL_NAME = os.environ.get(
    "EMBEDDING_MODEL_NAME",
    "gemini-embedding-001"
).strip()

try:
    EMBEDDING_DIM = int(
        os.environ.get("EMBEDDING_DIMENSION", "768")
    )
except ValueError:
    sys.exit("❌ EMBEDDING_DIMENSION harus berupa angka.")


if EMBEDDING_DIM < 1:
    sys.exit("❌ EMBEDDING_DIMENSION harus lebih besar dari 0.")


CHUNK_SIZE = 1500
CHUNK_OVERLAP = 250

OCR_BAHASA = "ind+eng"
OCR_DPI = 300
MIN_KARAKTER_TEKS = 30

BATCH_EMBEDDING = 50
MAX_RETRY_EMBEDDING = 5
BATCH_DATABASE = 50
MAX_RETRY_DATABASE = 3


# =========================================================
# 2. INISIALISASI SUPABASE DAN MODEL
# =========================================================

print("=" * 60)
print("AIRA DOCUMENT INGESTION")
print("=" * 60)

print("🔌 Menghubungkan ke Supabase...")

try:
    supabase = create_client(
        NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    )
except Exception as e:
    sys.exit(f"❌ Gagal membuat koneksi Supabase: {e}")


print(f"⏳ Menyiapkan Gemini embedding: {EMBEDDING_MODEL_NAME}")

try:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    sys.exit(f"❌ Gagal membuat client Gemini: {e}")


def normalisasi(vector):
    """Hanya output 3072 dimensi yang dinormalisasi oleh API.
    Untuk 768 dimensi, vektor harus dinormalisasi sendiri."""
    norma = math.sqrt(sum(nilai * nilai for nilai in vector))

    if not math.isfinite(norma) or norma == 0:
        raise ValueError("Embedding tidak dapat dinormalisasi.")

    return [nilai / norma for nilai in vector]


def embed_batch(teks_list):
    """Membuat embedding untuk satu batch teks, dengan retry."""
    for percobaan in range(MAX_RETRY_EMBEDDING):
        try:
            response = gemini_client.models.embed_content(
                model=EMBEDDING_MODEL_NAME,
                contents=teks_list,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_DOCUMENT",
                    output_dimensionality=EMBEDDING_DIM,
                ),
            )
            return [
                normalisasi(list(item.values))
                for item in response.embeddings
            ]
        except Exception as e:
            if percobaan == MAX_RETRY_EMBEDDING - 1:
                raise

            jeda = 5 * (percobaan + 1)
            print(
                f"   ⏳ Embedding gagal ({str(e)[:100]}), "
                f"coba lagi dalam {jeda} detik..."
            )
            time.sleep(jeda)


try:
    dimensi_model = len(embed_batch(["tes koneksi embedding"])[0])
except Exception as e:
    sys.exit(f"❌ Gagal memanggil Gemini embedding: {e}")

if dimensi_model != EMBEDDING_DIM:
    sys.exit(
        f"❌ Dimensi model tidak sesuai. "
        f"Model menghasilkan {dimensi_model}, "
        f"sedangkan database dikonfigurasi untuk vector({EMBEDDING_DIM})."
    )

print(f"✅ Model embedding siap: {dimensi_model} dimensi.")


# =========================================================
# 3. PERSIAPAN OCR
# =========================================================

def siapkan_ocr():
    """Memastikan Tesseract dan bahasa OCR tersedia."""

    try:
        tersedia = set(
            pytesseract.get_languages(config="")
        )
    except Exception as e:
        print(
            f"⚠️ Tesseract tidak ditemukan: {e}. "
            "OCR dinonaktifkan."
        )
        return False

    kurang = [
        bahasa
        for bahasa in OCR_BAHASA.split("+")
        if bahasa not in tersedia
    ]

    if kurang:
        print(
            f"⚠️ Paket bahasa Tesseract belum tersedia: {kurang}. "
            "OCR dinonaktifkan."
        )
        return False

    print("✅ Tesseract OCR siap (Indonesia + Inggris).")
    return True


OCR_SIAP = siapkan_ocr()


# =========================================================
# 4. MEMUAT DOCUMENT REGISTRY
# =========================================================

def muat_registry():
    """Mengambil daftar dokumen dari document_registry."""

    print("📚 Mengambil document registry dari Supabase...")

    response = (
        supabase
        .table("document_registry")
        .select("*")
        .order("title")
        .execute()
    )

    return response.data or []


# =========================================================
# 5. GOOGLE DRIVE DOWNLOAD
# =========================================================

def dapatkan_drive_id(doc):
    """Mengambil Google Drive ID dari kolom registry."""

    file_id = (doc.get("drive_file_id") or "").strip()

    if file_id:
        return file_id

    url = doc.get("drive_url") or ""

    match = (
        re.search(r"/d/([A-Za-z0-9_-]+)", url)
        or re.search(r"[?&]id=([A-Za-z0-9_-]+)", url)
    )

    return match.group(1) if match else None


def download_from_drive(doc):
    """Mengunduh PDF dari Google Drive ke file sementara."""

    file_id = dapatkan_drive_id(doc)

    if not file_id:
        raise ValueError(
            "drive_file_id dan drive_url kosong atau tidak valid."
        )

    tmp = tempfile.NamedTemporaryFile(
        suffix=".pdf",
        delete=False
    )

    tmp_path = tmp.name
    tmp.close()

    try:
        hasil = gdown.download(
            f"https://drive.google.com/uc?id={file_id}",
            tmp_path,
            quiet=True
        )

        if (
            hasil is None
            or not os.path.exists(tmp_path)
            or os.path.getsize(tmp_path) == 0
        ):
            raise RuntimeError(
                f"Gagal mengunduh file Drive {file_id}. "
                "Periksa izin Anyone with the link."
            )

        with open(tmp_path, "rb") as file:
            signature = file.read(5)

        if signature != b"%PDF-":
            raise RuntimeError(
                f"File Drive {file_id} bukan PDF. "
                "Kemungkinan yang terunduh adalah halaman login Google."
            )

        return tmp_path

    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

        raise


# =========================================================
# 6. EKSTRAKSI PDF DAN OCR
# =========================================================

def ocr_halaman(page):
    """Menjalankan OCR pada satu halaman PDF."""

    pix = page.get_pixmap(
        dpi=OCR_DPI,
        alpha=False
    )

    img = Image.frombytes(
        "RGB",
        (pix.width, pix.height),
        pix.samples
    ).convert("L")

    return pytesseract.image_to_string(
        img,
        lang=OCR_BAHASA
    ).strip()


def extract_pdf_pages(pdf_path, doc):
    """Mengekstrak teks setiap halaman PDF."""

    raw_pages = []
    jumlah_ocr = 0

    waktu = datetime.now(timezone.utc).isoformat()

    with pymupdf.open(pdf_path) as pdf:

        total_halaman = len(pdf)

        print(
            f"   📖 Mengekstrak {total_halaman} halaman PDF..."
        )

        for page_num, page in enumerate(pdf, start=1):

            text = page.get_text("text").strip()

            # Jalankan OCR apabila teks hasil ekstraksi terlalu sedikit.
            if OCR_SIAP and len(text) < MIN_KARAKTER_TEKS:

                try:
                    hasil_ocr = ocr_halaman(page)

                except Exception as e:
                    print(
                        f"   ⚠️ OCR gagal di halaman {page_num}: {e}"
                    )
                    hasil_ocr = ""

                if len(hasil_ocr) > len(text):
                    text = hasil_ocr
                    jumlah_ocr += 1

            if not text:
                continue

            raw_pages.append({
                "filename": (
                    doc.get("original_filename")
                    or doc.get("title")
                ),
                "title": doc.get("title"),
                "publisher": doc.get("publisher"),
                "category": doc.get("category"),
                "drive_url": doc.get("drive_url"),
                "page": page_num,
                "text": text,
                "ingested_at": waktu,
            })

    print(
        f"   🔍 OCR digunakan pada {jumlah_ocr} halaman."
    )

    print(
        f"   📄 {len(raw_pages)} halaman berhasil diekstrak."
    )

    return raw_pages


# =========================================================
# 7. CHUNKING
# =========================================================

def chunk_text(text):
    """Membagi teks menjadi beberapa chunk dengan overlap."""

    text = " ".join(text.split())

    chunks = []
    start = 0

    while start < len(text):

        end = min(
            start + CHUNK_SIZE,
            len(text)
        )

        part = text[start:end].strip()

        if part:
            chunks.append(part)

        if end >= len(text):
            break

        start = end - CHUNK_OVERLAP

    return chunks


def create_chunks(raw_pages):
    """Membuat chunk berdasarkan halaman PDF."""

    chunks = []
    idx = 0

    for page in raw_pages:

        info = {
            key: value
            for key, value in page.items()
            if key != "text"
        }

        for part in chunk_text(page["text"]):

            chunks.append({
                **info,
                "chunk_index": idx,
                "content": part
            })

            idx += 1

    print(f"   ✂️ Total chunk dibuat: {len(chunks)}")

    return chunks


# =========================================================
# 8. GENERATE EMBEDDING
# =========================================================

def generate_embeddings(chunks):
    """Mengubah setiap chunk menjadi vektor embedding."""

    if not chunks:
        return []

    print("   🧠 Membuat embedding...")

    contents = [
        chunk["content"]
        for chunk in chunks
    ]

    embeddings = []

    for start in range(0, len(contents), BATCH_EMBEDDING):
        embeddings.extend(
            embed_batch(contents[start:start + BATCH_EMBEDDING])
        )
        time.sleep(1)  # jeda singkat supaya tidak kena rate limit

    if len(embeddings) != len(chunks):
        raise ValueError(
            "Jumlah embedding tidak sama dengan jumlah chunk."
        )

    for idx, embedding in enumerate(embeddings):

        if len(embedding) != EMBEDDING_DIM:
            raise ValueError(
                f"Dimensi embedding chunk {idx} tidak sesuai: "
                f"{len(embedding)}."
            )

    print(
        f"   ✅ {len(embeddings)} embedding berhasil dibuat."
    )

    return embeddings


# =========================================================
# 9. CHECKSUM FILE
# =========================================================

def calculate_file_checksum(path):
    """Menghitung SHA-256 untuk mendeteksi perubahan PDF."""

    sha = hashlib.sha256()

    with open(path, "rb") as file:

        for block in iter(
            lambda: file.read(1024 * 1024),
            b""
        ):
            sha.update(block)

    return sha.hexdigest()


# =========================================================
# 10. MENYIMPAN CHUNK KE SUPABASE
# =========================================================

def _simpan_batch(batch, percobaan=MAX_RETRY_DATABASE):
    """Menyimpan batch dengan mekanisme retry."""

    for i in range(percobaan):

        try:
            (
                supabase
                .table("document_chunks")
                .upsert(
                    batch,
                    on_conflict=(
                        "document_id,checksum_sha256,chunk_index"
                    )
                )
                .execute()
            )

            return

        except Exception:

            if i == percobaan - 1:
                raise

            waktu_tunggu = 2 * (i + 1)

            print(
                f"   ⚠️ Gagal menyimpan batch. "
                f"Mencoba ulang dalam {waktu_tunggu} detik..."
            )

            time.sleep(waktu_tunggu)


def save_chunks(doc, chunks, embeddings, checksum):
    """Menyimpan seluruh chunk dan embedding ke database."""

    if len(chunks) != len(embeddings):
        raise ValueError(
            "Jumlah chunk dan embedding tidak sama."
        )

    rows = []

    for chunk, embedding in zip(chunks, embeddings):

        rows.append({
            "document_id": doc["document_id"],
            "chunk_index": chunk["chunk_index"],
            "content": chunk["content"],
            "page_start": chunk["page"],
            "page_end": chunk["page"],
            "metadata": {
                key: chunk.get(key)
                for key in (
                    "filename",
                    "title",
                    "publisher",
                    "category",
                    "drive_url",
                    "ingested_at"
                )
            },
            "checksum_sha256": checksum,
            "embedding": embedding,
        })

    total = len(rows)

    for start in range(0, total, BATCH_DATABASE):

        batch = rows[
            start:start + BATCH_DATABASE
        ]

        _simpan_batch(batch)

        selesai = min(
            start + BATCH_DATABASE,
            total
        )

        print(
            f"   💾 Tersimpan: {selesai}/{total} chunk."
        )

    return total


# =========================================================
# 11. UPDATE STATUS DOCUMENT REGISTRY
# =========================================================

def update_status(
    document_id,
    checksum=None,
    status="completed",
    error=None
):
    """Memperbarui status pemrosesan dokumen."""

    now = datetime.now(timezone.utc).isoformat()

    data = {
        "processing_status": status,
        "error_message": error,
        "updated_at": now
    }

    if status == "completed":

        data.update({
            "checksum_sha256": checksum,
            "last_successful_checksum": checksum,
            "last_processed_at": now
        })

    (
        supabase
        .table("document_registry")
        .update(data)
        .eq("document_id", document_id)
        .execute()
    )


# =========================================================
# 12. PROSES SATU DOKUMEN
# =========================================================

def process_document(doc):

    document_id = doc.get("document_id")

    if not document_id:
        print("❌ Dokumen tidak memiliki document_id.")
        return "failed"

    title = (
        doc.get("title")
        or str(document_id)
    )

    pdf_path = None

    try:

        print("\n" + "-" * 60)
        print(f"📄 Memproses: {title}")
        print("-" * 60)

        # Download PDF
        pdf_path = download_from_drive(doc)

        # Hitung checksum
        checksum = calculate_file_checksum(pdf_path)

        # Ekstraksi teks
        raw_pages = extract_pdf_pages(
            pdf_path,
            doc
        )

        if not raw_pages:
            raise ValueError(
                "Tidak ada teks yang berhasil diekstrak, "
                "termasuk setelah OCR."
            )

        # Chunking
        chunks = create_chunks(raw_pages)

        if not chunks:
            raise ValueError(
                "Tidak ada chunk yang berhasil dibuat."
            )

        # Embedding
        embeddings = generate_embeddings(chunks)

        # Validasi embedding
        if len(embeddings[0]) != EMBEDDING_DIM:
            raise ValueError(
                f"Dimensi embedding tidak sesuai: "
                f"{len(embeddings[0])}."
            )

        # Simpan ke database
        jumlah = save_chunks(
            doc,
            chunks,
            embeddings,
            checksum
        )

        # Hapus chunk versi lama jika konfigurasi diaktifkan.
        if HAPUS_CHUNK_VERSI_LAMA:

            (
                supabase
                .table("document_chunks")
                .delete()
                .eq("document_id", document_id)
                .neq("checksum_sha256", checksum)
                .execute()
            )

        # Tandai dokumen berhasil.
        update_status(
            document_id=document_id,
            checksum=checksum,
            status="completed"
        )

        print(
            f"🎉 Selesai: {len(raw_pages)} halaman, "
            f"{jumlah} chunk."
        )

        return "completed"

    except Exception as e:

        print(f"❌ Gagal memproses {title}: {e}")

        try:
            update_status(
                document_id=document_id,
                status="failed",
                error=str(e)[:1000]
            )

        except Exception as status_error:

            print(
                "⚠️ Gagal memperbarui status dokumen: "
                f"{status_error}"
            )

        return "failed"

    finally:

        if pdf_path and os.path.exists(pdf_path):

            try:
                os.remove(pdf_path)
            except OSError as e:
                print(
                    f"⚠️ File sementara gagal dihapus: {e}"
                )


# =========================================================
# 13. MAIN
# =========================================================

def main():

    print("\n🔎 Memulai proses ingestion AIRA...\n")

    docs = muat_registry()

    if not docs:
        print(
            "⚠️ Tidak ada dokumen di document_registry."
        )
        return

    if FORCE_REPROCESS:

        antrean = docs

    else:

        antrean = [
            doc
            for doc in docs
            if doc.get("processing_status") in STATUS_DIPROSES
        ]

    if MAKS_DOKUMEN is not None:
        antrean = antrean[:MAKS_DOKUMEN]

    print("\n📊 INFORMASI INGESTION")
    print("-" * 40)
    print(f"Total registry     : {len(docs)}")
    print(f"Dokumen antrean    : {len(antrean)}")
    print(f"Force reprocess    : {FORCE_REPROCESS}")
    print(f"Batas dokumen      : {MAKS_DOKUMEN or 'Semua'}")
    print(f"OCR tersedia       : {OCR_SIAP}")
    print(f"Model embedding    : {EMBEDDING_MODEL_NAME}")
    print(f"Dimensi embedding  : {EMBEDDING_DIM}")
    print("-" * 40)

    if not antrean:

        print(
            "ℹ️ Tidak ada dokumen berstatus pending atau failed."
        )
        return

    ringkasan = Counter(
        process_document(doc)
        for doc in antrean
    )

    print("\n" + "=" * 60)
    print("RINGKASAN INGESTION")
    print("=" * 60)

    print(f"Berhasil : {ringkasan.get('completed', 0)}")
    print(f"Gagal    : {ringkasan.get('failed', 0)}")
    print(f"Dilewati : {ringkasan.get('dilewati', 0)}")

    if ringkasan.get("failed", 0) > 0:
        print(
            "\n❌ Ingestion selesai dengan kegagalan."
        )
        sys.exit(1)

    print(
        "\n✅ Seluruh dokumen dalam antrean berhasil diproses."
    )


if __name__ == "__main__":
    main()
