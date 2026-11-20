
import Link from "next/link";
import {
  BookOpen,
  Code2,
  ExternalLink,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import SwaggerDocs from "@/components/docs/SwaggerDocs";

export const metadata = {
  title: "Dokumentasi API | AIRA",
  description:
    "Dokumentasi REST API AIRA untuk kalkulator ketahanan air, Navigasi Air, kontribusi titik air, AIRA Assistant, dan administrasi.",
};

const documentationFeatures = [
  {
    icon: Code2,
    title: "API Explorer",
    description:
      "Pelajari endpoint, parameter, request body, dan response API.",
  },
  {
    icon: LockKeyhole,
    title: "Autentikasi",
    description:
      "Endpoint privat menggunakan sesi login Supabase yang dikelola aplikasi.",
  },
  {
    icon: ShieldCheck,
    title: "Akses dan keamanan",
    description:
      "Endpoint dengan hak akses tertentu hanya dapat digunakan oleh pengguna yang berwenang.",
  },
];

const usageSteps = [
  "Pilih kelompok API berdasarkan fitur yang ingin digunakan.",
  "Buka endpoint untuk melihat method, parameter, dan struktur request.",
  "Periksa contoh response serta kemungkinan status code.",
  "Gunakan tombol Try it out untuk menguji endpoint.",
  "Untuk endpoint privat, login terlebih dahulu pada aplikasi AIRA di origin yang sama.",
];

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-aira-bg px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Breadcrumb dan navigasi */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm text-aira-text/60"
        >
          <Link
            href="/"
            className="transition hover:text-aira-primary"
          >
            Beranda
          </Link>

          <span aria-hidden="true">/</span>

          <span className="font-medium text-aira-primary">
            Dokumentasi API
          </span>
        </nav>

        {/* Header halaman */}
        <header className="overflow-hidden rounded-2xl border border-aira-primary/10 bg-white shadow-sm">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center rounded-full bg-aira-primary/10 px-3 py-1 text-xs font-semibold text-aira-primary">
                  Developer Documentation
                </span>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-aira-primary sm:text-4xl">
                  Dokumentasi API AIRA
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-aira-text/75 sm:text-base">
                  Dokumentasi REST API AIRA yang menyediakan akses
                  terstruktur ke berbagai layanan, termasuk kalkulator
                  ketahanan air, Navigasi Air, kontribusi titik air,
                  AIRA Assistant, profil pengguna, dan administrasi.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="#api-explorer"
                    className="inline-flex items-center justify-center rounded-lg bg-aira-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Jelajahi API
                  </a>

                  <a
                    href="/api/openapi"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-aira-primary/30 px-5 py-3 text-sm font-semibold text-aira-primary transition hover:bg-aira-primary/5"
                  >
                    OpenAPI JSON
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>

              <div className="hidden shrink-0 items-center justify-center rounded-2xl bg-aira-primary/5 p-8 lg:flex">
                <BookOpen
                  size={76}
                  strokeWidth={1.4}
                  className="text-aira-primary"
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>

          <div className="h-1.5 w-full bg-aira-primary" />
        </header>

        {/* Ringkasan dokumentasi */}
        <section
          aria-label="Informasi dokumentasi"
          className="grid gap-4 md:grid-cols-3"
        >
          {documentationFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-xl border border-aira-primary/10 bg-white p-5 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-aira-primary/10 text-aira-primary">
                  <Icon size={21} aria-hidden="true" />
                </div>

                <h2 className="mt-4 font-bold text-aira-text">
                  {feature.title}
                </h2>

                <p className="mt-2 text-sm leading-6 text-aira-text/70">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </section>

        {/* Panduan penggunaan */}
        <section className="rounded-xl border border-aira-primary/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold text-aira-primary">
            Panduan menggunakan API Explorer
          </h2>

          <p className="mt-2 text-sm leading-6 text-aira-text/70">
            Ikuti langkah berikut untuk memahami dan mencoba
            endpoint yang tersedia.
          </p>

          <ol className="mt-5 space-y-3">
            {usageSteps.map((step, index) => (
              <li
                key={step}
                className="flex items-start gap-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aira-primary/10 text-xs font-bold text-aira-primary">
                  {index + 1}
                </span>

                <p className="pt-1 text-sm leading-6 text-aira-text/80">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Informasi autentikasi */}
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <LockKeyhole
              size={22}
              className="mt-0.5 shrink-0 text-amber-700"
              aria-hidden="true"
            />

            <div>
              <h2 className="font-bold text-amber-900">
                Informasi autentikasi dan akses API
              </h2>

              <div className="mt-2 space-y-2 text-sm leading-6 text-amber-900/80">
                <p>
                  Beberapa endpoint AIRA dapat diakses secara publik,
                  sedangkan endpoint lainnya membutuhkan sesi login.
                  Endpoint administrasi hanya dapat digunakan oleh
                  akun admin yang memiliki akses aktif.
                </p>

                <p>
                  Untuk mencoba endpoint privat melalui API Explorer,
                  buka aplikasi AIRA pada origin yang sama dan login
                  terlebih dahulu. Swagger UI menggunakan cookie sesi
                  yang tersedia di browser.
                </p>

                <p>
                  Jangan membagikan cookie sesi, token autentikasi,
                  atau informasi rahasia akun kepada pihak lain.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* API Explorer */}
        <section
          id="api-explorer"
          className="scroll-mt-8 space-y-4"
        >
          <div>
            <h2 className="text-2xl font-bold text-aira-primary">
              API Explorer
            </h2>

            <p className="mt-2 text-sm leading-6 text-aira-text/70">
              Daftar endpoint yang didokumentasikan melalui
              spesifikasi OpenAPI AIRA.
            </p>
          </div>

          <div className="rounded-2xl border border-aira-primary/10 bg-white p-3 shadow-sm sm:p-5">
            <SwaggerDocs />
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-aira-primary/10 pt-6 text-center">
          <p className="text-xs leading-6 text-aira-text/60">
            AIRA — Air, Sanitasi, dan Ketahanan Iklim.
            Dokumentasi ini mengikuti spesifikasi OpenAPI
            yang disediakan oleh aplikasi AIRA.
          </p>

          <p className="mt-1 text-xs text-aira-text/50">
            Gunakan API sesuai hak akses dan ketentuan keamanan aplikasi.
          </p>
        </footer>
      </div>
    </main>
  );
}
