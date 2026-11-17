import { kirimPesanAssistant } from "@/app/actions/assistant";
import { apiSuccess, apiError, readJson, handleApiError } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(request) {
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError("Body JSON tidak valid.", { status: 400, code: "INVALID_JSON" });
  }

  if (typeof body.question !== "string" || !body.question.trim()) {
    return apiError("Pertanyaan tidak boleh kosong.", { status: 422, code: "VALIDATION_ERROR" });
  }

  if (body.question.trim().length > 2000) {
    return apiError("Pertanyaan maksimal 2.000 karakter.", { status: 422, code: "VALIDATION_ERROR" });
  }

  const result = await kirimPesanAssistant({
    question: body.question,
    history: Array.isArray(body.history) ? body.history : [],
  });

  if (!result?.ok) {
    return apiError(result?.error || "AIRA Assistant sedang mengalami gangguan.", {
      status: 502,
      code: "ASSISTANT_UNAVAILABLE",
    });
  }

  return apiSuccess({
    answer: result.answer,
    mode: result.mode,
    sources: result.sources || [],
    historySaved: Boolean(result.historySaved),
  }, { message: "Jawaban AIRA Assistant berhasil dibuat." });
}
