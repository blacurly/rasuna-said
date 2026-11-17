
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSiteUrl(requestUrl) {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    return "https://aira-for-every-woman.vercel.app";
  }

  return new URL(requestUrl).origin;
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const siteUrl = getSiteUrl(request.url);

  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");

  // Hanya izinkan tujuan internal berupa path.
  const safeNext =
    requestedNext &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/masuk?verified=1";

  console.log("[AUTH CALLBACK] Callback diakses");
  console.log("[AUTH CALLBACK] Code tersedia:", Boolean(code));
  console.log("[AUTH CALLBACK] Tujuan:", safeNext);

  if (!code) {
    console.error("[AUTH CALLBACK] Kode tidak ditemukan");

    return NextResponse.redirect(
      new URL("/masuk?error=invalid-link", siteUrl)
    );
  }

  const supabase = await createClient();

  const {
    data,
    error: exchangeError,
  } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      "[AUTH CALLBACK] Exchange gagal:",
      exchangeError.message
    );

    return NextResponse.redirect(
      new URL("/masuk?error=verification-failed", siteUrl)
    );
  }

  console.log("[AUTH CALLBACK] Exchange berhasil");
  console.log(
    "[AUTH CALLBACK] User ditemukan:",
    Boolean(data?.user)
  );

  return NextResponse.redirect(
    new URL(safeNext, siteUrl)
  );
}
