import { kirimPesanAssistant } from "@/app/actions/assistant";
import { apiSuccess, apiError, readJson, handleApiError } from "@/lib/api/response";

export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 45_000;
const MAX_HISTORY_ITEMS = 6;
const MAX_HISTORY_CONTENT = 1500;

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

  if (body.history !== undefined && !Array.isArray(body.history)) {
    return apiError("Riwayat percakapan harus berupa array.", { status: 422, code: "INVALID_HISTORY" });
  }

  const history = body.history ?? [];
  if (history.length > MAX_HISTORY_ITEMS) {
    return apiError(`Riwayat percakapan maksimal ${MAX_HISTORY_ITEMS} pesan.`, {
      status: 422,
      code: "INVALID_HISTORY",
    });
  }

  for (const [index, item] of history.entries()) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      !["user", "assistant"].includes(item.role) ||
      typeof item.content !== "string" ||
      !item.content.trim() ||
      item.content.length > MAX_HISTORY_CONTENT
    ) {
      return apiError(`Format pesan riwayat ke-${index + 1} tidak valid.`, {
        status: 422,
        code: "INVALID_HISTORY",
        details: { index, allowedRoles: ["user", "assistant"], maxContentLength: MAX_HISTORY_CONTENT },
      });
    }
  }

  let timeoutId;
  try {
    const timeout = new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve({ timedOut: true }), REQUEST_TIMEOUT_MS);
    });

    const result = await Promise.race([
      kirimPesanAssistant({ question: body.question.trim(), history }),
      timeout,
    ]);

    if (result?.timedOut) {
      return apiError("AIRA Assistant membutuhkan waktu lebih lama dari batas permintaan. Silakan coba kembali.", {
        status: 504,
        code: "ASSISTANT_TIMEOUT",
      });
    }

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
  } catch (error) {
    return handleApiError(error, "AIRA Assistant gagal memproses pertanyaan.");
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
