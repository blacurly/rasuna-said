
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

PENTING:
- Selama migrasi, chunk versi lama TIDAK dihapus.
- Dokumen yang gagal diproses tetap mempertahankan checksum aktif sebelumnya.
- FORCE_REPROCESS=false akan memeriksa embedding aktif dan melewati
  dokumen yang seluruh chunk aktifnya sudah menggunakan Gemini.

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


# GitHub Actions menampilkan log segera, tidak menunggu buffer penuh.
try:
    sys.stdout.reconfigure(line_buffering=True)
    sys.stderr.reconfigure(line_buffering=True)
except (AttributeError, OSError):
    pass


# =========================================================
# 1. KONFIGURASI
# =========================================================

def wajib(nama):
    nilai = os.environ.get(nama, "").strip()
    if not nilai:
        sys.exit(f"Environment variable {nama} belum diisi.")
    return nilai


NEXT_PUBLIC_SUPABASE_URL = wajib("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = wajib("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = wajib("GEMINI_API_KEY")

if not NEXT_PUBLIC_SUPABASE_URL.startswith(("https://", "http://")):
    sys.exit("NEXT_PUBLIC_SUPABASE_URL harus berupa URL HTTP/HTTPS.")

FORCE_REPROCESS = (
    os.environ.get("FORCE_REPROCESS", "false").strip().lower() == "true"
)

_maks = os.environ.get("MAKS_DOKUMEN", "").strip()
try:
    MAKS_DOKUMEN = int(_maks) if _maks else None
except ValueError:
    sys.exit("MAKS_DOKUMEN harus berupa bilangan bulat.")

if MAKS_DOKUMEN is not None and MAKS_DOKUMEN < 1:
    sys.exit("MAKS_DOKUMEN harus lebih besar dari 0.")

MODEL_EMBEDDING = "gemini-embedding-001"
EMBEDDING_MODEL_NAME = os.environ.get(
    "EMBEDDING_MODEL_NAME", MODEL_EMBEDDING
).strip()

try:
    EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIMENSION", "768"))
except ValueError:
    sys.exit("EMBEDDING_DIMENSION harus berupa angka.")

if EMBEDDING_MODEL_NAME != MODEL_EMBEDDING:
    sys.exit(f"Model embedding harus {MODEL_EMBEDDING}, bukan {EMBEDDING_MODEL_NAME}.")
if EMBEDDING_DIM != 768:
    sys.exit("EMBEDDING_DIMENSION harus 768 agar sesuai database dan website AIRA.")

# Chunking
CHUNK_SIZE = 1500
CHUNK_OVERLAP = 250

# OCR
OCR_BAHASA = "ind+eng"
OCR_DPI = 300
MIN_KARAKTER_TEKS = 30

# Embedding: batch kecil untuk mengurangi risiko 429/quota.
BATCH_EMBEDDING = 10
MAX_RETRY_EMBEDDING = 5
JEDA_ANTAR_BATCH = 8
MAX_JEDA_RETRY = 120

# Database
BATCH_DATABASE = 50
MAX_RETRY_DATABASE = 3

# PENGAMAN MIGRASI: jangan ubah menjadi True selama migrasi.
HAPUS_CHUNK_VERSI_LAMA = False


# =========================================================
# 2. INISIALISASI CLIENT
# =========================================================

print("=" * 65)
print("AIRA DOCUMENT INGESTION")
print("=" * 65)
print("Menghubungkan ke Supabase...")

try:
    supabase = create_client(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
except Exception as e:
    sys.exit(f"Gagal membuat koneksi Supabase: {e}")

print(f"Menyiapkan Gemini embedding: {EMBEDDING_MODEL_NAME}")
try:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    sys.exit(f"Gagal membuat client Gemini: {e}")


def normalisasi(vector):
    """Normalisasi L2 untuk embedding."""
    nilai_vector = [float(nilai) for nilai in vector]
    if not nilai_vector:
        raise ValueError("Embedding kosong.")
    if not all(math.isfinite(nilai) for nilai in nilai_vector):
        raise ValueError("Embedding mengandung nilai tidak valid.")

    norma = math.sqrt(sum(nilai * nilai for nilai in nilai_vector))
    if not math.isfinite(norma) or norma == 0:
        raise ValueError("Embedding tidak dapat dinormalisasi.")
    return [nilai / norma for nilai in nilai_vector]


def ambil_jeda_retry(error, percobaan):
    """Mengambil jeda dari pesan Google atau memakai exponential backoff."""
    pesan = str(error)

    pola_json = re.search(
        r"retryDelay['\"]?\s*:\s*['\"](\d+(?:\.\d+)?)s",
        pesan,
        re.IGNORECASE,
    )
    pola_teks = re.search(
        r"Please retry in\s+(\d+(?:\.\d+)?)s",
        pesan,
        re.IGNORECASE,
    )
    match = pola_json or pola_teks

    if match:
        # Jangan menunggu tanpa batas jika pesan API berisi jeda sangat panjang.
        return min(float(match.group(1)) + 3, MAX_JEDA_RETRY)

    # 10, 20, 40, 60 detik; maksimum tetap dibatasi.
    return min(10 * (2 ** percobaan), 60, MAX_JEDA_RETRY)


def error_bisa_dicoba_ulang(error):
    """Retry hanya untuk error sementara: quota, rate limit, jaringan, dan 5xx."""
    pesan = str(error).lower()

    kode = getattr(error, "code", None)
    status_code = getattr(error, "status_code", None)
    response = getattr(error, "response", None)
    if status_code is None and response is not None:
        status_code = getattr(response, "status_code", None)

    kode_teks = str(kode or status_code or "").lower()
    gabungan = f"{kode_teks} {pesan}"

    # Kuota harian yang habis tidak akan pulih dengan retry beberapa detik.
    # Hentikan proses dokumen saat itu agar tidak membuang waktu dan request.
    if "per day limit exceeded" in gabungan or "daily limit exceeded" in gabungan:
        return False

    penanda_retry = (
        "429", "resource_exhausted", "resource exhausted", "rate limit",
        "quota", "500", "502", "503", "504", "internal server",
        "unavailable", "deadline exceeded", "timeout", "timed out",
        "connection reset", "connection error", "temporarily unavailable",
    )
    return any(penanda in gabungan for penanda in penanda_retry)


def embed_batch(teks_list):
    """Membuat embedding RETRIEVAL_DOCUMENT dengan retry terkontrol."""
    if not teks_list:
        return []

    for percobaan in range(MAX_RETRY_EMBEDDING):
        nomor_percobaan = percobaan + 1
        print(
            f"[GEMINI] Mengirim {len(teks_list)} teks "
            f"(percobaan {nomor_percobaan}/{MAX_RETRY_EMBEDDING})..."
        )

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
                    "Jumlah embedding dari Gemini tidak sesuai jumlah teks."
                )

            embeddings = []
            for idx, item in enumerate(hasil):
                vector = normalisasi(list(item.values))
                if len(vector) != EMBEDDING_DIM:
                    raise ValueError(
                        f"Embedding ke-{idx} memiliki {len(vector)} dimensi; "
                        f"seharusnya {EMBEDDING_DIM}."
                    )
                embeddings.append(vector)

            print(f"[GEMINI] Berhasil membuat {len(embeddings)} embedding.")
            return embeddings

        except Exception as e:
            # Error konfigurasi/izin/format tidak akan membaik dengan retry.
            if not error_bisa_dicoba_ulang(e):
                raise RuntimeError(
                    f"Gemini mengembalikan error yang tidak dapat di-retry: {e}"
                ) from e

            if nomor_percobaan >= MAX_RETRY_EMBEDDING:
                raise RuntimeError(
                    f"Gemini gagal setelah {MAX_RETRY_EMBEDDING} percobaan: {e}"
                ) from e

            jeda = ambil_jeda_retry(e, percobaan)
            print(
                f"[GEMINI] Error sementara pada percobaan "
                f"{nomor_percobaan}/{MAX_RETRY_EMBEDDING}: {str(e)[:300]}"
            )
            print(
                f"[GEMINI] Mencoba kembali dalam {jeda:.1f} detik. "
                "Jika quota harian habis, percobaan ulang tetap dapat gagal."
            )
            time.sleep(jeda)

    raise RuntimeError("Proses embedding berhenti tanpa hasil.")


# Tidak mengirim tes embedding saat startup.
# Request pertama ke Gemini baru dilakukan jika memang ada chunk yang perlu dimigrasikan.
print(f"Gemini client siap: {EMBEDDING_MODEL_NAME}, {EMBEDDING_DIM} dimensi.")


# =========================================================
# 3. PERSIAPAN OCR
# =========================================================

def siapkan_ocr():
    """Memastikan Tesseract dan bahasa OCR tersedia."""
    try:
        tersedia = set(pytesseract.get_languages(config=""))
    except Exception as e:
        print(f"Tesseract tidak ditemukan: {e}. OCR dinonaktifkan.")
        return False

    kurang = [bahasa for bahasa in OCR_BAHASA.split("+") if bahasa not in tersedia]
    if kurang:
        print(f"Paket bahasa OCR belum tersedia: {kurang}. OCR dinonaktifkan.")
        return False

    print("Tesseract OCR siap: Indonesia + Inggris.")
    return True


OCR_SIAP = siapkan_ocr()


# =========================================================
# 4. DOCUMENT REGISTRY DAN PEMERIKSAAN MODEL
# =========================================================

def muat_registry():
    print("Mengambil document registry dari Supabase...")
    response = (
        supabase.table("document_registry")
        .select("*")
        .order("title")
        .execute()
    )
    return response.data or []


def ambil_chunk_eksisting(document_id, checksum):
    """Ambil chunk pada versi/checksum tertentu dari Supabase."""
    if not document_id or not checksum:
        return []

    response = (
        supabase.table("document_chunks")
        .select("chunk_index,content,embedding_model,embedding")
        .eq("document_id", document_id)
        .eq("checksum_sha256", checksum)
        .execute()
    )
    return response.data or []


def embedding_gemini_valid(row):
    """Memastikan chunk benar-benar memiliki embedding Gemini 768 dimensi."""
    if row.get("embedding_model") != EMBEDDING_MODEL_NAME:
        return False
    vector = row.get("embedding")
    if not isinstance(vector, list) or len(vector) != EMBEDDING_DIM:
        return False
    try:
        return all(math.isfinite(float(value)) for value in vector)
    except (TypeError, ValueError):
        return False


def dokumen_sudah_gemini(doc):
    """True jika seluruh chunk versi aktif sudah ber-embedding Gemini."""
    document_id = doc.get("document_id")
    checksum = doc.get("last_successful_checksum") or doc.get("checksum_sha256")
    if not document_id or not checksum:
        return False

    rows = ambil_chunk_eksisting(document_id, checksum)
    if not rows:
        return False

    indeks = sorted(
        row.get("chunk_index") for row in rows
        if isinstance(row.get("chunk_index"), int)
    )
    if len(indeks) != len(rows) or indeks != list(range(len(indeks))):
        return False

    return all(embedding_gemini_valid(row) for row in rows)


# =========================================================
# 5. GOOGLE DRIVE DOWNLOAD
# =========================================================

def dapatkan_drive_id(doc):
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
    file_id = dapatkan_drive_id(doc)
    if not file_id:
        raise ValueError("drive_file_id dan drive_url kosong atau tidak valid.")

    tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
    tmp_path = tmp.name
    tmp.close()

    try:
        print(f"[DOWNLOAD] Mengunduh PDF dari Google Drive (file ID: {file_id})...")
        hasil = gdown.download(
            f"https://drive.google.com/uc?id={file_id}",
            tmp_path,
            quiet=True,
        )
        if hasil is None or not os.path.exists(tmp_path) or os.path.getsize(tmp_path) == 0:
            raise RuntimeError(
                f"Gagal mengunduh file Drive {file_id}. Periksa izin akses file."
            )

        with open(tmp_path, "rb") as file:
            signature = file.read(5)
        if signature != b"%PDF-":
            raise RuntimeError(
                f"File Drive {file_id} bukan PDF atau yang terunduh adalah halaman login."
            )
        print(f"[DOWNLOAD] PDF berhasil diunduh ({os.path.getsize(tmp_path):,} byte).")
        return tmp_path
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


# =========================================================
# 6. EKSTRAKSI PDF DAN OCR
# =========================================================

def ocr_halaman(page):
    pix = page.get_pixmap(dpi=OCR_DPI, alpha=False)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("L")
    return pytesseract.image_to_string(img, lang=OCR_BAHASA).strip()


def extract_pdf_pages(pdf_path, doc):
    raw_pages = []
    jumlah_ocr = 0
    waktu = datetime.now(timezone.utc).isoformat()

    with pymupdf.open(pdf_path) as pdf:
        print(f"Mengekstrak {len(pdf)} halaman PDF...")
        total_halaman = len(pdf)
        for page_num, page in enumerate(pdf, start=1):
            if page_num == 1 or page_num % 10 == 0 or page_num == total_halaman:
                print(f"[PDF] Membaca halaman {page_num}/{total_halaman}...")
            text = page.get_text("text").strip()

            if OCR_SIAP and len(text) < MIN_KARAKTER_TEKS:
                try:
                    hasil_ocr = ocr_halaman(page)
                except Exception as e:
                    print(f"OCR gagal di halaman {page_num}: {e}")
                    hasil_ocr = ""
                if len(hasil_ocr) > len(text):
                    text = hasil_ocr
                    jumlah_ocr += 1

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

    print(f"OCR digunakan pada {jumlah_ocr} halaman.")
    print(f"{len(raw_pages)} halaman berhasil diekstrak.")
    return raw_pages


# =========================================================
# 7. CHUNKING
# =========================================================

def chunk_text(text):
    text = " ".join(text.split())
    chunks = []
    start = 0

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
    chunks = []
    idx = 0

    for page in raw_pages:
        info = {key: value for key, value in page.items() if key != "text"}
        for part in chunk_text(page["text"]):
            chunks.append({
                **info,
                "chunk_index": idx,
                "content": part,
            })
            idx += 1

    print(f"Total chunk dibuat: {len(chunks)}")
    return chunks


# =========================================================
# 8. GENERATE EMBEDDING
# =========================================================

def generate_embeddings(chunks):
    if not chunks:
        return []

    print(f"[EMBEDDING] Membuat embedding menggunakan {EMBEDDING_MODEL_NAME}...")
    print(f"[EMBEDDING] Total chunk: {len(chunks)} | batch: {BATCH_EMBEDDING}")
    contents = [chunk["content"] for chunk in chunks]
    embeddings = []

    for start in range(0, len(contents), BATCH_EMBEDDING):
        batch_teks = contents[start:start + BATCH_EMBEDDING]
        batch_embeddings = embed_batch(batch_teks)
        embeddings.extend(batch_embeddings)

        selesai = min(start + BATCH_EMBEDDING, len(contents))
        print(f"[EMBEDDING] Progres: {selesai}/{len(contents)} chunk selesai.")

        if selesai < len(contents):
            time.sleep(JEDA_ANTAR_BATCH)

    if len(embeddings) != len(chunks):
        raise ValueError("Jumlah embedding tidak sama dengan jumlah chunk.")
    for idx, embedding in enumerate(embeddings):
        if len(embedding) != EMBEDDING_DIM:
            raise ValueError(f"Dimensi embedding chunk {idx} tidak sesuai.")

    print(f"{len(embeddings)} embedding berhasil dibuat.")
    return embeddings


# =========================================================
# 9. CHECKSUM FILE
# =========================================================

def calculate_file_checksum(path):
    sha = hashlib.sha256()
    with open(path, "rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            sha.update(block)
    return sha.hexdigest()


# =========================================================
# 10. MENYIMPAN CHUNK KE SUPABASE
# =========================================================

def _simpan_batch(batch, percobaan=MAX_RETRY_DATABASE):
    for i in range(percobaan):
        try:
            (
                supabase.table("document_chunks")
                .upsert(
                    batch,
                    on_conflict="document_id,checksum_sha256,chunk_index",
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
    if len(chunks) != len(embeddings):
        raise ValueError("Jumlah chunk dan embedding tidak sama.")

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
                    "filename", "title", "publisher", "category",
                    "drive_url", "ingested_at",
                )
            },
            "checksum_sha256": checksum,
            "embedding": embedding,
            "embedding_model": EMBEDDING_MODEL_NAME,
        })

    total = len(rows)
    for start in range(0, total, BATCH_DATABASE):
        batch = rows[start:start + BATCH_DATABASE]
        print(f"[SUPABASE] Menyimpan batch chunk {start + 1}-{min(start + BATCH_DATABASE, total)} dari {total}...")
        _simpan_batch(batch)
        selesai = min(start + BATCH_DATABASE, total)
        print(f"[SUPABASE] Chunk tersimpan: {selesai}/{total}.")

    return total


# =========================================================
# 11. UPDATE STATUS DOCUMENT REGISTRY
# =========================================================

def update_status(document_id, checksum=None, status="completed", error=None):
    now = datetime.now(timezone.utc).isoformat()
    data = {
        "processing_status": status,
        "error_message": error,
        "updated_at": now,
    }

    if status == "completed":
        if not checksum:
            raise ValueError("Checksum wajib tersedia untuk status completed.")
        data.update({
            "checksum_sha256": checksum,
            "last_successful_checksum": checksum,
            "last_processed_at": now,
        })

    (
        supabase.table("document_registry")
        .update(data)
        .eq("document_id", document_id)
        .execute()
    )


def update_status_gagal(doc, error):
    """Pertahankan status/checksum lama jika dokumen sebelumnya sudah aktif."""
    document_id = doc["document_id"]
    now = datetime.now(timezone.utc).isoformat()

    sebelumnya_sudah_berhasil = (
        doc.get("processing_status") == "completed"
        and bool(doc.get("last_successful_checksum"))
    )

    if sebelumnya_sudah_berhasil:
        data = {
            "error_message": error[:1000],
            "updated_at": now,
        }
        print("Versi dokumen sebelumnya tetap dipertahankan.")
    else:
        data = {
            "processing_status": "failed",
            "error_message": error[:1000],
            "updated_at": now,
        }

    (
        supabase.table("document_registry")
        .update(data)
        .eq("document_id", document_id)
        .execute()
    )


# =========================================================
# 12. PROSES SATU DOKUMEN (TANPA MENGHAPUS CHUNK LAMA)
# =========================================================

KUOTA_HARIAN_HABIS = False


def process_document(doc):
    global KUOTA_HARIAN_HABIS
    document_id = doc.get("document_id")
    if not document_id:
        print("Dokumen tidak memiliki document_id.")
        return "failed"

    title = doc.get("title") or str(document_id)
    pdf_path = None

    try:
        print("\n" + "-" * 65)
        print(f"Memproses: {title}")
        print("-" * 65)

        # 1. Download PDF
        print("[TAHAP 1/7] Download PDF...")
        pdf_path = download_from_drive(doc)

        # 2. Checksum PDF
        print("[TAHAP 2/7] Menghitung checksum...")
        checksum = calculate_file_checksum(pdf_path)
        print(f"Checksum dokumen: {checksum}")

        # 3. Ekstraksi
        print("[TAHAP 3/7] Ekstraksi teks dan OCR...")
        raw_pages = extract_pdf_pages(pdf_path, doc)
        if not raw_pages:
            raise ValueError("Tidak ada teks yang berhasil diekstrak, termasuk setelah OCR.")

        # 4. Chunking
        print("[TAHAP 4/7] Membagi teks menjadi chunk...")
        chunks = create_chunks(raw_pages)
        if not chunks:
            raise ValueError("Tidak ada chunk yang berhasil dibuat.")

        # 5. Periksa chunk yang sudah ada pada checksum yang sama.
        #    Chunk Gemini yang valid dipertahankan; hanya chunk null/non-Gemini
        #    yang dibuat ulang. Ini menghemat kuota selama migrasi model.
        print("[TAHAP 5/7] Memeriksa embedding yang sudah tersimpan...")
        rows_lama = ambil_chunk_eksisting(document_id, checksum)
        lama_per_indeks = {
            row.get("chunk_index"): row
            for row in rows_lama
            if isinstance(row.get("chunk_index"), int)
        }

        chunks_perlu_embedding = []
        jumlah_dipertahankan = 0
        for chunk in chunks:
            row_lama = lama_per_indeks.get(chunk["chunk_index"])
            if (
                row_lama
                and row_lama.get("content") == chunk["content"]
                and embedding_gemini_valid(row_lama)
            ):
                jumlah_dipertahankan += 1
            else:
                chunks_perlu_embedding.append(chunk)

        print(f"[MIGRASI] Chunk Gemini valid dipertahankan: {jumlah_dipertahankan}")
        print(f"[MIGRASI] Chunk yang perlu dibuat ulang: {len(chunks_perlu_embedding)}")

        # 6. Embed dan simpan hanya chunk yang belum menggunakan Gemini.
        print("[TAHAP 6/7] Membuat embedding Gemini dan menyimpan chunk...")
        if chunks_perlu_embedding:
            embeddings_baru = generate_embeddings(chunks_perlu_embedding)
            if len(embeddings_baru) != len(chunks_perlu_embedding):
                raise ValueError("Jumlah embedding tidak sama dengan chunk yang dimigrasikan.")
            jumlah_disimpan = save_chunks(
                doc, chunks_perlu_embedding, embeddings_baru, checksum
            )
            if jumlah_disimpan != len(chunks_perlu_embedding):
                raise ValueError("Jumlah chunk yang disimpan tidak sesuai.")
        else:
            jumlah_disimpan = 0
            print("Semua chunk sudah memiliki embedding Gemini yang valid.")

        # Pastikan tidak ada chunk yang tertinggal sebelum checksum diaktifkan.
        rows_setelah = ambil_chunk_eksisting(document_id, checksum)
        peta_setelah = {
            row.get("chunk_index"): row
            for row in rows_setelah
            if isinstance(row.get("chunk_index"), int)
        }
        if len(peta_setelah) != len(chunks):
            raise ValueError(
                f"Jumlah chunk di Supabase ({len(peta_setelah)}) tidak sama "
                f"dengan hasil ekstraksi ({len(chunks)})."
            )
        for chunk in chunks:
            row = peta_setelah.get(chunk["chunk_index"])
            if not row or row.get("content") != chunk["content"]:
                raise ValueError(f"Konten chunk {chunk['chunk_index']} belum tersimpan sesuai.")
            if not embedding_gemini_valid(row):
                raise ValueError(f"Embedding chunk {chunk['chunk_index']} belum valid Gemini.")

        jumlah = len(chunks)

        # 7. Aktifkan checksum hanya setelah seluruh chunk terverifikasi.
        print("[TAHAP 7/7] Mengaktifkan checksum dan status completed...")
        update_status(
            document_id=document_id,
            checksum=checksum,
            status="completed",
        )

        # PENTING: Tidak ada DELETE / pembersihan chunk lama di sini.
        print("Chunk versi lama tidak dihapus.")
        print(f"Selesai: {len(raw_pages)} halaman, {jumlah} chunk tervalidasi.")
        print(f"Chunk Gemini baru/disimpan ulang: {jumlah_disimpan}")
        print(f"Chunk Gemini lama dipertahankan: {jumlah_dipertahankan}")
        print(f"Model embedding: {EMBEDDING_MODEL_NAME}")
        return "completed"

    except Exception as e:
        if "per day limit exceeded" in str(e).lower() or "daily limit exceeded" in str(e).lower():
            KUOTA_HARIAN_HABIS = True
        print(f"Gagal memproses {title}: {e}")
        try:
            update_status_gagal(doc, str(e))
        except Exception as status_error:
            print(f"Gagal memperbarui status dokumen: {status_error}")
        return "failed"

    finally:
        if pdf_path and os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except OSError as e:
                print(f"File sementara gagal dihapus: {e}")


# =========================================================
# 13. MAIN
# =========================================================

def main():
    waktu_mulai = time.monotonic()
    print("\nMemulai proses ingestion AIRA...\n")
    docs = muat_registry()

    if not docs:
        print("Tidak ada dokumen di document_registry.")
        return

    print("\nMemeriksa status embedding setiap dokumen...")
    antrean = []
    jumlah_dilewati = 0

    for doc in docs:
        title = doc.get("title") or doc.get("document_id")

        if FORCE_REPROCESS:
            print(f"[FORCE] {title} - dimasukkan ke antrean.")
            antrean.append(doc)
            continue

        try:
            sudah_gemini = dokumen_sudah_gemini(doc)
        except Exception as e:
            # Jangan diam-diam melewati dokumen jika pemeriksaan database gagal.
            raise RuntimeError(
                f"Gagal memeriksa status embedding dokumen {title}: {e}"
            ) from e

        if sudah_gemini:
            print(f"[SKIP] {title} - embedding Gemini sudah lengkap.")
            jumlah_dilewati += 1
        else:
            print(f"[PROSES] {title} - embedding Gemini belum lengkap.")
            antrean.append(doc)

    if MAKS_DOKUMEN is not None:
        antrean = antrean[:MAKS_DOKUMEN]

    print("\nINFORMASI INGESTION")
    print("-" * 45)
    print(f"Total registry       : {len(docs)}")
    print(f"Dokumen dilewati     : {jumlah_dilewati}")
    print(f"Dokumen antrean      : {len(antrean)}")
    print(f"Force reprocess      : {FORCE_REPROCESS}")
    print(f"Batas dokumen        : {MAKS_DOKUMEN or 'Semua'}")
    print(f"OCR tersedia         : {OCR_SIAP}")
    print(f"Model embedding      : {EMBEDDING_MODEL_NAME}")
    print(f"Dimensi embedding    : {EMBEDDING_DIM}")
    print("Task type            : RETRIEVAL_DOCUMENT")
    print(f"Hapus chunk lama     : {HAPUS_CHUNK_VERSI_LAMA}")
    print("-" * 45)

    if not antrean:
        print("Tidak ada dokumen yang perlu diproses.")
        return

    ringkasan = Counter()
    for index, doc in enumerate(antrean, start=1):
        print(f"\nPROGRES DOKUMEN {index}/{len(antrean)}")
        hasil = process_document(doc)
        ringkasan[hasil] += 1
        if KUOTA_HARIAN_HABIS:
            print("Kuota Gemini harian habis; menghentikan antrean agar tidak mengulang request.")
            break

    print("\n" + "=" * 65)
    print("RINGKASAN INGESTION")
    print("=" * 65)
    print(f"Berhasil dilewati : {jumlah_dilewati}")
    print(f"Berhasil diproses : {ringkasan.get('completed', 0)}")
    print(f"Gagal             : {ringkasan.get('failed', 0)}")
    print(f"Model    : {EMBEDDING_MODEL_NAME}")

    if ringkasan.get("failed", 0) > 0:
        durasi = time.monotonic() - waktu_mulai
        print(f"\nDurasi total: {durasi / 60:.1f} menit.")
        print("Ingestion selesai dengan beberapa kegagalan.")
        sys.exit(1)

    durasi = time.monotonic() - waktu_mulai
    print(f"\nDurasi total: {durasi / 60:.1f} menit.")
    print("Seluruh dokumen dalam antrean berhasil diproses.")


if __name__ == "__main__":
    main()
