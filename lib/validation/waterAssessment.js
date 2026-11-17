import { validasiInput } from "@/services/calculatorFormService";
import { isPlainObject } from "@/lib/validation/common";

export function validateWaterAssessmentPayload(payload) {
  if (!isPlainObject(payload)) {
    return { valid: false, errors: ["Body harus berupa objek JSON."] };
  }

  const result = validasiInput(payload);
  return {
    valid: result.valid,
    errors: result.daftar || [],
  };
}
