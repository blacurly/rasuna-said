
import os
import time
import requests
from dotenv import load_dotenv

load_dotenv(".env.local")

key = os.getenv("EMBEDDING_API_KEY")

if not key:
    raise RuntimeError("EMBEDDING_API_KEY tidak ditemukan.")

url = "http://127.0.0.1:8000/embed"

print("Mengirim permintaan embedding...")
start = time.time()

try:
    response = requests.post(
        url,
        headers={"Authorization": f"Bearer {key}"},
        json={
            "text": "Bagaimana cara menghemat air bersih untuk kebutuhan rumah tangga?"
        },
        timeout=(10, 300)
    )

    print("HTTP:", response.status_code)
    response.raise_for_status()

    data = response.json()
    embedding = data["embedding"]

    norm = sum(value * value for value in embedding) ** 0.5

    print("Dimension:", data["dimension"])
    print("Vector length:", len(embedding))
    print("Norm:", norm)
    print("Waktu proses:", round(time.time() - start, 2), "detik")
    print("Pengujian embedding berhasil.")

except requests.exceptions.Timeout:
    print("ERROR: API masih membutuhkan waktu terlalu lama.")

except requests.exceptions.ConnectionError:
    print("ERROR: Tidak dapat terhubung ke server embedding.")

except requests.exceptions.HTTPError as error:
    print("ERROR HTTP:", error)
    print("Respons server:", response.text)

except Exception as error:
    print("ERROR:", error)
