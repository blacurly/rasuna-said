from google import genai
from .config import settings
from .retriever import retrieve_context
RAG_HINTS=("menurut dokumen","berdasarkan panduan","sumber resmi","aturan","pedoman","sanitasi",
           "mhm","menstruasi","kekeringan","kualitas air","air minum","referensi","rujukan","standar","prosedur")
def needs_rag(question):
    q=question.lower()
    return any(term in q for term in RAG_HINTS)
def answer_question(question,calculator_result=None):
    c=settings()
    if not c["gemini_key"]: raise RuntimeError("GEMINI_API_KEY belum diisi.")
    use_rag=needs_rag(question)
    chunks=retrieve_context(question) if use_rag else []
    context="\n\n---\n\n".join(
      "Sumber: {} | Penerbit: {} | Halaman: {}-{}\n{}".format(
        x.get("title"),x.get("publisher") or "Tidak tercantum",x.get("page_start") or "?",
        x.get("page_end") or "?",x.get("content")) for x in chunks) or "Tidak ada konteks dokumen yang diambil."
    calc="\nHasil kalkulator AIRA (jangan dihitung ulang/diubah): "+str(calculator_result) if calculator_result is not None else ""
    prompt=(
      "Anda adalah AIRA Assistant tentang air, sanitasi, dan ketahanan iklim. Jawab dalam Bahasa Indonesia. "
      "Jangan mengarang sumber, halaman, titik air, jam operasional, atau ketersediaan air. "
      "Jika konteks tidak cukup, sampaikan keterbatasan. Jangan menghitung ulang atau mengubah hasil kalkulator. "
      "Jangan menyatakan jawaban sebagai pengujian kualitas air. Jika menggunakan konteks, sebutkan sumber yang tersedia.\n"
      "Pertanyaan: "+question+"\nKonteks dokumen:\n"+context+calc
    )
    response=genai.Client(api_key=c["gemini_key"]).models.generate_content(model=c["gemini_model"],contents=prompt)
    return {"answer":getattr(response,"text","") or "","used_rag":use_rag,
      "sources":[{k:x.get(k) for k in ("document_id","title","publisher","page_start","page_end","similarity")} for x in chunks]}
