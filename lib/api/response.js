import { NextResponse } from "next/server";

export function apiSuccess(data, { status = 200, message = "Permintaan berhasil." } = {}) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function apiError(message, { status = 400, code = "BAD_REQUEST", details = null } = {}) {
  return NextResponse.json(
    { success: false, message, error: { code, details } },
    { status }
  );
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function getPagination(searchParams, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const rawLimit = Number(searchParams.get("limit") ?? defaultLimit);
  const rawOffset = Number(searchParams.get("offset") ?? 0);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), maxLimit) : defaultLimit;
  const offset = Number.isInteger(rawOffset) ? Math.max(rawOffset, 0) : 0;
  return { limit, offset };
}

export function handleApiError(error, fallback = "Terjadi kesalahan pada server.") {
  console.error("[AIRA API]", error);
  const status = Number(error?.status) || 500;
  const code = error?.code || (status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR");
  const message = status >= 500 ? fallback : (error?.message || fallback);
  return apiError(message, { status, code });
}
