"""
ingest.py — AIRA Document Ingestion Pipeline

Alur:
document_registry (Supabase)
    -> Download PDF (Google Drive)
    -> Extract text + OCR
    -> Chunking
    -> Generate embedding (Gemini, 768 dimensi)
    -> Upsert chunks ke Supabase
    -> Aktifkan checksum terbaru
    -> Bersihkan chunk versi lama

Environment variables:
    NEXT_PUBLIC_SUPABASE_URL      Wajib
    SUPABASE_SERVICE_ROLE_KEY     Wajib
    GEMINI_API_KEY                Wajib
    FORCE_REPROCESS               true / false
    MAKS_DOKUMEN                  Angka positif atau kosong
    EMBEDDING_MODEL_NAME          gemini-embedding-001
    EMBEDDING_DIMENSION           768
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
            f"Environment variable {nama} belum diisi."
        )

    return nilai


NEXT_PUBLIC_SUPABASE_URL = wajib("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = wajib("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = wajib("GEMINI_API_KEY")

if not NEXT_PUBLIC_SUPABASE_URL.startswith(("https://", "http://")):
    sys.exit(
        "NEXT_PUBLIC_SUPABASE_URL harus berupa URL HTTP/HTTPS."
    )


FORCE_REPROCESS = (
    os.environ.get("FORCE_REPROCESS", "false").strip().lower()
    == "true"
)

_maks = os.environ.get("MAKS_DOKUMEN", "").strip()

try:
    MAKS_DOKUMEN = int(_maks) if _maks else None
except ValueError:
    sys.exit("MAKS_DOKUMEN harus berupa bilangan bulat.")

if MAKS_DOKUMEN is not None and MAKS_DOKUMEN < 1:
    sys.exit("MAKS_DOKUMEN harus lebih besar dari 0.")


STATUS_DIPROSES = ("pending", "failed")

# Model harus sama dengan model embedding pada website AIRA.
MODEL_EMBEDDING = "gemini-embedding-001"

EMBEDDING_MODEL_NAME = os.environ.get(
    "EMBEDDING_MODEL_NAME",
    MODEL_EMBEDDING
).strip()

try:
    EMBEDDING_DIM = int(
        os.environ.get("EMBEDDING_DIMENSION", "768")
    )
except ValueError:
    sys.exit("EMBEDDING_DIMENSION harus berupa angka.")

if EMBEDDING_MODEL_NAME != MODEL_EMBEDDING:
    sys.exit(
        f"Model embedding harus {MODEL_EMBEDDING}, "
        f"bukan {EMBEDDING_MODEL_NAME}."
    )

if EMBEDDING_DIM != 768:
    sys.exit(
        "EMBEDDING_DIMENSION harus 768 agar sesuai "
        "dengan konfigurasi database dan website AIRA."
    )


# Pengaturan chunking
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 250

# Pengaturan OCR
OCR_BAHASA = "ind+eng"
OCR_DPI = 300
MIN_KARAKTER_TEKS = 30

# Pengaturan batch dan retry
BATCH_EMBEDDING = 50
MAX_RETRY_EMBEDDING = 5

BATCH_DATABASE = 50
MAX_RETRY_DATABASE = 3

# Aktifkan pembersihan chunk versi lama.
# Pembersihan dilakukan SETELAH checksum baru berhasil diaktifkan.
HAPUS_CHUNK_VERSI_LAMA = True


# =========================================================
# 2. INISIALISASI SUPABASE DAN GEMINI
# =========================================================

print("=" * 65)
print("AIRA DOCUMENT INGESTION")
print("=" * 65)

print("Menghubungkan ke Supabase...")

try:
    supabase = create_client(
        NEXT_PUBLIC_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY
    )
except Exception as e:
    sys.exit(f"Gagal membuat koneksi Supabase: {e}")


print(
    f"Menyiapkan Gemini embedding: {EMBEDDING_MODEL_NAME}"
)

try:
    gemini_client = genai.Client(
        api_key=GEMINI_API_KEY
    )
except Exception as e:
    sys.exit(f"Gagal membuat client Gemini: {e}")


def normalisasi(vector):
    """
    Normalisasi L2 untuk embedding 768 dimensi.
    """

    nilai_vector = [float(nilai) for nilai in vector]

    if not nilai_vector:
        raise ValueError("Embedding kosong.")

    if not all(math.isfinite(nilai) for nilai in nilai_vector):
        raise ValueError("Embedding mengandung nilai tidak valid.")

    norma = math.sqrt(
        sum(nilai * nilai for nilai in nilai_vector)
    )

    if not math.isfinite(norma) or norma == 0:
        raise ValueError("Embedding tidak dapat dinormalisasi.")

    return [
        nilai / norma
        for nilai in nilai_vector
    ]


def embed_batch(teks_list):
    """
    Membuat embedding Gemini untuk satu batch teks.

    Task type:
        RETRIEVAL_DOCUMENT

    Model:
        gemini-embedding-001

    Dimensi:
        768
    """

    if not teks_list:
        return []

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

            hasil = response.embeddings or []

            if len(hasil) != len(teks_list):
                raise ValueError(
                    "Jumlah embedding dari Gemini tidak sesuai "
                    "dengan jumlah teks yang dikirim."
                )

            embeddings = [
                normalisasi(list(item.values))
                for item in hasil
            ]

            for idx, embedding in enumerate(embeddings):

                if len(embedding) != EMBEDDING_DIM:
                    raise ValueError(
                        f"Embedding ke-{idx} menghasilkan "
                        f"{len(embedding)} dimensi, "
                        f"seharusnya {EMBEDDING_DIM}."
                    )

            return embeddings

        except Exception as e:

            if percobaan == MAX_RETRY_EMBEDDING - 1:
                raise

            jeda = 5 * (percobaan + 1)

            print(
                f"Embedding gagal: {str(e)[:150]}. "
                f"Mencoba lagi dalam {jeda} detik..."
            )

            time.sleep(jeda)


# Tes koneksi Gemini sebelum ingestion dimulai.
try:
    embedding_tes = embed_batch([
        "Tes koneksi embedding AIRA."
    ])

    if len(embedding_tes) != 1:
        raise ValueError("Hasil tes embedding tidak valid.")

    if len(embedding_tes[0]) != EMBEDDING_DIM:
        raise ValueError("Dimensi embedding tes tidak sesuai.")

except Exception as e:
    sys.exit(f"Gagal memanggil Gemini embedding: {e}")


print(
    f"Gemini siap: {EMBEDDING_MODEL_NAME}, "
    f"{EMBEDDING_DIM} dimensi."
)


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
            f"Tesseract tidak ditemukan: {e}. "
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
            f"Paket bahasa OCR belum tersedia: {kurang}. "
            "OCR dinonaktifkan."
        )
        return False

    print("Tesseract OCR siap: Indonesia + Inggris.")

    return True


OCR_SIAP = siapkan_ocr()


# =========================================================
# 4. MEMUAT DOCUMENT REGISTRY
# =========================================================

def muat_registry():
    """Mengambil seluruh dokumen dari document_registry."""

    print("Mengambil document registry dari Supabase...")

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
    """Mengambil Google Drive ID dari registry."""

    file_id = (
        doc.get("drive_file_id") or ""
    ).strip()

    if file_id:
        return file_id

    url = doc.get("drive_url") or ""

    match = (
        re.search(r"/d/([A-Za-z0-9_-]+)", url)
        or re.search(r"[?&]id=([A-Za-z0-9_-]+)", url)
    )

    return match.group(1) if match else None


def download_from_drive(doc):
    """Mengunduh PDF dari Google Drive."""

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
                "Periksa izin akses file."
            )

        with open(tmp_path, "rb") as file:
            signature = file.read(5)

        if signature != b"%PDF-":
            raise RuntimeError(
                f"File Drive {file_id} bukan PDF. "
                "Kemungkinan yang terunduh adalah halaman login."
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
    """Mengekstrak teks dari setiap halaman PDF."""

    raw_pages = []
    jumlah_ocr = 0

    waktu = datetime.now(timezone.utc).isoformat()

    with pymupdf.open(pdf_path) as pdf:

        total_halaman = len(pdf)

        print(
            f"Mengekstrak {total_halaman} halaman PDF..."
        )

        for page_num, page in enumerate(pdf, start=1):

            text = page.get_text("text").strip()

            if OCR_SIAP and len(text) < MIN_KARAKTER_TEKS:

                try:
                    hasil_ocr = ocr_halaman(page)

                except Exception as e:
                    print(
                        f"OCR gagal di halaman {page_num}: {e}"
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
        f"OCR digunakan pada {jumlah_ocr} halaman."
    )

    print(
        f"{len(raw_pages)} halaman berhasil diekstrak."
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

    print(
        f"Total chunk dibuat: {len(chunks)}"
    )

    return chunks


# =========================================================
# 8. GENERATE EMBEDDING
# =========================================================

def generate_embeddings(chunks):
    """Mengubah seluruh chunk menjadi embedding Gemini."""

    if not chunks:
        return []

    print(
        f"Membuat embedding menggunakan {EMBEDDING_MODEL_NAME}..."
    )

    contents = [
        chunk["content"]
        for chunk in chunks
    ]

    embeddings = []

    for start in range(0, len(contents), BATCH_EMBEDDING):

        batch_teks = contents[
            start:start + BATCH_EMBEDDING
        ]

        batch_embeddings = embed_batch(batch_teks)

        embeddings.extend(batch_embeddings)

        selesai = min(
            start + BATCH_EMBEDDING,
            len(contents)
        )

        print(
            f"Embedding: {selesai}/{len(contents)}"
        )

        time.sleep(1)

    if len(embeddings) != len(chunks):
        raise ValueError(
            "Jumlah embedding tidak sama dengan jumlah chunk."
        )

    for idx, embedding in enumerate(embeddings):

        if len(embedding) != EMBEDDING_DIM:
            raise ValueError(
                f"Dimensi embedding chunk {idx} tidak sesuai."
            )

    print(
        f"{len(embeddings)} embedding berhasil dibuat."
    )

    return embeddings


# =========================================================
# 9. CHECKSUM FILE
# =========================================================

def calculate_file_checksum(path):
    """Menghitung SHA-256 file PDF."""

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

def _simpan_batch(
    batch,
    percobaan=MAX_RETRY_DATABASE
):
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

        except Exception as e:

            if i == percobaan - 1:
                raise

            waktu_tunggu = 2 * (i + 1)

            print(
                f"Gagal menyimpan batch: {str(e)[:150]}. "
                f"Mencoba ulang dalam {waktu_tunggu} detik..."
            )

            time.sleep(waktu_tunggu)


def save_chunks(doc, chunks, embeddings, checksum):
    """
    Menyimpan chunk dan embedding baru.

    embedding_model dicatat pada setiap baris.
    Upsert akan memperbarui embedding lama jika
    document_id, checksum, dan chunk_index sama.
    """

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
            "embedding_model": EMBEDDING_MODEL_NAME,
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
            f"Chunk tersimpan: {selesai}/{total}"
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
    """Memperbarui status dokumen di registry."""

    now = datetime.now(timezone.utc).isoformat()

    data = {
        "processing_status": status,
        "error_message": error,
        "updated_at": now
    }

    if status == "completed":

        if not checksum:
            raise ValueError(
                "Checksum wajib tersedia untuk status completed."
            )

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


def update_status_gagal(doc, error):
    """
    Jika dokumen sebelumnya sudah completed,
    pertahankan status dan checksum versi terakhir.

    Ini mencegah kegagalan re-ingestion membuat
    dokumen lama tidak dapat digunakan.
    """

    document_id = doc["document_id"]

    now = datetime.now(timezone.utc).isoformat()

    sebelumnya_sudah_berhasil = (
        doc.get("processing_status") == "completed"
        and bool(doc.get("last_successful_checksum"))
    )

    if sebelumnya_sudah_berhasil:

        data = {
            "error_message": error[:1000],
            "updated_at": now
        }

        print(
            "Versi dokumen sebelumnya tetap dipertahankan."
        )

    else:

        data = {
            "processing_status": "failed",
            "error_message": error[:1000],
            "updated_at": now
        }

    (
        supabase
        .table("document_registry")
        .update(data)
        .eq("document_id", document_id)
        .execute()
    )


# =========================================================
# 12. MEMBERSIHKAN CHUNK VERSI LAMA
# =========================================================

def hapus_chunk_lama(doc, checksum, jumlah_chunk_baru):
    """
    Menghapus chunk versi lama setelah checksum terbaru
    berhasil diaktifkan di document_registry.

    Chunk dengan checksum berbeda akan dihapus.
    Chunk sisa dengan indeks melebihi jumlah chunk baru
    juga akan dihapus.
    """

    if not HAPUS_CHUNK_VERSI_LAMA:
        return

    document_id = doc["document_id"]

    print(
        "Membersihkan chunk versi lama..."
    )

    # Hapus chunk dari checksum dokumen sebelumnya.
    (
        supabase
        .table("document_chunks")
        .delete()
        .eq("document_id", document_id)
        .neq("checksum_sha256", checksum)
        .execute()
    )

    # Hapus indeks sisa jika jumlah chunk versi baru
    # lebih sedikit daripada versi sebelumnya.
    indeks_maksimum = jumlah_chunk_baru - 1

    (
        supabase
        .table("document_chunks")
        .delete()
        .eq("document_id", document_id)
        .eq("checksum_sha256", checksum)
        .gt("chunk_index", indeks_maksimum)
        .execute()
    )

    print(
        "Pembersihan chunk versi lama selesai."
    )


# =========================================================
# 13. PROSES SATU DOKUMEN
# =========================================================

def process_document(doc):

    document_id = doc.get("document_id")

    if not document_id:
        print(
            "Dokumen tidak memiliki document_id."
        )
        return "failed"

    title = (
        doc.get("title")
        or str(document_id)
    )

    pdf_path = None

    try:

        print("\n" + "-" * 65)
        print(f"Memproses: {title}")
        print("-" * 65)

        # 1. Download PDF
        pdf_path = download_from_drive(doc)

        # 2. Hitung checksum
        checksum = calculate_file_checksum(pdf_path)

        print(
            f"Checksum dokumen: {checksum}"
        )

        # 3. Ekstraksi teks
        raw_pages = extract_pdf_pages(
            pdf_path,
            doc
        )

        if not raw_pages:
            raise ValueError(
                "Tidak ada teks yang berhasil diekstrak, "
                "termasuk setelah OCR."
            )

        # 4. Chunking
        chunks = create_chunks(raw_pages)

        if not chunks:
            raise ValueError(
                "Tidak ada chunk yang berhasil dibuat."
            )

        # 5. Embedding Gemini
        embeddings = generate_embeddings(chunks)

        if not embeddings:
            raise ValueError(
                "Embedding tidak berhasil dibuat."
            )

        if len(embeddings[0]) != EMBEDDING_DIM:
            raise ValueError(
                "Dimensi embedding tidak sesuai."
            )

        # 6. Simpan seluruh chunk baru.
        jumlah = save_chunks(
            doc,
            chunks,
            embeddings,
            checksum
        )

        if jumlah != len(chunks):
            raise ValueError(
                "Jumlah chunk yang disimpan tidak sesuai."
            )

        # 7. Aktifkan checksum baru.
        # RPC akan mulai menggunakan chunk dengan checksum ini.
        update_status(
            document_id=document_id,
            checksum=checksum,
            status="completed"
        )

        # 8. Bersihkan versi lama setelah versi baru aktif.
        # Kegagalan pembersihan tidak membatalkan ingestion.
        try:
            hapus_chunk_lama(
                doc,
                checksum,
                jumlah
            )

        except Exception as cleanup_error:
            print(
                "PERINGATAN: Chunk baru sudah aktif, "
                "tetapi pembersihan chunk lama gagal: "
                f"{cleanup_error}"
            )

        print(
            f"Selesai: {len(raw_pages)} halaman, "
            f"{jumlah} chunk."
        )

        print(
            f"Model embedding: {EMBEDDING_MODEL_NAME}"
        )

        return "completed"

    except Exception as e:

        print(
            f"Gagal memproses {title}: {e}"
        )

        try:
            update_status_gagal(
                doc,
                str(e)
            )

        except Exception as status_error:

            print(
                "Gagal memperbarui status dokumen: "
                f"{status_error}"
            )

        return "failed"

    finally:

        if pdf_path and os.path.exists(pdf_path):

            try:
                os.remove(pdf_path)

            except OSError as e:
                print(
                    f"File sementara gagal dihapus: {e}"
                )


# =========================================================
# 14. MAIN
# =========================================================

def main():

    print(
        "\nMemulai proses ingestion AIRA...\n"
    )

    docs = muat_registry()

    if not docs:
        print(
            "Tidak ada dokumen di document_registry."
        )
        return

    # FORCE_REPROCESS=true:
    # Semua dokumen diproses ulang, termasuk completed.
    #
    # FORCE_REPROCESS=false:
    # Hanya dokumen pending dan failed yang diproses.
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

    print("\nINFORMASI INGESTION")
    print("-" * 45)

    print(
        f"Total registry       : {len(docs)}"
    )

    print(
        f"Dokumen antrean      : {len(antrean)}"
    )

    print(
        f"Force reprocess      : {FORCE_REPROCESS}"
    )

    print(
        f"Batas dokumen        : {MAKS_DOKUMEN or 'Semua'}"
    )

    print(
        f"OCR tersedia         : {OCR_SIAP}"
    )

    print(
        f"Model embedding      : {EMBEDDING_MODEL_NAME}"
    )

    print(
        f"Dimensi embedding    : {EMBEDDING_DIM}"
    )

    print(
        f"Task type            : RETRIEVAL_DOCUMENT"
    )

    print("-" * 45)

    if not antrean:

        print(
            "Tidak ada dokumen pending atau failed."
        )
        return

    ringkasan = Counter()

    for index, doc in enumerate(antrean, start=1):

        print(
            f"\nPROGRES DOKUMEN {index}/{len(antrean)}"
        )

        hasil = process_document(doc)

        ringkasan[hasil] += 1

    print("\n" + "=" * 65)
    print("RINGKASAN INGESTION")
    print("=" * 65)

    print(
        f"Berhasil : {ringkasan.get('completed', 0)}"
    )

    print(
        f"Gagal    : {ringkasan.get('failed', 0)}"
    )

    print(
        f"Model    : {EMBEDDING_MODEL_NAME}"
    )

    if ringkasan.get("failed", 0) > 0:

        print(
            "\nIngestion selesai dengan beberapa kegagalan."
        )

        sys.exit(1)

    print(
        "\nSeluruh dokumen dalam antrean berhasil diproses."
    )


if __name__ == "__main__":
    main()
